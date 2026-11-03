import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Info, Loader2, Mail } from 'lucide-react'
import type {
  ScholarshipProgramme,
  ScholarshipSubmitResult,
} from '@/lib/data/scholarshipApi'
import { getProgramme, isOffline, submitScholarship } from '@/lib/data/scholarshipApi'
import { PageHeader } from '@/components/layout/layouts'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store/auth'
import { cn, fmtDate } from '@/lib/utils'

/**
 * The community scholarship application.
 *
 * ## Why the optional fields say they are optional, loudly
 *
 * Many schools have stopped publishing class rank, and test-optional admissions means
 * plenty of good students have no SAT or ACT. A form that merely leaves those blank
 * invites a student to assume they are disqualified and close the tab. So each one
 * states what happens if it is empty — the criterion is left out of the score rather
 * than counted as nought — which is both true and the difference between an
 * application and an abandonment.
 *
 * ## Why the score is not shown back
 *
 * The committee reads these. A student shown "you scored 68" before submitting would
 * reasonably go back and adjust what they reported, and the figures would stop being
 * what their transcript says. The criteria and their weights are published on the
 * previous page; the arithmetic is not run in front of them.
 */

export default function ScholarshipApply() {
  const user = useAuthStore((s) => s.user)

  const [programme, setProgramme] = useState<ScholarshipProgramme | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [done, setDone] = useState<ScholarshipSubmitResult | null>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [school, setSchool] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [gpa, setGpa] = useState('')
  const [rank, setRank] = useState('')
  const [size, setSize] = useState('')
  const [sat, setSat] = useState('')
  const [act, setAct] = useState('')
  const [college, setCollege] = useState('')
  const [major, setMajor] = useState('')
  const [hours, setHours] = useState('')
  const [service, setService] = useState('')
  const [temple, setTemple] = useState('')
  const [statement, setStatement] = useState('')
  const [memberNumber, setMemberNumber] = useState('')
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getProgramme()
      .then((p) => {
        setProgramme(p)
        setGradYear(String(p.year))
      })
      .catch((e) => setOffline(isOffline(e)))
      .finally(() => setLoading(false))
  }, [])

  const num = (v: string) => {
    const n = Number(v.trim())
    return v.trim() && Number.isFinite(n) ? n : undefined
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      setDone(
        await submitScholarship({
          studentName: name.trim(),
          studentEmail: email.trim(),
          studentPhone: phone.trim() || undefined,
          school: school.trim(),
          graduationYear: Number(gradYear),
          gpa: Number(gpa),
          classRank: num(rank),
          classSize: num(size),
          satTotal: num(sat),
          actComposite: num(act),
          college: college.trim() || undefined,
          intendedMajor: major.trim() || undefined,
          serviceHours: Number(hours || 0),
          serviceSummary: service.trim(),
          templeInvolvement: temple.trim() || undefined,
          statement: statement.trim(),
          memberNumber: memberNumber.trim() || undefined,
          signature: signature.trim(),
        }),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your application could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading
      </div>
    )
  }

  if (offline || !programme) {
    return (
      <>
        <PageHeader title="Apply for a scholarship" subtitle="Community scholarship" />
        <Card className="flex items-start gap-3 p-6">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-saffron-600" />
          <div>
            <p className="font-semibold text-ink">The scholarship service is not running</p>
            <p className="mt-1 text-[14px] text-muted">
              Start it with <code className="rounded bg-tint px-1">npm run dev</code> in the
              backend folder, then reload.
            </p>
          </div>
        </Card>
      </>
    )
  }

  // A closed window is stated rather than letting somebody fill in a form that will be
  // refused on submit.
  if (!programme.window.open) {
    return (
      <>
        <PageHeader title="Apply for a scholarship" subtitle={programme.name} />
        <Card className="px-6 py-10 text-center">
          <p className="font-serif text-[21px] text-ink">
            {programme.window.reason === 'not-yet'
              ? 'Applications are not open yet'
              : 'Applications have closed'}
          </p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[14px] leading-relaxed text-muted">
            {programme.window.reason === 'not-yet'
              ? `The ${programme.year} scholarship opens on ${fmtDate(programme.opensAt, 'd MMMM yyyy')}.`
              : `The ${programme.year} scholarship closed on ${fmtDate(programme.closesAt, 'd MMMM yyyy')}. The committee is reading this year's applications now.`}
          </p>
          <Link to="/scholarship" className={cn(buttonVariants({ variant: 'outline' }), 'mt-5')}>
            Back to scholarships
          </Link>
        </Card>
      </>
    )
  }

  if (done) return <Submitted result={done} programme={programme} />

  const canSubmit =
    name.trim().length > 1 &&
    email.includes('@') &&
    school.trim().length > 1 &&
    Number(gpa) > 0 &&
    service.trim().length >= 10 &&
    statement.trim().length >= 50 &&
    signature.trim().length > 2 &&
    agreed &&
    !busy

  return (
    <>
      <PageHeader
        title="Apply for a scholarship"
        subtitle={`${programme.name} · closes ${fmtDate(programme.closesAt, 'd MMMM yyyy')}`}
      />

      <div className="mx-auto max-w-[720px] space-y-5">
        <Block title="About you">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={name} onChange={setName} />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={setEmail} type="email" />
            </Field>
            <Field label="Phone" optional>
              <Input value={phone} onChange={setPhone} />
            </Field>
            <Field label="Graduating year">
              <Input value={gradYear} onChange={setGradYear} type="number" />
            </Field>
            <Field label="Your school" className="sm:col-span-2">
              <Input value={school} onChange={setSchool} placeholder="Pearland High School" />
            </Field>
          </div>
        </Block>

        <Block
          title="Your academic record"
          blurb={`Give these as they appear on your transcript. The minimum is ${programme.minGpa.toFixed(1)} unweighted on a ${programme.gpaScale.toFixed(1)} scale.`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Unweighted GPA"
              hint={`On a ${programme.gpaScale.toFixed(1)} scale`}
            >
              <Input value={gpa} onChange={setGpa} type="number" step="0.01" placeholder="3.75" />
            </Field>
            <div />
            <Field
              label="Class rank"
              optional
              hint="Left out of your score if your school does not publish one"
            >
              <Input value={rank} onChange={setRank} type="number" placeholder="24" />
            </Field>
            <Field label="Class size" optional hint="Needed for the rank to mean anything">
              <Input value={size} onChange={setSize} type="number" placeholder="588" />
            </Field>
            <Field label="SAT total" optional hint="400–1600">
              <Input value={sat} onChange={setSat} type="number" placeholder="1420" />
            </Field>
            <Field label="ACT composite" optional hint="1–36">
              <Input value={act} onChange={setAct} type="number" placeholder="31" />
            </Field>
          </div>

          {/* The thing most likely to make a good student give up on the form. */}
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-hairline bg-tint px-4 py-3 text-[13px] leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-500" />
            <span className="text-ink-soft">
              If you have no class rank or have not sat a test, leave those blank. That
              criterion is left out of your score rather than counted as nought — you are
              not penalised for what your school does not publish.
            </span>
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="College or university" optional>
              <Input value={college} onChange={setCollege} placeholder="The University of Texas at Austin" />
            </Field>
            <Field label="Intended major" optional>
              <Input value={major} onChange={setMajor} placeholder="Biomedical Engineering" />
            </Field>
          </div>
        </Block>

        <Block
          title="Community service"
          blurb={`One of the four things the committee weighs. ${programme.serviceHoursForFull} hours scores full marks.`}
        >
          <Field label="Hours" hint="Across your high school years">
            <Input value={hours} onChange={setHours} type="number" placeholder="150" />
          </Field>
          <Field label="What you did" className="mt-3">
            <textarea
              value={service}
              onChange={(e) => setService(e.target.value)}
              rows={3}
              placeholder="Four years with the temple annadanam, tutoring Sunday school students, and a summer at the Pearland food pantry."
              className="w-full rounded-[10px] border border-line bg-card px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-400"
            />
          </Field>
          <Field label="Anything at the temple" optional className="mt-3">
            <textarea
              value={temple}
              onChange={(e) => setTemple(e.target.value)}
              rows={2}
              placeholder="Purna Vidya student, festival volunteer since ninth grade."
              className="w-full rounded-[10px] border border-line bg-card px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-400"
            />
          </Field>
        </Block>

        <Block
          title="Your statement"
          blurb="In your own words. The committee reads every one of these."
        >
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={7}
            placeholder="What the temple and this community have meant to you, what you hope to study, and what you would like to do with it."
            className="w-full rounded-[10px] border border-line bg-card px-3 py-2 text-[14px] leading-relaxed text-ink outline-none focus:border-brand-400"
          />
          <p className="mt-1 text-[12px] text-muted">
            {statement.trim().length} characters · at least 50
          </p>
        </Block>

        <Block
          title="A member who knows you"
          blurb={
            programme.requireMemberReference
              ? 'Required. Give the membership number of a temple member who knows you or your family.'
              : 'Optional, but it helps the committee place you. Give the membership number of a member who knows you or your family.'
          }
        >
          <Field label="Membership number" optional={!programme.requireMemberReference}>
            <Input
              value={memberNumber}
              onChange={(v) => setMemberNumber(v.toUpperCase())}
              placeholder="MTS-0001"
              className="font-mono"
            />
          </Field>
        </Block>

        <Block title="Sign and send">
          <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--color-brand-500)]"
            />
            <span className="text-ink-soft">
              Everything I have given above is true and matches my school records. I
              understand the committee may ask my school to confirm it.
            </span>
          </label>

          <Field label="Type your name to sign" className="mt-3">
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={name || 'Your full name'}
              className="h-11 w-full rounded-[10px] border border-line bg-card px-3 font-serif text-[17px] text-ink outline-none focus:border-brand-400"
            />
          </Field>

          {error ? (
            <p className="mt-3 flex items-start gap-2 text-[13px] text-brand-600">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={submit} disabled={!canSubmit}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            Submit my application
          </Button>
          <p className="mt-2 text-[12.5px] text-muted">
            You can only apply once for {programme.year}. We will email you a copy
            straight away.
          </p>
        </Block>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- submitted */

function Submitted({
  result,
  programme,
}: {
  result: ScholarshipSubmitResult
  programme: ScholarshipProgramme
}) {
  const a = result.application
  return (
    <div className="mx-auto max-w-[620px]">
      <Card className="px-6 py-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-leaf-500/12 text-leaf-600">
          <Check className="size-6" />
        </span>
        <h1 className="mt-4 font-serif text-[23px] leading-tight text-ink">
          Your application is in
        </h1>
        <p className="mx-auto mt-2 max-w-[46ch] text-[14px] leading-relaxed text-muted">
          Your reference is <strong className="text-ink">{a.reference}</strong>. The
          committee reads every application after the closing date on{' '}
          {fmtDate(programme.closesAt, 'd MMMM yyyy')} and will write to you either way.
        </p>

        <div className="mt-5 rounded-[10px] border border-hairline bg-tint px-4 py-3 text-left text-[13px]">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Mail className="size-4 text-brand-500" />
            Two emails have gone out
          </p>
          <ul className="mt-1.5 space-y-1 text-muted">
            <li>
              A copy to you at <strong className="text-ink-soft">{a.studentEmail}</strong>
              {result.notified.student ? '' : ' — this one did not send, ring the office'}
            </li>
            <li>
              A notice to the scholarship committee
              {result.notified.office ? '' : ' — this one did not send, ring the office'}
            </li>
          </ul>
          {result.notified.studentPreview || result.notified.officePreview ? (
            <p className="mt-2 flex flex-wrap gap-3 text-[12px]">
              {result.notified.studentPreview ? (
                <a
                  href={result.notified.studentPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-600 underline-offset-2 hover:underline"
                >
                  Read your copy (dev)
                </a>
              ) : null}
              {result.notified.officePreview ? (
                <a
                  href={result.notified.officePreview}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand-600 underline-offset-2 hover:underline"
                >
                  Read the committee copy (dev)
                </a>
              ) : null}
            </p>
          ) : null}
        </div>

        {/* The gaps are repeated back, so nothing about the application is a surprise
            later — but the score itself is not, for the reason in the file header. */}
        {a.score.missing.length > 0 ? (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-hairline bg-card px-4 py-3 text-left text-[13px] leading-relaxed text-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-500" />
            <span>
              You left {a.score.missing.join(' and ').toLowerCase()} blank. Those were
              left out of your assessment rather than counted against you. If you can
              supply them before the closing date, ring the office on 281-489-0358.
            </span>
          </p>
        ) : null}

        <Link to="/scholarship" className={cn(buttonVariants({ variant: 'outline' }), 'mt-5')}>
          Back to scholarships
        </Link>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------- bits */

const Block = ({
  title,
  blurb,
  children,
}: {
  title: string
  blurb?: string
  children: React.ReactNode
}) => (
  <Card className="p-5">
    <h2 className="font-serif text-[19px] leading-tight text-ink">{title}</h2>
    {blurb ? <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{blurb}</p> : null}
    <div className="mt-3">{children}</div>
  </Card>
)

const Field = ({
  label,
  hint,
  optional,
  className,
  children,
}: {
  label: string
  hint?: string
  optional?: boolean
  className?: string
  children: React.ReactNode
}) => (
  <label className={cn('block', className)}>
    <span className="mb-1 block text-[13px] font-semibold text-ink">
      {label}
      {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
    </span>
    {children}
    {hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
  </label>
)

const Input = ({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      'h-10 w-full rounded-[10px] border border-line bg-card px-3 text-[14px] text-ink outline-none transition-colors focus:border-brand-400',
      className,
    )}
    {...rest}
  />
)
