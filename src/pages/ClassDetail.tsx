import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  User,
  Users,
} from 'lucide-react'
import type { ClassEnrolment } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { MockSuccessScreen } from '@/components/shared/MockSuccessScreen'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Radio, Textarea } from '@/components/ui/input'
import { enrolInClass, getClassBySlug, getSchoolTerm, listClasses } from '@/lib/data/api'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { CATEGORY_LABEL, ageRange, enrolVerdict, isFull, seatsLeft, timeRange } from '@/lib/school'
import { cn, fmtDate, money } from '@/lib/utils'

const METHODS: { key: ClassEnrolment['paymentMethod']; label: string; blurb: string }[] = [
  { key: 'card', label: 'Pay now by card', blurb: 'The place is confirmed straight away.' },
  { key: 'check', label: 'Send a cheque', blurb: 'Held for you; confirmed when it arrives.' },
  { key: 'zelle', label: 'Zelle transfer', blurb: 'Held for you; confirmed when it arrives.' },
]

/**
 * One class, and the form that books it.
 *
 * The student is not the person holding the account — almost every booking here is
 * a parent enrolling a child — so the form asks for them separately and the age it
 * asks for is the student's, because age is what decides admission.
 *
 * The verdict updates as the age is typed. A parent should find out that their
 * eight-year-old cannot join Level 7 while they are looking at the age box, not
 * after filling in four more fields and pressing the button.
 */
