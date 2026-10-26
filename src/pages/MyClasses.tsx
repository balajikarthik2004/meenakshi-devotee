import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, GraduationCap, MapPin, User } from 'lucide-react'
import type { ClassEnrolment } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { StatTile } from '@/components/shared/StatTile'
import { StatusPill } from '@/components/shared/badges'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog } from '@/components/ui/overlay'
import { useToast } from '@/components/ui/toast'
import { CLASS_BY_ID } from '@/lib/data/mock'
import { getSchoolTerm, listEnrolmentsFor, withdrawEnrolment } from '@/lib/data/api'
import { useDonorIdentity } from '@/lib/donor'
import { useAsync } from '@/lib/hooks'
import { ENROLMENT_LABEL, timeRange } from '@/lib/school'
import { cn, fmtDate, money } from '@/lib/utils'

/**
 * The classes a family has registered for.
 *
 * Grouped by student rather than listed flat. A parent with three children in four
 * classes is not reading a list of enrolments — they are checking that each child
 * is where they should be on a Sunday morning, and a flat list makes them do that
 * sorting in their head.
 */
export default function MyClasses() {
  const identity = useDonorIdentity()
  const { toast } = useToast()
  const { data, loading, refresh } = useAsync(
    async () =>
      Promise.all([identity ? listEnrolmentsFor(identity) : Promise.resolve([]), getSchoolTerm()]),
    [identity?.userId, identity?.contact.email, identity?.contact.phone],
  )

  const [confirmDrop, setConfirmDrop] = useState<ClassEnrolment | null>(null)
  const [busy, setBusy] = useState(false)

  const enrolments = useMemo(() => data?.[0] ?? [], [data])
  const term = data?.[1]

  const live = enrolments.filter((e) => e.status !== 'withdrawn')
  const byStudent = useMemo(() => {
    const map = new Map<string, ClassEnrolment[]>()
    for (const e of live) {
      const key = e.studentName
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [live])

  const owed = live.filter((e) => e.status === 'pending-payment').reduce((s, e) => s + e.fee, 0)

  const drop = async () => {
    if (!confirmDrop) return
    setBusy(true)
    await withdrawEnrolment(confirmDrop.id)
    setBusy(false)
    setConfirmDrop(null)
    toast('Withdrawn', { detail: 'The place has been released to the waiting list.' })
    refresh()
  }

  if (loading) {
    return (
      <>
        <PageHeader title="My classes" subtitle="Loading your registrations…" />
        <LoadingSkeleton variant="table" rows={4} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My classes"
        subtitle={
          term
            ? `Vedic Heritage School · ${term.name} · ${term.cadence}`
            : 'Vedic Heritage School registrations'
        }
        actions={
          <Link to="/school" className={buttonVariants({ size: 'sm' })}>
            <GraduationCap />
            Browse classes
          </Link>
        }
      />

      {live.length === 0 ? (
        <EmptyState
          Icon={GraduationCap}
          title="No classes registered"
          detail="The Hindu WISDOM Program runs alternate Sundays through the academic year — Purna Vidya, Tamil, Sanskrit, music and yoga."
          action={
            <Link to="/school" className={buttonVariants({ size: 'sm' })}>
              See this year’s classes
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Students"
              value={byStudent.length}
              sub={`${live.length} ${live.length === 1 ? 'class' : 'classes'} between them`}
              Icon={GraduationCap}
              tone="leaf"
            />
            <StatTile
              label="Fees to pay"
              value={money(owed)}
              sub={owed > 0 ? 'Awaiting your payment' : 'Nothing outstanding'}
              tone={owed > 0 ? 'gold' : 'default'}
            />
            <StatTile
              label="On a waiting list"
              value={live.filter((e) => e.status === 'waitlisted').length}
              sub="We write when a place frees"
            />
          </div>

          <div className="space-y-6">
            {byStudent.map(([student, rows]) => (
              <section key={student}>
                <h2 className="mb-2.5 flex items-baseline gap-2.5 font-serif text-[18px]">
                  {student}
                  <span className="text-[12.5px] font-sans text-muted">
                    age {rows[0]!.studentAge}
                  </span>
                </h2>
                <div className="space-y-3">
                  {rows.map((e) => (
                    <EnrolmentRow
                      key={e.id}
                      enrolment={e}
                      cadence={term?.cadence ?? ''}
                      onDrop={() => setConfirmDrop(e)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <Card className="mt-6 p-4 text-[12.5px] leading-relaxed text-muted">
        Fees cover the whole academic year. A place booked by cheque or transfer is held and
        confirmed by the coordinators once payment reaches the office — you will see the status
        change here. Questions to{' '}
        <span className="font-medium text-ink">hwp.vhs@smdpearland.org</span>.
      </Card>

      <Dialog
        open={!!confirmDrop}
        onClose={() => setConfirmDrop(null)}
        title="Withdraw from this class?"
        description="The place is released immediately and offered to the next family on the waiting list."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDrop(null)}>
              Keep the place
            </Button>
            <Button onClick={drop} disabled={busy}>
              {busy ? 'Withdrawing…' : 'Withdraw'}
            </Button>
          </>
        }
      >
        {confirmDrop ? (
          <p className="text-[13.5px] text-ink">
            {confirmDrop.studentName} will be withdrawn from{' '}
            {CLASS_BY_ID.get(confirmDrop.classId)?.name ?? 'this class'}.
            {confirmDrop.status === 'enrolled' && confirmDrop.fee > 0
              ? ' Refunds are handled by the temple office.'
              : ''}
          </p>
        ) : null}
      </Dialog>
    </>
  )
}

function EnrolmentRow({
  enrolment,
  cadence,
  onDrop,
}: {
  enrolment: ClassEnrolment
  cadence: string
  onDrop: () => void
}) {
  const cls = CLASS_BY_ID.get(enrolment.classId)
  const pending = enrolment.status === 'pending-payment'
  const waitlisted = enrolment.status === 'waitlisted'

  return (
    <Card
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-3 p-4',
        pending && 'border-saffron-400/45 bg-saffron-400/[0.06]',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-tint font-mono text-[11.5px] font-semibold text-brand-700 ring-1 ring-inset ring-line">
        {cls?.code ?? '—'}
      </span>

      <div className="min-w-0 flex-1 basis-[13rem]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14.5px] font-medium text-ink">{cls?.name ?? 'Class'}</span>
          <StatusPill status={enrolment.status} label={ENROLMENT_LABEL[enrolment.status]} />
          {waitlisted && enrolment.waitlistPosition ? (
            <span className="text-[12px] text-muted">position {enrolment.waitlistPosition}</span>
          ) : null}
        </div>
        {cls ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {cadence}, {timeRange(cls.startTime, cls.endTime)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {cls.room}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5" />
              {cls.teacher}
            </span>
          </p>
        ) : null}
        {pending ? (
          <p className="mt-1 text-[12px] font-medium text-brand-700">
            {money(enrolment.fee)} by {enrolment.paymentMethod} — write {enrolment.id} on the memo
            line.
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-right">
          <span className="block text-[15px] font-medium tabular-nums text-ink">
            {enrolment.fee === 0 ? 'Free' : money(enrolment.fee)}
          </span>
          <span className="block text-[11.5px] text-muted">
            {ENROLMENT_LABEL[enrolment.status]}
          </span>
        </span>
        <button
          type="button"
          onClick={onDrop}
          className="text-[12.5px] font-medium text-brand-500 hover:underline"
        >
          Withdraw
        </button>
      </div>

      {enrolment.notes ? (
        <p className="w-full border-t border-line pt-2.5 text-[12px] italic text-muted">
          “{enrolment.notes}” · registered {fmtDate(enrolment.createdAt)}
        </p>
      ) : null}
    </Card>
  )
}
