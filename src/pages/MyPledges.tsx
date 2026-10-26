import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, Coins, HandCoins, TriangleAlert, UserRound } from 'lucide-react'
import type { Pledge } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { PledgeSchedule } from '@/components/shared/PledgeSchedule'
import { StatTile } from '@/components/shared/StatTile'
import { StatusPill } from '@/components/shared/badges'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Progress } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/overlay'
import { useToast } from '@/components/ui/toast'
import { cancelPledge, listPledgesFor, settlePledgeInstallment } from '@/lib/data/api'
import { signUpHrefFor, useDonorIdentity } from '@/lib/donor'
import { useAsync } from '@/lib/hooks'
import { describePlan, nextDue, pledgeTotals, summarisePledges } from '@/lib/pledge'
import { fmtDate, money, titleCase } from '@/lib/utils'

/**
 * What a devotee has promised, and what is left of it.
 *
 * This page exists because a pledge is the one thing a devotee gives the temple that
 * they cannot see on any other screen. It is not in the donation history — it is not a
 * donation — and it is not on a receipt, because a promise is not deductible until it
 * is paid. Without somewhere to read it back, the devotee's only record of what they
 * committed to is the confirmation email, and the first they hear of it again is a
 * phone call from the office.
 *
 * Reached through `listPledgesFor` rather than by user id, exactly as the donation
 * history is, so a guest who pledged before creating an account still finds the
 * promise waiting — and finds it again once they register.
 */
export default function MyPledges() {
  const identity = useDonorIdentity()!
  const { toast } = useToast()
  const { data, loading, refresh } = useAsync(
    () => listPledgesFor(identity),
    [identity.userId, identity.contact.email, identity.contact.phone],
  )

  const [paying, setPaying] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Pledge | null>(null)
  const [busy, setBusy] = useState(false)

  const pledges = useMemo(() => data ?? [], [data])
  const summary = useMemo(() => summarisePledges(pledges), [pledges])
  const signUpHref = signUpHrefFor(identity.contact)

  const live = pledges.filter((p) => p.status !== 'cancelled' && p.status !== 'fulfilled')
  const settled = pledges.filter((p) => p.status === 'cancelled' || p.status === 'fulfilled')

  const pay = async (pledgeId: string, installmentId: string) => {
    setPaying(installmentId)
    const result = await settlePledgeInstallment(pledgeId, installmentId)
    setPaying(null)
    if (!result) return
    toast(`${money(result.donation.amount)} received — thank you`, {
      detail: `Receipt ${result.donation.taxReceiptId ?? result.donation.id} is in your donation history.`,
    })
    refresh()
  }

  const cancel = async () => {
    if (!confirmCancel) return
    setBusy(true)
    await cancelPledge(confirmCancel.id)
    setBusy(false)
    setConfirmCancel(null)
    toast('Pledge cancelled', { detail: 'Payments you had already made are unaffected.' })
    refresh()
  }

  if (loading) {
    return (
      <>
        <PageHeader title="My pledges" subtitle="Loading what you have promised…" />
        <LoadingSkeleton variant="tiles" rows={3} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My pledges"
        subtitle="What you have promised, when each payment falls due, and what is left."
        actions={
          <Link to="/donate?mode=pledge" className={buttonVariants({ size: 'sm' })}>
            <CalendarCheck2 />
            Make a pledge
          </Link>
        }
      />

      {identity.isGuest ? (
        <Card className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-saffron-400/35 bg-saffron-400/[0.07] p-4">
          <UserRound className="size-4 shrink-0 text-brand-600" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
            Showing pledges matched to <span className="font-medium">{identity.contact.email}</span>
            . Create an account and they move onto your permanent devotee record, reachable from any
            device.
          </p>
          <Link to={signUpHref} className={buttonVariants({ size: 'sm' })}>
            Create my account
          </Link>
        </Card>
      ) : null}

      {pledges.length === 0 ? (
        <EmptyState
          Icon={CalendarCheck2}
          title="No pledges yet"
          detail="A pledge lets you commit now and pay next month, next year, or over several instalments — nothing is charged until the date you choose."
          action={
            <Link to="/donate?mode=pledge" className={buttonVariants({ size: 'sm' })}>
              Make a pledge
            </Link>
          }
        />
      ) : (
        <>
          {/* Outstanding leads, because it is the number the devotee came to check.
              "Received" sits beside it rather than inside it — money already given is
              in the donation history, and showing one figure for both would make this
              page disagree with that one. */}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Still to give"
              value={money(summary.outstanding)}
              sub={`Across ${summary.count} live ${summary.count === 1 ? 'pledge' : 'pledges'}`}
              Icon={CalendarCheck2}
              tone="gold"
            />
            <StatTile
              label="Given against pledges"
              value={money(summary.received)}
              sub="Already in your donation history"
              Icon={Coins}
              tone="leaf"
            />
            <StatTile
              label="Due in the next 30 days"
              value={money(summary.dueSoon)}
              sub={summary.overdue > 0 ? `${money(summary.overdue)} overdue` : 'Nothing overdue'}
              Icon={summary.overdue > 0 ? TriangleAlert : HandCoins}
              tone={summary.overdue > 0 ? 'brand' : 'default'}
            />
          </div>

          <div className="space-y-5">
            {[...live, ...settled].map((p) => (
              <PledgeCard
                key={p.id}
                pledge={p}
                payingId={paying}
                onPay={(installmentId) => pay(p.id, installmentId)}
                onCancel={() => setConfirmCancel(p)}
              />
            ))}
          </div>
        </>
      )}

      <Card className="mt-5 p-4 text-[12.5px] leading-relaxed text-muted">
        A pledge is a promise, not a payment. Sri Meenakshi Temple Society issues a 501(c)(3)
        receipt for each instalment as it is received; the pledge itself is not a deductible
        contribution until it is paid.
      </Card>

      <Dialog
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        title="Cancel this pledge?"
        description="The temple will be told the remaining payments are not coming. Anything you have already given stays on your record as a gift."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmCancel(null)}>
              Keep the pledge
            </Button>
            <Button onClick={cancel} disabled={busy}>
              {busy ? 'Cancelling…' : 'Cancel pledge'}
            </Button>
          </>
        }
      >
        {confirmCancel ? (
          <p className="text-[13.5px] text-ink">
            {money(pledgeTotals(confirmCancel).outstanding)} is still outstanding on your{' '}
            {titleCase(confirmCancel.category)} pledge.
          </p>
        ) : null}
      </Dialog>
    </>
  )
}

