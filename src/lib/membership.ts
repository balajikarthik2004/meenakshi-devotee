/**
 * Who may hold which membership, and what it costs.
 *
 * The senior rate is age-restricted, which makes it the first thing in this app whose
 * price depends on a fact about the person rather than on what they chose. That rule
 * has to be computed the same way in three places — the devotee's own enrolment page,
 * the console that grants a membership on someone's behalf, and the seed — so it is
 * computed here and nowhere else.
 *
 * Pure functions only, with no import from the data layer. Kept byte-identical in
 * `meenakshi-admin/src/lib/membership.ts`.
 */
import type { ISODate, Membership, MembershipTier, User } from '@/lib/data/types'

/** The age at which the concessional rate applies, on the day of enrolment. */
export const SENIOR_MIN_AGE = 65

/** Added to either tier for a family plan — spouse and minor children. */
export const FAMILY_PLAN_SURCHARGE = 100

/**
 * Completed years, not elapsed years.
 *
 * Someone whose sixty-fifth birthday is tomorrow is sixty-four today, and a rate that
 * turned on a decimal would let them in a day early and then argue about it at the
 * desk. The month-and-day comparison is the whole reason this is not a subtraction.
 */
export function ageOn(dob: ISODate | undefined, on: Date = new Date()): number | null {
  if (!dob) return null
  const born = new Date(dob)
  if (Number.isNaN(born.getTime())) return null

  let years = on.getFullYear() - born.getFullYear()
  const monthDiff = on.getMonth() - born.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < born.getDate())) years -= 1
  return years
}

export type EligibilityReason = 'eligible' | 'too-young' | 'no-dob'

/**
 * Whether a person may take a tier, and if not, which of the two reasons applies.
 *
 * "We don't know your date of birth" and "you are not old enough" need different
 * answers from the UI — the first is fixable in thirty seconds on the profile page,
 * the second is not — so they are never collapsed into a single `false`.
 */
export function eligibilityFor(
  tier: MembershipTier,
  user: Pick<User, 'dob'>,
  on: Date = new Date(),
): EligibilityReason {
  if (tier !== 'senior') return 'eligible'
  const age = ageOn(user.dob, on)
  if (age === null) return 'no-dob'
  return age >= SENIOR_MIN_AGE ? 'eligible' : 'too-young'
}

export const isEligibleFor = (
  tier: MembershipTier,
  user: Pick<User, 'dob'>,
  on: Date = new Date(),
): boolean => eligibilityFor(tier, user, on) === 'eligible'

/**
 * The tier a devotee should be offered first.
 *
 * A seventy-year-old shown the full rate at the top of the page and the concession
 * below it will quite often pay the full rate, which is not generosity — it is the
 * page failing to tell them something they were entitled to know.
 */
export const suggestedTier = (user: Pick<User, 'dob'>, on: Date = new Date()): MembershipTier =>
  isEligibleFor('senior', user, on) ? 'senior' : 'normal'

export const priceFor = (basePrice: number, familyPlan: boolean): number =>
  basePrice + (familyPlan ? FAMILY_PLAN_SURCHARGE : 0)

/** Days until a membership lapses — negative once it already has. */
export function daysUntilRenewal(m: Membership, on: Date = new Date()): number {
  return Math.ceil((new Date(m.endDate).getTime() - on.getTime()) / 86400000)
}

/** Live, and inside the window where the office would chase a renewal. */
export const isRenewingSoon = (m: Membership, withinDays = 45, on: Date = new Date()): boolean => {
  const left = daysUntilRenewal(m, on)
  return m.status === 'active' && left >= 0 && left <= withinDays
}

/* --------------------------------------------------------------- standing */

/**
 * How long somebody has been a member — computed, never stored.
 *
 * This exists because `Membership.startDate` is **the current term's start, not the
 * day they joined**. A renewal writes a new `Membership` row, so a devotee who has
 * been coming since 2016 and renews every year has `startDate` of a few months ago,
 * and a "member since" built from it congratulates them on being new. That is worse
 * than showing nothing: it quietly erases the exact loyalty the line is meant to
 * recognise, and it does so most severely for the longest-standing members.
 *
 * The honest figure is the earliest term across every record they hold, which is why
 * this takes a history rather than a membership. Deriving it also means it cannot
 * drift — there is no second field for a renewal to forget to carry forward.
 *
 * `continuousSince` is kept apart from `memberSince` for the same reason
 * `ApprovalStage` is kept apart from `Booking.status`: "joined in 2016" and "has been
 * a member without a break since 2021" are two different facts, and a temple that
 * recognises long service cares about the second. Collapsing them would either
 * overstate an unbroken record or wipe out the original joining year, and both are
 * things a member would correct you on.
 */