export default function ClassDetail() {
  const { slug } = useParams<{ slug: string }>()
  const user = useAuthStore((s) => s.user)

  const { data, loading } = useAsync(
    async () => Promise.all([getClassBySlug(slug!), getSchoolTerm(), listClasses()]),
    [slug],
  )
  const cls = data?.[0] ?? null
  const term = data?.[1]
  const all = useMemo(() => data?.[2] ?? [], [data])

  const [studentName, setStudentName] = useState('')
  const [studentAge, setStudentAge] = useState('')
  const [guardianName, setGuardianName] = useState(user?.name ?? '')
  const [guardianPhone, setGuardianPhone] = useState(user?.phone ?? '')
  const [guardianEmail, setGuardianEmail] = useState(user?.email ?? '')
  const [method, setMethod] = useState<ClassEnrolment['paymentMethod']>('card')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<ClassEnrolment | null>(null)

  const age = studentAge.trim() === '' ? null : Number(studentAge)
  const verdict = cls && term ? enrolVerdict(cls, term, Number.isFinite(age) ? age : null) : null

  const prerequisite = cls?.prerequisiteClassId
    ? all.find((c) => c.id === cls.prerequisiteClassId)
    : undefined

  const submit = async () => {
    if (!cls) return
    setError(null)
    setBusy(true)
    const result = await enrolInClass({
      classId: cls.id,
      userId: user?.id ?? null,
      studentName,
      studentAge: Number(studentAge),
      guardianName,
      guardianPhone,
      guardianEmail,
      paymentMethod: cls.fee === 0 ? 'cash' : method,
      notes,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setDone(result.enrolment)
  }

  if (loading) {
    return (
      <>
        <LoadingSkeleton variant="tiles" rows={2} />
        <LoadingSkeleton variant="table" rows={4} className="mt-5" />
      </>
    )
  }

  if (!cls || !term) {
    return (
      <EmptyState
        Icon={GraduationCap}
        title="Class not found"
        detail="It may have been renamed or withdrawn from this year’s programme."
        action={
          <Link to="/school" className={buttonVariants({ size: 'sm' })}>
            All classes
          </Link>
        }
      />
    )
  }

  /* ------------------------------------------------------------ confirmed */

  if (done) {
    const waitlisted = done.status === 'waitlisted'
    const pending = done.status === 'pending-payment'
    return (
      <MockSuccessScreen
        title={
          waitlisted
            ? `${done.studentName} is on the waiting list`
            : pending
              ? 'Registration received'
              : `${done.studentName} is enrolled`
        }
        subtitle={
          waitlisted
            ? `${cls.name} is full. We will offer the first place that frees up.`
            : pending
              ? 'The place is held. It is confirmed once your payment reaches the office.'
              : `${cls.name}, ${term.name}.`
        }
        referenceLabel="Registration"
        reference={done.id}
        rows={[
          { label: 'Student', value: `${done.studentName} · age ${done.studentAge}` },
          { label: 'Class', value: `${cls.code} · ${cls.name}` },
          { label: 'When', value: `${term.cadence}, ${timeRange(cls.startTime, cls.endTime)}` },
          { label: 'Room', value: cls.room },
          { label: 'Teacher', value: cls.teacher },
          { label: 'Fee', value: cls.fee === 0 ? 'Free' : money(cls.fee) },
          {
            label: 'Payment',
            value:
              cls.fee === 0
                ? 'Nothing to pay'
                : done.status === 'enrolled'
                  ? 'Paid by card'
                  : `By ${done.paymentMethod} — not yet received`,
          },
          ...(done.waitlistPosition
            ? [{ label: 'Waiting list', value: `Position ${done.waitlistPosition}` }]
            : []),
        ]}
        emailSubject={`${cls.name} — ${done.studentName}, ${term.name}`}
        emailBody={
          <>
            <p>Dear {done.guardianName},</p>
            <p className="mt-2">
              {waitlisted ? (
                <>
                  <strong>{cls.name}</strong> is full for {term.name}, so {done.studentName} has
                  been placed on the waiting list at position {done.waitlistPosition}. We will write
                  the moment a place frees up.
                </>
              ) : (
                <>
                  <strong>{done.studentName}</strong> is registered for <strong>{cls.name}</strong>{' '}
                  in {term.name}. Classes run {term.cadence.toLowerCase()},{' '}
                  {timeRange(cls.startTime, cls.endTime)}, in the {cls.room.toLowerCase()}.
                </>
              )}
            </p>
            {pending ? (
              <p className="mt-2">
                The place is held pending your {done.paymentMethod} of {money(done.fee)}. Please
                make cheques payable to <strong>Sri Meenakshi Temple Society</strong> and write{' '}
                <strong>{done.id}</strong> on the memo line.
              </p>
            ) : null}
            <p className="mt-2">
              The first class is {fmtDate(term.startDate, 'EEEE d MMMM yyyy')}. The alternate-Sunday
              calendar is handed out on the day.
            </p>
          </>
        }
        actions={
          <>
            <Link to="/school" className={buttonVariants({ variant: 'ghost' })}>
              Back to the classes
            </Link>
            <Link to="/my/classes" className={buttonVariants({})}>
              My classes
            </Link>
          </>
        }
      />
    )
  }

  /* ----------------------------------------------------------- the class */

  const full = isFull(cls)

  return (
    <>
      <Link
        to="/school"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All classes
      </Link>

      <PageHeader
        title={cls.name}
        subtitle={cls.summary}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{cls.code}</Badge>
            <Badge variant="gold">{CATEGORY_LABEL[cls.category]}</Badge>
            {full ? <Badge variant="brand">Full</Badge> : null}
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <h2 className="font-serif text-[19px]">About this class</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{cls.description}</p>

            <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <Detail Icon={Users} label="Ages" value={ageRange(cls)} />
              <Detail
                Icon={Clock}
                label="When"
                value={`${term.cadence}, ${timeRange(cls.startTime, cls.endTime)}`}
              />
              <Detail Icon={MapPin} label="Room" value={cls.room} />
              <Detail Icon={User} label="Teacher" value={cls.teacher} />
              <Detail
                Icon={CalendarDays}
                label="Term"
                value={`${fmtDate(term.startDate, 'd MMM yyyy')} – ${fmtDate(term.endDate, 'd MMM yyyy')}`}
              />
              <Detail
                Icon={GraduationCap}
                label="Places"
                value={full ? 'Full — waiting list' : `${seatsLeft(cls)} of ${cls.capacity} left`}
              />
            </dl>

            {prerequisite ? (
              /* Advisory, never a block. A family joining midway is placed by the
                 coordinators, and the app is not qualified to refuse them. */
              <p className="mt-4 flex items-start gap-2 rounded-[10px] border border-line bg-tint/60 p-3 text-[12.5px] leading-relaxed text-muted">
                <AlertCircle className="mt-px size-3.5 shrink-0 text-brand-500" />
                <span>
                  Normally follows{' '}
                  <Link
                    to={`/school/${prerequisite.slug}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {prerequisite.name}
                  </Link>
                  . If your child is new to the school, book the level that matches their age — the
                  coordinators will place them after a short assessment.
                </span>
              </p>
            ) : null}

            {cls.notes.length > 0 ? (
              <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                {cls.notes.map((n, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-muted">
                    <span
                      aria-hidden
                      className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-500/60"
                    />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>

        {/* ------------------------------------------------------- booking */}

        <Card className="sticky top-6 overflow-hidden">
          <div className="flex items-baseline justify-between gap-3 border-b border-line bg-tint/50 px-5 py-3.5">
            <h2 className="font-serif text-[17px]">Register a student</h2>
            <span className="text-[17px] font-medium tabular-nums text-ink">
              {cls.fee === 0 ? 'Free' : money(cls.fee)}
            </span>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Student’s name" htmlFor="sc-name" className="sm:col-span-2">
                <Input
                  id="sc-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="The child who will attend"
                />
              </Field>
              <Field
                label="Age"
                hint="on the first class"
                htmlFor="sc-age"
                error={
                  verdict && !verdict.canBook && verdict.outcome === 'refuse' && age !== null
                    ? verdict.reason
                    : undefined
                }
              >
                <Input
                  id="sc-age"
                  type="number"
                  min={3}
                  max={99}
                  value={studentAge}
                  onChange={(e) => setStudentAge(e.target.value)}
                  placeholder={String(cls.minAge)}
                />
              </Field>
            </div>

            <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <Field label="Parent or guardian" htmlFor="sc-g" className="sm:col-span-2">
                <Input
                  id="sc-g"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </Field>
              <Field label="Phone" htmlFor="sc-p">
                <Input
                  id="sc-p"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="(281) 555-0142"
                />
              </Field>
              <Field label="Email" htmlFor="sc-e">
                <Input
                  id="sc-e"
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                />
              </Field>
            </div>

            <Field
              label="Anything the school should know"
              hint="optional"
              htmlFor="sc-n"
              className="border-t border-line pt-4"
            >
              <Textarea
                id="sc-n"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Allergies, a sibling to seat with, a late arrival…"
              />
            </Field>

            {cls.fee > 0 ? (
              <div className="border-t border-line pt-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                  How you’ll pay
                </p>
                <div className="space-y-2">
                  {METHODS.map((m) => (
                    <label
                      key={m.key}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3 transition-colors',
                        method === m.key
                          ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                          : 'border-line bg-card hover:border-brand-300',
                      )}
                    >
                      <Radio
                        name="pay"
                        className="mt-0.5"
                        checked={method === m.key}
                        onChange={() => setMethod(m.key)}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-ink">{m.label}</span>
                        <span className="block text-[12px] leading-snug text-muted">{m.blurb}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {/* The verdict, live. Green while it will take the booking, amber when
                it will take a name for the list, red when it will not. */}
            {verdict ? (
              <p
                className={cn(
                  'flex items-start gap-2 rounded-[10px] border p-3 text-[12.5px] leading-relaxed',
                  verdict.outcome === 'enrol'
                    ? 'border-leaf-500/30 bg-leaf-500/[0.07] text-ink'
                    : verdict.outcome === 'waitlist'
                      ? 'border-saffron-400/40 bg-saffron-400/[0.1] text-ink'
                      : 'border-brand-500/30 bg-brand-500/[0.06] text-brand-700',
                )}
              >
                <AlertCircle className="mt-px size-3.5 shrink-0" />
                {verdict.reason}
              </p>
            ) : null}

            {error ? (
              <p className="flex items-start gap-2 rounded-[10px] border border-brand-500/30 bg-brand-500/[0.06] p-3 text-[12.5px] text-brand-700">
                <AlertCircle className="mt-px size-3.5 shrink-0" />
                {error}
              </p>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              onClick={submit}
              disabled={busy || !verdict?.canBook || !studentName.trim()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <GraduationCap />}
              {busy
                ? 'Registering…'
                : verdict?.outcome === 'waitlist'
                  ? 'Join the waiting list'
                  : cls.fee === 0
                    ? 'Register'
                    : `Register · ${money(cls.fee)}`}
            </Button>

            <p className="text-[11.5px] leading-relaxed text-muted">
              Fees cover the whole academic year and include materials. A place paid by cheque or
              transfer is held for you and confirmed by the coordinators when the payment arrives.
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}

function Detail({ Icon, label, value }: { Icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-500" />
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </dt>
        <dd className="text-[13.5px] text-ink">{value}</dd>
      </div>
    </div>
  )
}