/** One promise: what it is for, how far along it is, and every date it comes down to. */
function PledgeCard({
  pledge,
  payingId,
  onPay,
  onCancel,
}: {
  pledge: Pledge
  payingId: string | null
  onPay: (installmentId: string) => void
  onCancel: () => void
}) {
  const totals = pledgeTotals(pledge)
  const upcoming = nextDue(pledge)
  const open = pledge.status !== 'cancelled' && pledge.status !== 'fulfilled'

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-[18px] text-ink">{titleCase(pledge.category)} fund</h2>
            <StatusPill status={pledge.status} />
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {describePlan(
              { amount: pledge.amount, cadence: pledge.cadence, count: pledge.installments.length },
              money,
            )}
            {' · '}
            pledged {fmtDate(pledge.createdAt)}
          </p>
          {pledge.dedicatedTo ? (
            <p className="mt-0.5 text-[12.5px] italic text-muted">{pledge.dedicatedTo}</p>
          ) : null}
          {pledge.note ? <p className="mt-0.5 text-[12.5px] text-muted">“{pledge.note}”</p> : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[22px] tabular-nums text-ink">{money(totals.outstanding)}</p>
          <p className="text-[12px] text-muted">still to give of {money(totals.pledged)}</p>
        </div>
      </div>

      <div className="space-y-1.5 px-5 pt-4">
        <Progress
          value={totals.pledged > 0 ? (totals.received / totals.pledged) * 100 : 0}
          tone={pledge.status === 'fulfilled' ? 'leaf' : 'brand'}
          label={`${titleCase(pledge.category)} pledge — ${money(totals.received)} of ${money(totals.pledged)} received`}
        />
        <p className="text-[12px] text-muted">
          {money(totals.received)} received · {totals.paidCount} of {pledge.installments.length}{' '}
          payments made
          {totals.overdueCount > 0 ? (
            <span className="font-medium text-brand-600"> · {totals.overdueCount} overdue</span>
          ) : null}
        </p>
      </div>

      <div className="px-5 pb-1 pt-3">
        <PledgeSchedule
          installments={pledge.installments}
          onPay={open ? (i) => onPay(i.id) : undefined}
          payingId={payingId}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-tint/40 px-5 py-3">
        <p className="text-[12.5px] text-muted">
          {pledge.status === 'cancelled' ? (
            <>Cancelled {pledge.cancelledAt ? fmtDate(pledge.cancelledAt) : ''}</>
          ) : pledge.status === 'fulfilled' ? (
            <>Fully paid — thank you</>
          ) : upcoming ? (
            <>
              Next payment of {money(upcoming.amount)} on{' '}
              <span className="font-medium text-ink">{fmtDate(upcoming.dueDate)}</span>, by{' '}
              {titleCase(pledge.intendedMethod)}
            </>
          ) : null}
        </p>
        {open ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[12.5px] font-medium text-brand-500 hover:underline"
          >
            Cancel this pledge
          </button>
        ) : null}
      </div>
    </Card>
  )
}
