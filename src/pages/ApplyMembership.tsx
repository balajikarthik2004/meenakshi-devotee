import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Check, Loader2, Mail, Plus, Trash2 } from 'lucide-react'
import type {
  MembershipApplication,
  MembershipPolicy,
  Nominee,
  ReferenceCheck,
  SubmitResult,
} from '@/lib/data/membershipApi'
import {
  checkReference,
  isOffline,
  listPolicies,
  submitApplication,
} from '@/lib/data/membershipApi'
import { PageHeader } from '@/components/layout/layouts'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store/auth'
import { cn, fmtDate } from '@/lib/utils'

/**
 * Applying for membership.
 *
 * One page, four blocks, one submit. The temple's process is "fill in a form, the
 * office decides", and a seven-step wizard would be describing a process nobody runs —
 * worse, it would hide from the applicant how much they are actually being asked for.
 *
 * ## The two things worth noticing
 *
 * **Member numbers are checked as they are typed**, against the server. Three of the
 * four ways a reference can be wrong are fixable while the applicant is still looking
 * at the form — a typo, a member whose own renewal has lapsed, the same person entered
 * twice — and finding out a week later by email is how an application takes a month.
 * The browser is never handed the member roll, so the check cannot be skipped by
 * editing the page.
 *
 * **A failed reference does not block submission.** It is flagged, shown to the
 * applicant in their receipt, and flagged again to the office. The office decides.
 * A form that refuses to send because a referee's membership lapsed yesterday has not
 * solved the problem, it has moved it onto the telephone.
 */

