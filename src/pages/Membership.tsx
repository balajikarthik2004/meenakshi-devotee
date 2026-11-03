import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Check, FileText, Info, Loader2, Users } from 'lucide-react'
import type { Donation, Membership, MembershipTier } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { TierBadge } from '@/components/shared/badges'
import { PaymentMethodPicker } from '@/components/shared/PaymentMethodPicker'
import { MockSuccessScreen } from '@/components/shared/MockSuccessScreen'
import { LoadingSkeleton } from '@/components/shared/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/input'
import { TIERS, TIER_BY_KEY } from '@/lib/data/mock'
import { createMembership, getMembershipStanding } from '@/lib/data/api'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import {
  FAMILY_PLAN_SURCHARGE,
  SENIOR_MIN_AGE,
  ageOn,
  eligibilityFor,
  priceFor,
  suggestedTier,
  milestoneFor,
  tenureWords,
} from '@/lib/membership'
import { cn, fmtDate, money } from '@/lib/utils'
/**
 * Two memberships: the standard annual one, and the concessional rate for devotees
 * aged sixty-five and over.
 *
 * The page leads with whichever one the devotee is actually entitled to. A
 * seventy-year-old shown the full rate first and the concession underneath will quite
 * often pay the full rate, and that is not generosity — it is the page failing to
 * tell them something they had a right to know. `suggestedTier` makes that choice
 * once, from their date of birth, rather than leaving it to whoever reads fastest.
 *
 * There is no comparison table, because there is nothing to compare: the benefits are
 * identical apart from reserved seating, and a grid of ticks that were the same down
 * both columns would imply a hierarchy the temple does not operate.
 */