export interface MembershipStanding {
  /** The term in force, or the most recent one if none is live. */
  current: Membership | null
  /** The day they first joined. Null when they have never held a membership. */
  memberSince: ISODate | null
  /** Start of the current unbroken run. Equals `memberSince` when never lapsed. */
  continuousSince: ISODate | null
  /** Completed years and the remaining whole months since `memberSince`. */
  years: number
  months: number
  /** Terms held, including the one in force. */
  terms: number
  /** True when at least one gap between terms is longer than the grace below. */
  hadLapse: boolean
}

/**
 * Days a renewal may be late before it counts as a break in service.
 *
 * Renewals are posted by cheque and processed by a volunteer on a Sunday, so a
 * fortnight's gap between one term ending and the next starting is ordinary
 * administration rather than a lapse in membership. Treating it as a break would
 * reset half the roll's continuous service every year, which is both wrong and the
 * sort of wrong a member notices immediately.
 */
export const RENEWAL_GRACE_DAYS = 31

const DAY = 86_400_000

/**
 * Tenure from a devotee's full membership history.
 *
 * Pass every row for the person, in any order. Cancelled and expired terms count —
 * they were still a member for that time, and a history that only counts live terms
 * would say a thirty-year member who let one year slip has been with the temple since
 * last March.
 */
export function standingFrom(
  history: Membership[],
  on: Date = new Date(),
): MembershipStanding {
  if (history.length === 0) {
    return {
      current: null,
      memberSince: null,
      continuousSince: null,
      years: 0,
      months: 0,
      terms: 0,
      hadLapse: false,
    }
  }

  const sorted = [...history].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const first = sorted[0]!
  // The term in force, or failing that the most recent one — the same rule
  // `getMembership` uses, so the two can never disagree about which term is current.
  const current =
    [...history].sort((a, b) => b.endDate.localeCompare(a.endDate))[0] ?? null

  // Walk forward and restart the run wherever a gap exceeds the grace period.
  let runStart = first.startDate
  let hadLapse = false
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = new Date(sorted[i - 1]!.endDate).getTime()
    const thisStart = new Date(sorted[i]!.startDate).getTime()
    if (thisStart - prevEnd > RENEWAL_GRACE_DAYS * DAY) {
      hadLapse = true
      runStart = sorted[i]!.startDate
    }
  }

  const { years, months } = elapsed(first.startDate, on)

  return {
    current,
    memberSince: first.startDate,
    continuousSince: runStart,
    years,
    months,
    terms: history.length,
    hadLapse,
  }
}

/**
 * Completed years and leftover whole months between a date and now.
 *
 * Calendar arithmetic rather than division by 365, for the same reason `ageOn` does
 * it: "two years" should tick over on the anniversary, not three days before it.
 */
export function elapsed(from: ISODate, on: Date = new Date()): { years: number; months: number } {
  const start = new Date(from)
  if (Number.isNaN(start.getTime()) || start > on) return { years: 0, months: 0 }

  let months = (on.getFullYear() - start.getFullYear()) * 12 + (on.getMonth() - start.getMonth())
  if (on.getDate() < start.getDate()) months -= 1
  months = Math.max(0, months)

  return { years: Math.floor(months / 12), months: months % 12 }
}

/**
 * Tenure in words.
 *
 * Deliberately short and deliberately not precise past the month. "2 years" is what a
 * person says about themselves; "2 years, 3 months and 11 days" is what a database
 * says about them, and on a membership card the second reads as surveillance rather
 * than as recognition.
 */
export function tenureWords(standing: Pick<MembershipStanding, 'years' | 'months'>): string {
  const { years, months } = standing
  if (years === 0 && months === 0) return 'joined this month'
  if (years === 0) return `${months} month${months === 1 ? '' : 's'}`
  if (years >= 5 || months === 0) return `${years} year${years === 1 ? '' : 's'}`
  return `${years} year${years === 1 ? '' : 's'}, ${months} month${months === 1 ? '' : 's'}`
}

/**
 * A milestone worth marking, or nothing.
 *
 * Only the round numbers, and only once they are reached — a badge that appears at
 * four years eleven months to say "5 years" is a badge nobody trusts again. Returns
 * the largest milestone *passed*, so a twelve-year member gets one badge rather than
 * collecting four of them.
 *
 * **Render it as `"10+ years"`, never a bare `"10"`.** The badge sits beside the exact
 * tenure, and "10" next to "12 years" reads as two figures that disagree — the first
 * thing anyone does is ask which is right. The plus sign is the whole difference
 * between a number that contests the one next to it and a number that qualifies it.
 */
export const TENURE_MILESTONES = [25, 20, 15, 10, 5] as const

export function milestoneFor(years: number): number | null {
  return TENURE_MILESTONES.find((m) => years >= m) ?? null
}
