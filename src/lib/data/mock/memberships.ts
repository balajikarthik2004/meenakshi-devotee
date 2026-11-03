import type { Membership, MembershipTier } from '@/lib/data/types'
import { DEVOTEES } from './users'
import { SENIOR_MIN_AGE, ageOn } from '@/lib/membership'
import { addDays, chance, id, int, iso, rng, today } from './seed'

export interface TierSpec {
  tier: MembershipTier
  /** What the tier is called on screen — `titleCase` alone gives "Senior". */
  label: string
  price: number
  tagline: string
  perks: string[]
  facilityDiscountPct: number
  /** Minimum age on the day of enrolment. Absent means anyone may join. */
  minAge?: number
}

/**
 * Two memberships, not three tiers.
 *
 * The temple offers one membership and one concession on it. That is deliberately not
 * a ladder: the benefits are identical, because a devotee aged sixty-six is not
 * entitled to less of the temple than one aged forty — they simply pay less for it.
 * The only benefit that differs is reserved seating, which exists because standing
 * through a four-hour Chithirai utsavam is the actual problem, and because the senior
 * devotees' committee asked for it.
 *
 * `minAge` is the one eligibility rule in the app, and it is enforced in
 * `@/lib/membership` rather than by whichever screen happens to be asking.
 */
export const TIERS: TierSpec[] = [
  {
    tier: 'normal',
    label: 'Member',
    price: 251,
    tagline: 'For families who call this temple home',
    perks: [
      '10% off facility and hall bookings',
      'Two free Archanas each year',
      'Monthly newsletter and the festival calendar',
      'Named in the annual report',
      'Voting rights at the Annual General Meeting',
    ],
    facilityDiscountPct: 10,
  },
  {
    tier: 'senior',
    label: 'Senior Citizen',
    price: 108,
    tagline: `Concessional rate for devotees aged ${SENIOR_MIN_AGE} and over`,
    perks: [
      '10% off facility and hall bookings',
      'Two free Archanas each year',
      'Monthly newsletter and the festival calendar',
      'Named in the annual report',
      'Voting rights at the Annual General Meeting',
      'Reserved seating at every major festival',
    ],
    facilityDiscountPct: 10,
    minAge: SENIOR_MIN_AGE,
  },
]

export const TIER_BY_KEY = new Map(TIERS.map((t) => [t.tier, t]))

/**
 * Memberships across the first two-thirds of the devotee roll — with their history.
 *
 * Each devotee gets a *run of terms*, not a single row, and that is the point of this
 * seed rather than an embellishment. `Membership.startDate` is the current term's
 * start, so tenure can only be computed from the earliest term a person holds — and a
 * seed where everybody holds exactly one term makes "member since" indistinguishable
 * from "renewed on", which is precisely the bug the feature exists to avoid. With one
 * row each, the screen would have looked correct and been wrong for every member who
 * has ever renewed.
 *
 * So the roll is built to carry the cases the computation has to survive:
 *
 * - **Long-standing members.** A few go back eight to twelve years, which is what puts
 *   a milestone badge on screen and gives the tenure column something to sort by.
 * - **Two who lapsed and came back.** Their run is broken by more than the renewal
 *   grace, so `memberSince` and `continuousSince` genuinely differ — without them that
 *   distinction is untested and reads as over-engineering.
 * - **Ordinary renewers.** Most have two to four consecutive terms with the small gap a
 *   posted cheque produces, which must *not* count as a lapse.
 * - **Genuinely new members.** One term, a few months old, so "joined this month" and
 *   the single-term path are exercised.
 *
 * Tier follows age rather than a quota, because the senior rate is an entitlement and
 * not a marketing segment — seeding a devotee of forty onto it would make every
 * eligibility check in the console look broken the first time somebody opened a record.
 */
function buildMemberships(): Membership[] {
  const r = rng(310577)
  const base = today()
  const enrolled = DEVOTEES.slice(0, Math.min(26, DEVOTEES.length))
  const rows: Membership[] = []
  let n = 0

  enrolled.forEach((user, i) => {
    const age = ageOn(user.dob, base)
    const tier: MembershipTier = age !== null && age >= SENIOR_MIN_AGE ? 'senior' : 'normal'

    // How many years back this devotee first joined. Weighted towards the middle, with
    // a handful of long-standing members at the top of the roll so the register opens
    // with something other than a column of first-year names.
    const yearsBack = i < 3 ? int(r, 8, 12) : i < 8 ? int(r, 4, 7) : i < 22 ? int(r, 1, 3) : 0
    const terms = Math.max(1, yearsBack)

    // Two devotees lapsed and rejoined. Named by index rather than by chance so the
    // case is always present — a seeded edge case that only appears sometimes is an
    // edge case that is only tested sometimes.
    const lapsesAfterTerm = i === 1 ? 3 : i === 5 ? 2 : -1

    // Walk forward from the first term so the run reads as a real history.
    let cursor = addDays(base, -(yearsBack * 365 + int(r, 0, 120)))

    for (let t = 0; t < terms; t++) {
      const startDate = cursor
      const endDate = addDays(startDate, 365)
      const isLast = t === terms - 1

      const expired = endDate.getTime() < base.getTime()
      // Only the term in force can be cancelled; a past term that ran its course is
      // expired, whatever happened afterwards.
      const cancelled = isLast && !expired && chance(r, 6)

      rows.push({
        id: id('mem', ++n),
        userId: user.id,
        tier,
        startDate: iso(startDate),
        endDate: iso(endDate),
        autoRenew: isLast ? chance(r, 64) : true,
        // A senior concession is most often taken by a couple, so the family plan runs
        // a little higher on that tier than on the other.
        familyPlan: chance(r, tier === 'senior' ? 58 : 44),
        status: cancelled ? 'cancelled' : expired ? 'expired' : 'active',
      })

      // The next term starts where the last one ended, plus the few days a posted
      // cheque takes to reach a volunteer on a Sunday — inside the renewal grace, so
      // it is administration rather than a break in service.
      cursor = addDays(endDate, int(r, 1, 18))
      if (t === lapsesAfterTerm) {
        // …except here, where they genuinely let it go and came back a year or two on.
        cursor = addDays(endDate, int(r, 400, 800))
      }
    }

    // The record the devotee's own page opens on is the term in force.
    user.membershipId = rows[rows.length - 1]!.id
  })

  return rows
}

export const MEMBERSHIPS: Membership[] = buildMemberships()

/**
 * Every term a devotee has ever held, newest first.
 *
 * Tenure is computed from the whole run, so the history has to be reachable by user
 * and not merely by membership id.
 */
export const MEMBERSHIP_HISTORY_BY_USER = new Map<string, Membership[]>()
for (const m of MEMBERSHIPS) {
  const list = MEMBERSHIP_HISTORY_BY_USER.get(m.userId) ?? []
  list.push(m)
  MEMBERSHIP_HISTORY_BY_USER.set(m.userId, list)
}
for (const list of MEMBERSHIP_HISTORY_BY_USER.values()) {
  list.sort((a, b) => b.endDate.localeCompare(a.endDate))
}

/**
 * The term in force for each devotee.
 *
 * Latest by `endDate`, matching `getMembership` — with several rows per user now, a
 * naive map keyed on `userId` would keep whichever happened to be last in the array,
 * which is an arbitrary term rather than the current one.
 */
export const MEMBERSHIP_BY_USER = new Map(
  [...MEMBERSHIP_HISTORY_BY_USER].map(([userId, list]) => [userId, list[0]!]),
)