export default function MembershipPage() {
  const user = useAuthStore((s) => s.user)!
  // Tenure comes from the whole run of terms, not from the one in force — `startDate`
  // on the current membership is the day they last renewed, which for a long-standing
  // member is the most misleading date on the record.
  const {
    data: standing,
    loading,
    refresh,
  } = useAsync(() => getMembershipStanding(user.id), [user.id])
  const current = standing?.current ?? null
  const [selected, setSelected] = useState<MembershipTier | null>(null)
  const [familyPlan, setFamilyPlan] = useState(false)
  const [autoRenew, setAutoRenew] = useState(true)
  const [method, setMethod] = useState<Donation['paymentMethod']>('card')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Membership | null>(null)
  const age = ageOn(user.dob)
  const recommended = suggestedTier(user)
  const tierSpec = selected ? TIER_BY_KEY.get(selected)! : null
  const price = tierSpec ? priceFor(tierSpec.price, familyPlan) : 0
  const enrol = async () => {
    if (!selected || eligibilityFor(selected, user) !== 'eligible') return
    setBusy(true)
    await new Promise((r) => setTimeout(r, 800))
    const start = new Date()
    const end = new Date(start)
    end.setFullYear(end.getFullYear() + 1)
    const m = await createMembership({
      userId: user.id,
      tier: selected,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      autoRenew,
      familyPlan,
    })
    setBusy(false)
    setDone(m)
    refresh()
  }
  if (done) {
    const spec = TIER_BY_KEY.get(done.tier)!
    return (
      <MockSuccessScreen
        title={`Welcome — your ${spec.label} membership is active`}
        subtitle="Your benefits start immediately and run for one year."
        referenceLabel="Membership"
        reference={done.id}
        rows={[
          { label: 'Membership', value: spec.label },
          { label: 'Valid', value: `${fmtDate(done.startDate)} – ${fmtDate(done.endDate)}` },
          { label: 'Family plan', value: done.familyPlan ? 'Yes' : 'No' },
          { label: 'Auto-renew', value: done.autoRenew ? 'On' : 'Off' },
          { label: 'Amount paid', value: money(price) },
        ]}
        emailSubject={`Your ${spec.label} membership is active`}
        emailBody={
          <>
            <p>Dear {user.name},</p>
            <p className="mt-2">
              Your <strong>{spec.label}</strong> membership is active through{' '}
              {fmtDate(done.endDate, 'MMMM d, yyyy')}
              {done.familyPlan ? ', covering your spouse and minor children' : ''}. Give your name
              at the office desk for member pricing on facility bookings.
            </p>
            {done.tier === 'senior' ? (
              <p className="mt-2">
                As a senior member, seating is reserved for you at every major festival. Please
                arrive fifteen minutes before the utsavam and speak to a volunteer at the east door.
              </p>
            ) : null}
          </>
        }
        actions={
          <>
            <Link to="/dashboard" className={buttonVariants({ variant: 'ghost' })}>
              Back to dashboard
            </Link>
            <Link to="/puja" className={buttonVariants({})}>
              Use your free archana
            </Link>
          </>
        }
      />
    )
  }
  return (
    <>
      <PageHeader
        title="Membership"
        subtitle="Annual membership keeps the lamps lit, the kitchen running and the priests supported."
        actions={
          /* Offered to everyone, including existing members — a member may be applying
             on behalf of a family member, and hiding the route behind "do you already
             have one?" sends them to the telephone instead. */
          <Link to="/membership/apply" className={buttonVariants({})}>
            <FileText />
            Apply for membership
          </Link>
        }
      />
      {loading ? (
        <LoadingSkeleton variant="tiles" rows={3} />
      ) : (
        <>
          {current ? (
            <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Your current membership
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2 font-serif text-[20px]">
                  {TIER_BY_KEY.get(current.tier)?.label ?? current.tier}
                  <TierBadge tier={current.tier} />
                  <Badge variant={current.status === 'active' ? 'leaf' : 'brand'}>
                    {current.status === 'active' ? 'Active' : 'Lapsed'}
                  </Badge>
                </p>
                {/* The line the member actually cares about, above the administrative
                    one. A temple membership is a long relationship and the renewal date
                    is merely its paperwork; "a member for eleven years" is the fact
                    worth leading with, and it is the one the record had been quietly
                    losing on every renewal. */}
                {standing?.memberSince ? (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                    <span className="text-ink">
                      A member since{' '}
                      <span className="font-semibold">
                        {fmtDate(standing.memberSince, 'MMMM yyyy')}
                      </span>{' '}
                      — {tenureWords(standing)}
                    </span>
                    {milestoneFor(standing.years) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/[0.14] px-2 py-px text-[11.5px] font-bold text-gold-600">
                        <Award className="size-3" />
                        {/* "10+ years", never a bare "10" — it sits inches from the
                            exact figure and must qualify it rather than contest it. */}
                        {milestoneFor(standing.years)}+ years
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <p className="mt-1 text-[13px] text-muted">
                  {current.status === 'active' ? 'Renews' : 'Expired'}{' '}
                  {fmtDate(current.endDate, 'MMMM yyyy')} ·{' '}
                  {current.autoRenew ? 'Auto-renew on' : 'Auto-renew off'} ·{' '}
                  {current.familyPlan ? 'Family plan' : 'Individual'}
                  {standing && standing.terms > 1 ? (
                    <> · {standing.terms} terms</>
                  ) : null}
                </p>
                {/* Stated rather than hidden. Saying "a member since 2014" to somebody
                    who let four years go is a claim they would correct you on, and the
                    unbroken run is the figure any long-service recognition turns on. */}
                {standing?.hadLapse && standing.continuousSince ? (
                  <p className="mt-1 text-[12.5px] text-muted">
                    Continuously since {fmtDate(standing.continuousSince, 'MMMM yyyy')}, after a
                    break.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelected(current.tier)
                    setFamilyPlan(current.familyPlan)
                  }}
                >
                  Renew
                </Button>
                {/* Not an "upgrade" button: there is nothing above either tier. What a
                    member may legitimately want is to move onto the concession once
                    they reach 65, and that is offered only when it is actually true. */}
                {current.tier === 'normal' && recommended === 'senior' ? (
                  <Button variant="outline" size="sm" onClick={() => setSelected('senior')}>
                    Switch to the senior rate
                  </Button>
                ) : null}
                <Link to="/profile" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                  Manage
                </Link>
              </div>
            </Card>
          ) : null}
          {/* Said once, plainly, above the cards — rather than left for the devotee to
              work out from a disabled button. */}
          {recommended === 'senior' && !current ? (
            <Card className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-leaf-500/30 bg-leaf-500/[0.06] p-3.5">
              <Info className="size-4 shrink-0 text-leaf-600" />
              <p className="min-w-0 text-[13px] text-ink">
                You are {age} — the senior citizen rate applies to you, and it is{' '}
                {money(TIER_BY_KEY.get('normal')!.price - TIER_BY_KEY.get('senior')!.price)} less
                than the standard membership.
              </p>
            </Card>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Whichever tier the devotee is entitled to comes first on the page. */}
            {[...TIERS]
              .sort((a, b) => (a.tier === recommended ? -1 : b.tier === recommended ? 1 : 0))
              .map((t) => {
                const reason = eligibilityFor(t.tier, user)
                const eligible = reason === 'eligible'
                const isCurrent = current?.tier === t.tier && current.status === 'active'
                const isSelected = selected === t.tier
                return (
                  <Card
                    key={t.tier}
                    className={cn(
                      'flex flex-col p-5 transition-shadow',
                      t.tier === recommended && 'border-brand-500/40',
                      isSelected && 'ring-2 ring-brand-500/30',
                      !eligible && 'opacity-80',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-serif text-[22px]">{t.label}</h2>
                      {isCurrent ? <Badge variant="leaf">Current</Badge> : null}
                      {!isCurrent && t.tier === recommended ? (
                        <Badge variant="gold">Your rate</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] text-muted">{t.tagline}</p>
                    <p className="mt-3 text-[32px] leading-none tabular-nums">
                      {money(t.price)}
                      <span className="ml-1 font-sans text-[13px] text-muted">/ year</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {t.perks.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-[13px] leading-relaxed">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-leaf-500" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-5">
                      {eligible ? (
                        /* Renewing and applying are different things and go different
                           ways. A member renewing already belongs — they pay and carry
                           on, inline, as before. Somebody choosing a membership for the
                           first time is applying, and an application is a form the
                           temple office reads and decides on, so it goes there. Sending
                           both down the same path would either make members re-apply
                           every year or let a stranger grant themselves a membership. */
                        isCurrent ? (
                          <Button className="w-full" onClick={() => setSelected(t.tier)}>
                            Renew this membership
                          </Button>
                        ) : (
                          <Link
                            to={`/membership/apply?tier=${t.tier}`}
                            className={cn(
                              buttonVariants({
                                variant: t.tier === recommended ? 'default' : 'ghost',
                              }),
                              'w-full',
                            )}
                          >
                            Choose {t.label}
                          </Link>
                        )
                      ) : (
                        /* The two reasons get different answers, because one of them
                           the devotee can fix in thirty seconds and the other they
                           cannot. Collapsing both into a greyed-out button would send
                           somebody with a missing date of birth away for good. */
                        <div className="rounded-[10px] border border-line bg-tint/50 p-3 text-[12.5px] leading-relaxed text-muted">
                          {reason === 'no-dob' ? (
                            <>
                              This rate is for devotees aged {SENIOR_MIN_AGE} and over. We do not
                              have your date of birth on file —{' '}
                              <Link
                                to="/profile"
                                className="font-medium text-brand-500 hover:underline"
                              >
                                add it to your profile
                              </Link>{' '}
                              and this page will offer it if it applies.
                            </>
                          ) : (
                            <>
                              This rate applies from age {SENIOR_MIN_AGE}. You are {age} — the
                              standard membership is the one for you for now, and we will offer the
                              concession when it is due.
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
          </div>
          {selected && tierSpec ? (
            <Card className="mt-6 space-y-4 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-[20px]">Checkout — {tierSpec.label}</h2>
                <span className="text-[24px] tabular-nums">{money(price)}</span>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line p-3.5 transition-colors hover:border-brand-300">
                <Checkbox checked={familyPlan} onChange={(e) => setFamilyPlan(e.target.checked)} />
                <span>
                  <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                    <Users className="size-3.5" />
                    Family plan (+{money(FAMILY_PLAN_SURCHARGE)})
                  </span>
                  <span className="block text-[12.5px] text-muted">
                    Adds your spouse and minor children under one family tree. Adult children need
                    their own membership.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-[13.5px]">
                <Checkbox checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
                Auto-renew next year — we’ll email you two weeks before
              </label>
              <div className="border-t border-line pt-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Payment method
                </p>
                <PaymentMethodPicker value={method} onChange={setMethod} />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button size="lg" onClick={enrol} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : null}
                  {busy ? 'Processing…' : `Join · ${money(price)}`}
                </Button>
              </div>
            </Card>
          ) : null}
          <Card className="mt-6 p-4 text-[12.5px] leading-relaxed text-muted">
            Membership runs for one year from the day you join. The senior citizen rate is open to
            devotees aged {SENIOR_MIN_AGE} and over on the day of enrolment and carries the same
            benefits as the standard membership, plus reserved festival seating. Membership dues
            support the temple’s running costs and are not a deductible contribution.
          </Card>
        </>
      )}
    </>
  )
}