export default function ApplyMembership() {
  const user = useAuthStore((s) => s.user)
  const [params] = useSearchParams()

  /**
   * The rate the devotee picked on the membership page, if they came from there.
   *
   * `normal` and `senior` are two prices for one membership, not two categories — the
   * senior figure is an age concession and the benefits are identical. So this does not
   * choose a different application; it is carried through so the form can acknowledge
   * what they clicked and confirm the concession is noted. Dropping it silently would
   * make the devotee who deliberately chose the senior rate wonder whether it took.
   */
  const rate = params.get('tier') === 'senior' ? 'senior' : null

  const [policies, setPolicies] = useState<MembershipPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [done, setDone] = useState<SubmitResult | null>(null)

  const [category, setCategory] = useState('primary')
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [dob, setDob] = useState(user?.dob?.slice(0, 10) ?? '')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('TX')
  const [postcode, setPostcode] = useState('')
  const [gothram, setGothram] = useState('')
  const [nakshatram, setNakshatram] = useState('')
  const [note, setNote] = useState('')
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [nominees, setNominees] = useState<Nominee[]>([{ name: '', relationship: '' }])
  const [numbers, setNumbers] = useState<string[]>([''])
  const [checks, setChecks] = useState<Record<number, ReferenceCheck | 'checking'>>({})

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const policy = policies.find((p) => p.category === category)

  useEffect(() => {
    listPolicies()
      .then((p) => {
        setPolicies(p)
        if (p[0]) setCategory(p[0].category)
        // Open with as many reference boxes as the policy asks for, so the applicant
        // sees the real ask rather than discovering it one "add another" at a time.
        setNumbers(Array.from({ length: Math.max(1, p[0]?.requiredSponsors ?? 1) }, () => ''))
      })
      .catch((e) => setOffline(isOffline(e)))
      .finally(() => setLoading(false))
  }, [])

  /**
   * Each number is checked against the roll, debounced, as it is typed.
   *
   * Two details that are easy to get wrong and were:
   *
   * **A duplicate is only a duplicate against the boxes above it.** Passing every
   * *other* box meant that entering the same number three times flagged all three, so
   * the applicant saw three identical errors and nothing telling them which one to
   * keep. Comparing only against earlier rows accepts the first and flags the rest,
   * which is the answer they can act on.
   *
   * **Nothing is checked until the number looks finished.** `MTS-00` is somebody
   * halfway through typing, not a mistake, and answering it with "no member holds that
   * number" is the form shouting at them for being slow.
   */
  useEffect(() => {
    const looksComplete = (v: string) => /^[A-Z]{2,5}-?\d{3,}$/i.test(v)

    const timers = numbers.map((value, i) => {
      const v = value.trim()
      if (!looksComplete(v)) {
        setChecks((c) => {
          const next = { ...c }
          delete next[i]
          return next
        })
        return null
      }
      setChecks((c) => ({ ...c, [i]: 'checking' }))
      return setTimeout(async () => {
        try {
          const res = await checkReference({
            memberNumber: v,
            category,
            applicantEmail: email || undefined,
            // Earlier rows only — see the note above.
            existing: numbers
              .slice(0, i)
              .map((x) => x.trim())
              .filter(Boolean),
          })
          setChecks((c) => ({ ...c, [i]: res }))
        } catch {
          setChecks((c) => {
            const next = { ...c }
            delete next[i]
            return next
          })
        }
      }, 400)
    })
    return () => timers.forEach((t) => t && clearTimeout(t))
  }, [numbers, category, email])

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      setDone(
        await submitApplication({
          category,
          applicantName: name.trim(),
          applicantEmail: email.trim(),
          applicantPhone: phone.trim() || undefined,
          dob: dob || undefined,
          addressLine1: line1.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postcode: postcode.trim() || undefined,
          gothram: gothram.trim() || undefined,
          nakshatram: nakshatram.trim() || undefined,
          nominees: nominees.filter((n) => n.name.trim() && n.relationship.trim()),
          memberNumbers: numbers.map((n) => n.trim()).filter(Boolean),
          note:
            [note.trim(), rate === 'senior' ? 'Applicant selected the senior rate.' : '']
              .filter(Boolean)
              .join(' ') || undefined,
          signature: signature.trim(),
        }),
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Your application could not be sent. Please try again.',
      )
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

  if (offline) {
    return (
      <>
        <PageHeader title="Apply for membership" subtitle="Join the Sri Meenakshi Temple Society" />
        <Card className="flex items-start gap-3 p-6">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-saffron-600" />
          <div>
            <p className="font-semibold text-ink">The membership service is not running</p>
            <p className="mt-1 text-[14px] text-muted">
              Start it with <code className="rounded bg-tint px-1">npm run dev</code> in the
              backend folder, then reload.
            </p>
          </div>
        </Card>
      </>
    )
  }

  if (done) return <Submitted result={done} />

  const canSubmit =
    name.trim().length > 1 &&
    email.includes('@') &&
    signature.trim().length > 2 &&
    agreed &&
    !busy

  return (
    <>
      <PageHeader
        title="Apply for membership"
        subtitle="Join the Sri Meenakshi Temple Society"
      />

      <div className="mx-auto max-w-[720px] space-y-5">
        {/* -------------------------------------------------- the membership */}
        <Block title="The membership">
          <Field label="Which membership">
            <select
              value={category}
              onChange={(e) => {
                const next = e.target.value
                setCategory(next)
                const p = policies.find((x) => x.category === next)
                setNumbers(Array.from({ length: Math.max(1, p?.requiredSponsors ?? 1) }, () => ''))
                setChecks({})
              }}
              className="h-10 w-full rounded-[10px] border border-line bg-card px-3 text-[14px] text-ink"
            >
              {policies.map((p) => (
                <option key={p.category} value={p.category}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          {rate === 'senior' ? (
            <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-leaf-500/30 bg-leaf-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-leaf-600">
              <Check className="mt-0.5 size-4 shrink-0" />
              <span>
                You chose the senior rate. Give your date of birth below and the temple
                office will apply the concession — the membership itself is the same.
              </span>
            </p>
          ) : null}

          {policy ? (
            <div className="mt-3 rounded-[10px] border border-hairline bg-tint px-4 py-3 text-[13px] leading-relaxed">
              <p className="text-ink-soft">{policy.description}</p>
              <p className="mt-2 font-semibold text-ink">
                Aged {policy.minAge}
                {policy.maxAge ? `–${policy.maxAge}` : ' and over'} · name{' '}
                {policy.requiredSponsors} existing member
                {policy.requiredSponsors === 1 ? '' : 's'}
              </p>
              {/* Stated plainly, because none of these figures is confirmed. */}
              {policy.provisional ? (
                <p className="mt-1.5 text-[12px] text-saffron-600">
                  These follow the temple's previously published form and are awaiting
                  confirmation by the office.
                </p>
              ) : null}
            </div>
          ) : null}
        </Block>

        {/* ------------------------------------------------------- about you */}
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
            <Field
              label="Date of birth"
              hint={
                rate === 'senior'
                  ? 'Required — the senior concession is checked against it'
                  : policy
                    ? `Must be ${policy.minAge} or over`
                    : undefined
              }
            >
              <Input value={dob} onChange={setDob} type="date" />
            </Field>
            <Field label="Address" optional className="sm:col-span-2">
              <Input value={line1} onChange={setLine1} placeholder="3100 Broadway St" />
            </Field>
            <Field label="City" optional>
              <Input value={city} onChange={setCity} />
            </Field>
            <Field label="State" optional>
              <Input value={state} onChange={setState} />
            </Field>
            <Field label="ZIP" optional>
              <Input value={postcode} onChange={setPostcode} />
            </Field>
            <Field label="Gothram" optional>
              <Input value={gothram} onChange={setGothram} />
            </Field>
            <Field label="Nakshatram" optional>
              <Input value={nakshatram} onChange={setNakshatram} />
            </Field>
          </div>
        </Block>

        {/* ---------------------------------------------------- the nominees */}
        <Block
          title="Who else should this cover?"
          blurb="A temple membership covers a household. Add your spouse and any children you would like included."
        >
          <div className="space-y-2">
            {nominees.map((n, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Field label={i === 0 ? 'Name' : ''} className="min-w-[180px] flex-1">
                  <Input
                    value={n.name}
                    onChange={(v) =>
                      setNominees((s) => s.map((x, j) => (j === i ? { ...x, name: v } : x)))
                    }
                    placeholder="Kannagi Adigal"
                  />
                </Field>
                <Field label={i === 0 ? 'Relationship' : ''} className="min-w-[150px] flex-1">
                  <Input
                    value={n.relationship}
                    onChange={(v) =>
                      setNominees((s) =>
                        s.map((x, j) => (j === i ? { ...x, relationship: v } : x)),
                      )
                    }
                    placeholder="Spouse"
                  />
                </Field>
                {nominees.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setNominees((s) => s.filter((_, j) => j !== i))}
                    aria-label="Remove"
                    className="mb-1 rounded-[8px] p-2 text-muted hover:bg-tint hover:text-brand-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setNominees((s) => [...s, { name: '', relationship: '' }])}
          >
            <Plus />
            Add another
          </Button>
        </Block>

        {/* --------------------------------------------------- the references */}
        <Block
          title="Existing members who know you"
          blurb={
            policy
              ? `Please name ${policy.requiredSponsors} current member${policy.requiredSponsors === 1 ? '' : 's'}. Enter their membership number — we will check it against the roll as you type.`
              : 'Enter their membership numbers.'
          }
        >
          <div className="space-y-3">
            {numbers.map((value, i) => {
              const check = checks[i]
              return (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={value}
                      onChange={(v) =>
                        setNumbers((s) => s.map((x, j) => (j === i ? v.toUpperCase() : x)))
                      }
                      placeholder="MTS-0001"
                      className="font-mono"
                    />
                    {numbers.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNumbers((s) => s.filter((_, j) => j !== i))
                          setChecks({})
                        }}
                        aria-label="Remove"
                        className="rounded-[8px] p-2 text-muted hover:bg-tint hover:text-brand-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>

                  {check === 'checking' ? (
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
                      <Loader2 className="size-3 animate-spin" />
                      Checking the roll…
                    </p>
                  ) : check ? (
                    <p
                      className={cn(
                        'mt-1 flex items-start gap-1.5 text-[12.5px] leading-relaxed',
                        check.ok ? 'text-leaf-600' : 'text-saffron-600',
                      )}
                    >
                      {check.ok ? (
                        <Check className="mt-0.5 size-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      )}
                      <span>
                        {check.ok ? (
                          <>
                            <strong>{check.name}</strong>
                            {check.memberSince
                              ? ` — a member since ${fmtDate(check.memberSince, 'MMMM yyyy')}`
                              : ''}
                          </>
                        ) : (
                          check.message
                        )}
                      </span>
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setNumbers((s) => [...s, ''])}
          >
            <Plus />
            Add another
          </Button>

          {/* The honest statement of what happens if one does not check out. */}
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            A number we cannot match will not stop you applying — it is passed to the
            temple office with your form, and they will follow it up.
          </p>
        </Block>

        {/* ------------------------------------------------------- the signing */}
        <Block title="Anything else, and your signature">
          <Field label="Anything the temple should know" optional>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="We have attended the Friday abhishekam since moving to Pearland in 2019."
              className="w-full rounded-[10px] border border-line bg-card px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-400"
            />
          </Field>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--color-brand-500)]"
            />
            <span className="text-ink-soft">
              The details above are true to the best of my knowledge, and I agree to abide
              by the rules of the Sri Meenakshi Temple Society.
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
            We will email you a copy straight away, and the temple office will write to
            you with their decision.
          </p>
        </Block>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- submitted */

/**
 * The receipt.
 *
 * Leads with the reference number, because that is the thing they will be asked for.
 * Repeats back what was actually sent — including any member number that did not
 * check out — so nothing about the application is a surprise later.
 */
function Submitted({ result }: { result: SubmitResult }) {
  const a: MembershipApplication = result.application
  const unmatched = a.references.filter((r) => !r.verified)

  return (
    <div className="mx-auto max-w-[620px]">
      <Card className="px-6 py-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-leaf-500/12 text-leaf-600">
          <Check className="size-6" />
        </span>
        <h1 className="mt-4 font-serif text-[23px] leading-tight text-ink">
          Your application is with the temple office
        </h1>
        <p className="mx-auto mt-2 max-w-[46ch] text-[14px] leading-relaxed text-muted">
          Your reference is <strong className="text-ink">{a.reference}</strong>. Please
          quote it if you contact the office.
        </p>

        <div className="mt-5 rounded-[10px] border border-hairline bg-tint px-4 py-3 text-left text-[13px]">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Mail className="size-4 text-brand-500" />
            Two emails have gone out
          </p>
          <ul className="mt-1.5 space-y-1 text-muted">
            <li>
              A copy to you at <strong className="text-ink-soft">{a.applicantEmail}</strong>
              {result.notified.applicant ? '' : ' — this one did not send, ring the office'}
            </li>
            <li>
              A notice to the temple office
              {result.notified.office ? '' : ' — this one did not send, ring the office'}
            </li>
          </ul>
          {/* Development only: no real SMTP configured, so the messages went to a test
              inbox and these let you read exactly what was sent. */}
          {result.notified.applicantPreview || result.notified.officePreview ? (
            <p className="mt-2 flex flex-wrap gap-3 text-[12px]">
              {result.notified.applicantPreview ? (
                <a
                  href={result.notified.applicantPreview}
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
                  Read the office copy (dev)
                </a>
              ) : null}
            </p>
          ) : null}
        </div>

        {unmatched.length > 0 ? (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-saffron-500/30 bg-saffron-500/[0.07] px-4 py-3 text-left text-[13px] leading-relaxed text-saffron-600">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              We could not match {unmatched.map((r) => r.memberNumber).join(', ')}. The
              office has been told and will follow it up — there is nothing you need to do.
            </span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/dashboard" className={buttonVariants({ variant: 'outline' })}>
            Back to my dashboard
          </Link>
        </div>
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
    {label ? (
      <span className="mb-1 block text-[13px] font-semibold text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
      </span>
    ) : null}
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
