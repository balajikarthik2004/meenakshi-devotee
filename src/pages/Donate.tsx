import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarCheck2, CalendarDays, HandCoins, Loader2, UserRound } from 'lucide-react'
import type {
  Cadence,
  Donation,
  DonationCategory,
  Pledge,
  PledgeCadence,
  Project,
  TempleEvent,
} from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { GuestDonorForm } from '@/components/shared/GuestDonorForm'
import { AmountPresets } from '@/components/shared/AmountPresets'
import { BreakEvenMeter } from '@/components/shared/BreakEvenMeter'
import { PaymentMethodPicker } from '@/components/shared/PaymentMethodPicker'
import { MockSuccessScreen } from '@/components/shared/MockSuccessScreen'
import { ChequeInstructions } from '@/components/shared/ChequeInstructions'
import { TaxReceiptPreview } from '@/components/shared/TaxReceiptPreview'
import { PledgeSchedule } from '@/components/shared/PledgeSchedule'
import { ProjectMoneyFlow } from '@/components/shared/ProjectMoneyFlow'
import { LoadingSkeleton } from '@/components/shared/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, Field, Input, Radio } from '@/components/ui/input'
import { DONATION_CATEGORIES } from '@/lib/data/mock'
import { createDonation, createPledge, listEvents, listProjects } from '@/lib/data/api'
import type { DonorIdentity } from '@/lib/donor'
import { signUpHrefFor, useDonorIdentity } from '@/lib/donor'
import { useGuestDonorStore } from '@/lib/store/guest'
import { useAsync } from '@/lib/hooks'
import { isOpenForDonations, stillToRaise } from '@/lib/project'
import {
  MAX_INSTALLMENTS,
  PLEDGE_CADENCES,
  buildSchedule,
  dateInputToISO,
  earliestStart,
  isoToDateInput,
  startDatePresets,
} from '@/lib/pledge'
import { cn, fmtDate, money, titleCase } from '@/lib/utils'

const CADENCES: Cadence[] = ['monthly', 'quarterly', 'yearly']

/**
 * The three things a devotee can do with a gift, as one choice.
 *
 * "Recurring" and "Pledge" look similar and are not: a recurring gift is money that
 * leaves today and keeps leaving, and a pledge is money that leaves on a date in the
 * future and nothing today. Putting them in the same radio group is what makes the
 * difference visible — the devotee picks between them rather than discovering, after
 * paying, that they chose the other one.
 */
const GIVING_MODES = [
  { key: 'once', label: 'One-time donation', blurb: 'Paid now, in full.' },
  { key: 'recurring', label: 'Recurring donation', blurb: 'Paid now, then repeats.' },
  {
    key: 'pledge',
    label: 'Pledge for later',
    blurb: 'Nothing is charged today. You promise a date.',
  },
] as const

type GivingMode = (typeof GIVING_MODES)[number]['key']

/** Default instalment counts — a full year of whichever period was chosen. */
const DEFAULT_COUNT: Record<PledgeCadence, number> = {
  'one-time': 1,
  monthly: 12,
  quarterly: 4,
  yearly: 3,
}

/**
 * The donation screen is reachable without an account.
 *
 * A visitor who clicks Donate on the public site used to be redirected to sign-in, which
 * asked them to do a second, unrelated thing before the one they came for. Instead the
 * gate takes the four details a receipt actually needs and hands straight over to the
 * form below — same URL, so a `?category=event&event=…` link from a festival page
 * survives the detour intact.
 */
export default function Donate() {
  const identity = useDonorIdentity()
  const setContact = useGuestDonorStore((s) => s.setContact)

  if (!identity) return <GuestDonorForm onReady={setContact} />
  return <DonateForm identity={identity} />
}

function DonateForm({ identity }: { identity: DonorIdentity }) {
  const [params] = useSearchParams()
  const clearContact = useGuestDonorStore((s) => s.clearContact)

  const [category, setCategory] = useState<DonationCategory>(
    (params.get('category') as DonationCategory) ?? 'general-hundi',
  )
  const [amount, setAmount] = useState(Number(params.get('amount')) || 108)
  const [mode, setMode] = useState<GivingMode>(params.get('mode') === 'pledge' ? 'pledge' : 'once')
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [dedication, setDedication] = useState(params.get('dedicate') ?? '')
  const [method, setMethod] = useState<Donation['paymentMethod']>('card')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Donation | null>(null)

  const recurring = mode === 'recurring'

  /* ---------------------------------------------------------------- pledge state */

  const isPledge = mode === 'pledge'
  const [pledgeCadence, setPledgeCadence] = useState<PledgeCadence>('one-time')
  const [count, setCount] = useState(1)
  const [startDate, setStartDate] = useState(() => isoToDateInput(earliestStart().toISOString()))
  const [note, setNote] = useState('')
  const [pledged, setPledged] = useState<Pledge | null>(null)

  const presets = useMemo(() => startDatePresets(), [])
  const minDate = useMemo(() => isoToDateInput(earliestStart().toISOString()), [])

  /** Changing the period changes what a sensible number of instalments is. */
  const chooseCadence = (c: PledgeCadence) => {
    setPledgeCadence(c)
    setCount(DEFAULT_COUNT[c])
  }

  // The schedule is derived, never held in state: a date the devotee corrects has to
  // move every row under it, and a stored copy is one more thing that can be stale.
  const schedule = useMemo(
    () =>
      buildSchedule('preview', {
        startDate: dateInputToISO(startDate),
        amount,
        cadence: pledgeCadence,
        count,
      }),
    [startDate, amount, pledgeCadence, count],
  )

  const pledgeTotal = schedule.reduce((s, i) => s + i.amount, 0)

  /** A pledge dated today is simply a gift, so the gate is the date, not the amount. */
  const startIsValid = dateInputToISO(startDate) >= dateInputToISO(minDate)

  /* --------------------------------------------------- event sponsorship state */

  const isEvent = category === 'event'

  // Only fetched once the devotee actually asks for the event fund — the other seven
  // categories have no reason to pay for this list.
  const { data: events, loading: eventsLoading } = useAsync(
    async () => (isEvent ? (await listEvents()).filter((e) => e.status !== 'completed') : []),
    [isEvent],
  )

  const [eventId, setEventId] = useState<string | null>(params.get('event'))
  const [picked, setPicked] = useState<string[]>([])
  const [topUp, setTopUp] = useState(0)

  const selectedEvent: TempleEvent | undefined = useMemo(
    () => events?.find((e) => e.id === eventId),
    [events, eventId],
  )

  // A festival falls on one fixed date. A monthly-repeating sponsorship of it is
  // incoherent, and so is a promise to sponsor it after it has happened — so the event
  // fund takes one-time gifts only, and the whole frequency block is withheld.
  useEffect(() => {
    if (isEvent) setMode('once')
  }, [isEvent])

  // Items belong to the event that offers them; switching festivals clears the ticks
  // rather than carrying "Flowers & garlands" over at the wrong price.
  const chooseEvent = (id: string) => {
    setEventId(id)
    setPicked([])
  }

  const toggleItem = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]))

  const chosen = selectedEvent?.sponsorships.filter((o) => picked.includes(o.key)) ?? []
  const itemsSubtotal = chosen.reduce((s, o) => s + o.price, 0)

  /* ------------------------------------------------------ capital project state */

  const isProject = category === 'project'

  // Same reasoning as the event list above: the other funds have no use for this.
  const { data: projects, loading: projectsLoading } = useAsync(
    async () => (isProject ? (await listProjects()).filter(isOpenForDonations) : []),
    [isProject],
  )

  const [projectId, setProjectId] = useState<string | null>(params.get('project'))

  const selectedProject: Project | undefined = useMemo(
    () => projects?.find((p) => p.id === projectId),
    [projects, projectId],
  )

  /** What the devotee actually pays — items plus top-up for an event, else the preset. */
  const total = isEvent ? itemsSubtotal + topUp : amount

  const signUpHref = signUpHrefFor(identity.contact)

  /**
   * Records the promise. No payment is taken and no receipt is issued — that is the
   * whole difference from `give` below, and the reason the two are separate calls.
   */
  const pledge = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 800))
    const p = await createPledge({
      userId: identity.userId,
      donor: identity.isGuest ? identity.contact : undefined,
      category,
      projectId: isProject && selectedProject ? selectedProject.id : undefined,
      amount,
      cadence: pledgeCadence,
      startDate: dateInputToISO(startDate),
      count,
      dedicatedTo: dedication.trim() || undefined,
      intendedMethod: method,
      note: note.trim() || undefined,
    })
    setBusy(false)
    setPledged(p)
  }

  const give = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 800))
    const d = await createDonation({
      // A guest has no record to hang the gift on, so their details travel with it —
      // that is what lets `listDonationsFor` hand it back on a later visit.
      userId: identity.userId,
      donor: identity.isGuest ? identity.contact : undefined,
      category,
      amount: total,
      isRecurring: recurring,
      recurringCadence: recurring ? cadence : undefined,
      paymentMethod: method,
      dedicatedTo: dedication.trim() || undefined,
      eventId: isEvent && selectedEvent ? selectedEvent.id : undefined,
      eventItems: isEvent && chosen.length ? chosen.map((o) => o.label) : undefined,
      projectId: isProject && selectedProject ? selectedProject.id : undefined,
    })
    setBusy(false)
    setDone(d)
  }

  /**
   * The pledge receipt — which is not a receipt, and says so.
   *
   * Deliberately missing from this screen: `TaxReceiptPreview`. A promise is not a
   * deductible contribution until it is paid, and a 501(c)(3) acknowledgement printed
   * today for money that arrives next June would misstate the devotee's own return.
   * What goes in its place is the schedule and a plain line about when receipts come.
   */
  if (pledged) {
    const total = pledged.installments.reduce((s, i) => s + i.amount, 0)
    const first = pledged.installments[0]!

    return (
      <MockSuccessScreen
        title="Your pledge is recorded"
        subtitle={`${money(total)} promised to the ${titleCase(pledged.category)} fund. Nothing has been charged today.`}
        referenceLabel="Pledge"
        reference={pledged.id}
        rows={[
          { label: 'Fund', value: titleCase(pledged.category) },
          ...(selectedProject ? [{ label: 'Project', value: selectedProject.title }] : []),
          { label: 'Total pledged', value: money(total) },
          {
            label: 'Schedule',
            value:
              pledged.cadence === 'one-time'
                ? `A single payment of ${money(pledged.amount)}`
                : `${pledged.installments.length} ${pledged.cadence} payments of ${money(pledged.amount)}`,
          },
          { label: 'First payment due', value: fmtDate(first.dueDate, 'EEEE, MMMM d, yyyy') },
          { label: 'Paying by', value: titleCase(pledged.intendedMethod) },
          { label: 'Charged today', value: money(0) },
          ...(pledged.dedicatedTo ? [{ label: 'Dedicated to', value: pledged.dedicatedTo }] : []),
          ...(pledged.note ? [{ label: 'Your note', value: pledged.note }] : []),
        ]}
        emailSubject={`Your ${money(total)} pledge to Sri Meenakshi Temple Society`}
        emailBody={
          <>
            <p>Dear {identity.name},</p>
            <p className="mt-2">
              Thank you for pledging <strong>{money(total)}</strong> to the{' '}
              {titleCase(pledged.category)} fund. The first payment of{' '}
              <strong>{money(first.amount)}</strong> falls due on{' '}
              {fmtDate(first.dueDate, 'MMMM d, yyyy')}. Nothing has been charged today.
            </p>
            <p className="mt-2">
              You can pay each instalment early, or cancel what is still outstanding, from{' '}
              <strong>My pledges</strong> at any time. A 501(c)(3) tax receipt is issued for each
              payment as it arrives — a pledge itself is not deductible until it is paid.
            </p>
            {pledged.dedicatedTo ? (
              <p className="mt-2">
                This pledge was dedicated: <em>{pledged.dedicatedTo}</em>.
              </p>
            ) : null}
          </>
        }
        extra={
          <>
            <Card className="p-5">
              <h3 className="font-serif text-[18px]">Your payment schedule</h3>
              <PledgeSchedule installments={pledged.installments} className="mt-2" />
              <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
                Each payment earns its own 501(c)(3) receipt when it arrives. The pledge itself is
                not a deductible contribution until it is paid.
              </p>
            </Card>
            {pledged.intendedMethod === 'check' ? (
              <ChequeInstructions reference={pledged.id} />
            ) : null}
          </>
        }
        actions={
          <>
            <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
              Back to the temple site
            </Link>
            {identity.isGuest ? (
              <Link to={signUpHref} className={buttonVariants({ variant: 'outline' })}>
                Create my account
              </Link>
            ) : null}
            <Link to="/my/pledges" className={buttonVariants({})}>
              My pledges
            </Link>
          </>
        }
      />
    )
  }

  if (done) {
    return (
      <MockSuccessScreen
        title={
          done.paymentMethod === 'check' ? 'Your pledge is recorded' : 'Thank you for your offering'
        }
        subtitle={`${money(done.amount)} to the ${titleCase(done.category)} fund${
          done.isRecurring ? `, repeating ${done.recurringCadence}` : ''
        }.`}
        referenceLabel="Donation"
        reference={done.id}
        rows={[
          { label: 'Fund', value: titleCase(done.category) },
          ...(selectedProject ? [{ label: 'Project', value: selectedProject.title }] : []),
          ...(selectedEvent
            ? [
                { label: 'Festival', value: selectedEvent.title },
                {
                  label: 'Festival date',
                  value: fmtDate(selectedEvent.date, 'EEEE, MMMM d, yyyy'),
                },
              ]
            : []),
          ...(done.eventItems?.length
            ? [{ label: 'Sponsoring', value: done.eventItems.join(', ') }]
            : []),
          ...(topUp > 0 && isEvent ? [{ label: 'Additional gift', value: money(topUp) }] : []),
          { label: 'Amount', value: money(done.amount) },
          {
            label: 'Frequency',
            value: done.isRecurring
              ? `Recurring · ${titleCase(done.recurringCadence!)}`
              : 'One-time',
          },
          { label: 'Method', value: titleCase(done.paymentMethod) },
          ...(done.dedicatedTo ? [{ label: 'Dedicated to', value: done.dedicatedTo }] : []),
        ]}
        emailSubject={`Your ${money(done.amount)} Donation to Sri Meenakshi Temple Society`}
        emailBody={
          <>
            <p>Dear {identity.name},</p>
            <p className="mt-2">
              Thank you for your Donation of <strong>{money(done.amount)}</strong> to the{' '}
              {titleCase(done.category)} fund. Your official contribution statement is attached
              below and will also appear in your {new Date().getFullYear()} annual summary.
            </p>
            {done.paymentMethod === 'check' ? (
              <p className="mt-2">
                Please make the cheque payable to <strong>Sri Meenakshi Temple Society</strong> and
                write <strong>{done.id}</strong> on the memo line. Your receipt is issued once it
                clears.
              </p>
            ) : null}
            {selectedEvent ? (
              <p className="mt-2">
                Your gift sponsors <strong>{selectedEvent.title}</strong> on{' '}
                {fmtDate(selectedEvent.date, 'MMMM d, yyyy')}
                {done.eventItems?.length ? <> — {done.eventItems.join(', ')}</> : null}. Your name
                will be read in the sankalpam on the day.
              </p>
            ) : null}
            {done.dedicatedTo ? (
              <p className="mt-2">
                This Donation was dedicated: <em>{done.dedicatedTo}</em>.
              </p>
            ) : null}
          </>
        }
        extra={
          <>
            {done.paymentMethod === 'check' ? (
              <ChequeInstructions reference={done.id} className="mb-5" />
            ) : null}
            <TaxReceiptPreview
              donorName={identity.name}
              donorAddress={identity.address}
              receiptNo={done.taxReceiptId ?? done.id}
              lines={[
                {
                  date: done.createdAt,
                  description: selectedEvent
                    ? `${selectedEvent.title} sponsorship${
                        done.eventItems?.length ? ` — ${done.eventItems.join(', ')}` : ''
                      }`
                    : `${titleCase(done.category)} donation${
                        done.dedicatedTo ? ` — ${done.dedicatedTo}` : ''
                      }`,
                  amount: done.amount,
                },
              ]}
            />
          </>
        }
        actions={
          identity.isGuest ? (
            // A guest has no dashboard to go back to. What they are offered instead is
            // the gift they just made, and the one step that turns four typed fields
            // into a real record — pre-filled, so it costs them nothing to accept.
            <>
              <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
                Back to the temple site
              </Link>
              <Link to="/my/donations" className={buttonVariants({ variant: 'outline' })}>
                My giving
              </Link>
              <Link to={signUpHref} className={buttonVariants({})}>
                Create my account
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className={buttonVariants({ variant: 'ghost' })}>
                Back to dashboard
              </Link>
              <Link to="/my/donations" className={buttonVariants({})}>
                My donations
              </Link>
            </>
          )
        }
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Make a donation"
        subtitle="Choose where your Donation goes. Every fund is reported separately in the annual statement."
      />

      {/* A guest gave their details at the gate and is not asked again — but they can
          still see whose name the receipt will carry, and correct it. Without this the
          details vanish the moment they are accepted, which is exactly when a typo in
          an email address becomes expensive. */}
      {identity.isGuest ? (
        <Card className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3.5">
          <UserRound className="size-4 shrink-0 text-brand-500" />
          <p className="min-w-0 text-[13px]">
            <span className="text-muted">Giving as</span>{' '}
            <span className="font-medium text-ink">{identity.name}</span>{' '}
            <span className="text-muted">· {identity.contact.email}</span>
          </p>
          <button
            type="button"
            onClick={clearContact}
            className="ml-auto text-[13px] font-medium text-brand-500 hover:underline"
          >
            Not you? Change details
          </button>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-serif text-[18px]">Where would you like to give?</h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {DONATION_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={category === c.key}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    'rounded-[10px] border p-3.5 text-left transition-colors active:scale-[.99]',
                    category === c.key
                      ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                      : 'border-line bg-card hover:border-brand-300',
                  )}
                >
                  <span className="block text-[14px] font-medium text-ink">{c.label}</span>
                  <span className="block text-[12.5px] text-muted">{c.blurb}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Two of the funds need to know *which* one — a festival, or a building.
              The project picker leads with each project's funding bar, because "which
              of these most needs me" is the actual question a devotee is answering
              here, and a list of titles cannot answer it. */}
          {isProject ? (
            <Card className="p-5">
              <h2 className="font-serif text-[18px]">Which project?</h2>
              <p className="mt-1 text-[13px] text-muted">
                Your gift is restricted to the project you choose. Every project publishes what it
                has raised and what it has spent.
              </p>

              {projectsLoading ? (
                <LoadingSkeleton variant="tiles" rows={3} className="mt-3" />
              ) : projects && projects.length > 0 ? (
                <div className="mt-3 space-y-2.5">
                  {(selectedProject ? [selectedProject] : projects).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={projectId === p.id}
                      onClick={() => setProjectId(p.id)}
                      className={cn(
                        'block w-full rounded-[10px] border p-3.5 text-left transition-colors active:scale-[.99]',
                        projectId === p.id
                          ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                          : 'border-line bg-card hover:border-brand-300',
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-[14px] font-medium text-ink">{p.title}</span>
                        <span className="text-[12.5px] text-muted">
                          {money(stillToRaise(p))} still needed
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{p.summary}</p>
                      <ProjectMoneyFlow project={p} compact className="mt-2.5" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[13.5px] text-muted">
                  No projects are open for giving right now. Please pick another fund.
                </p>
              )}

              {selectedProject ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    onClick={() => setProjectId(null)}
                    className="text-[13px] font-medium text-brand-500 hover:underline"
                  >
                    Choose a different project
                  </button>
                  <Link
                    to={`/projects/${selectedProject.slug}`}
                    className="text-[13px] font-medium text-brand-500 hover:underline"
                  >
                    See where this project’s money has gone
                  </Link>
                </div>
              ) : null}
            </Card>
          ) : null}

          {/* The event fund is the one category that needs to know *which* event. Everything
              below appears only once "Event Sponsorship" is the chosen fund. */}
          {isEvent ? (
            <Card className="p-5">
              <h2 className="font-serif text-[18px]">Which festival?</h2>
              <p className="mt-1 text-[13px] text-muted">
                Upcoming festivals still raising toward their published target.
              </p>

              {eventsLoading ? (
                <LoadingSkeleton variant="tiles" rows={3} className="mt-3" />
              ) : events && events.length > 0 ? (
                // The temple year runs to eighteen festivals. Listing them all above the
                // sponsorship checkboxes buried the actual task under a page of scrolling,
                // so the list caps its height until a choice is made and collapses to the
                // chosen festival after.
                <div
                  className={cn(
                    'mt-3 space-y-2.5',
                    !selectedEvent && 'max-h-[22rem] overflow-y-auto pr-1',
                  )}
                >
                  {(selectedEvent ? [selectedEvent] : events).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      aria-pressed={eventId === e.id}
                      onClick={() => chooseEvent(e.id)}
                      className={cn(
                        'block w-full rounded-[10px] border p-3.5 text-left transition-colors active:scale-[.99]',
                        eventId === e.id
                          ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                          : 'border-line bg-card hover:border-brand-300',
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-[14px] font-medium text-ink">{e.title}</span>
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                          <CalendarDays className="size-3.5" />
                          {fmtDate(e.date, 'MMM d, yyyy')}
                        </span>
                      </div>
                      <BreakEvenMeter
                        target={e.targetAmount}
                        collected={e.collectedAmount}
                        label=""
                        compact
                        className="mt-2"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[13.5px] text-muted">
                  No festivals are open for sponsorship right now. Please pick another fund.
                </p>
              )}

              {selectedEvent ? (
                <button
                  type="button"
                  onClick={() => chooseEvent('')}
                  className="mt-2.5 text-[13px] font-medium text-brand-500 hover:underline"
                >
                  Choose a different festival
                </button>
              ) : null}
            </Card>
          ) : null}

          {isEvent && selectedEvent ? (
            <Card className="p-5">
              <h2 className="font-serif text-[18px]">What would you like to sponsor?</h2>
              <p className="mt-1 text-[13px] text-muted">
                Tick any you wish to cover for {selectedEvent.title}. Each is a fixed amount
                published by the temple office.
              </p>

              <ul className="mt-3 divide-y divide-line">
                {selectedEvent.sponsorships.map((o) => {
                  const on = picked.includes(o.key)
                  return (
                    <li key={o.key}>
                      <label className="flex cursor-pointer items-start gap-3 py-3.5">
                        <Checkbox
                          className="mt-0.5"
                          checked={on}
                          onChange={() => toggleItem(o.key)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium text-ink">{o.label}</span>
                          <span className="block text-[12.5px] leading-snug text-muted">
                            {o.blurb}
                          </span>
                        </span>
                        <span className="shrink-0 text-[14px] font-medium tabular-nums text-ink">
                          {money(o.price)}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>

              <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
                Sponsoring an item does not reserve it exclusively — several families often share
                one head. Your name is read in the sankalpam on the day either way.
              </p>
            </Card>
          ) : null}

          <Card className="space-y-4 p-5">
            {/* For a pledge the figure is per payment, not the whole promise — the
                total is three fields away, in the summary. Saying which one this box
                means is cheaper than letting somebody type $1,200 and pledge $14,400. */}
            <h2 className="font-serif text-[18px]">
              {isPledge ? 'How much per payment?' : 'How much?'}
            </h2>

            {/* For an event the figure is the sum of the ticked items, so the presets would
                fight the checkboxes for control of the same number. The devotee still gets a
                free field — as a gift on top rather than a replacement. */}
            {isEvent ? (
              !selectedEvent ? (
                <p className="text-[13.5px] text-muted">
                  Pick a festival above to see what you can sponsor.
                </p>
              ) : (
                <div className="space-y-3">
                  {chosen.length > 0 ? (
                    <dl className="space-y-2 text-[13.5px]">
                      {chosen.map((o) => (
                        <div key={o.key} className="flex items-baseline justify-between gap-3">
                          <dt className="min-w-0 truncate text-muted">{o.label}</dt>
                          <dd className="font-medium tabular-nums">{money(o.price)}</dd>
                        </div>
                      ))}
                      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
                        <dt className="font-medium">Subtotal</dt>
                        <dd className="font-medium tabular-nums">{money(itemsSubtotal)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-[13.5px] text-muted">
                      Nothing ticked yet — you can still give any amount to {selectedEvent.title}{' '}
                      using the field below.
                    </p>
                  )}

                  <Field
                    label="Additional gift"
                    hint="optional"
                    htmlFor="dn-topup"
                    className="border-t border-line pt-3"
                  >
                    <div className="relative max-w-[220px]">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-muted">
                        $
                      </span>
                      <Input
                        id="dn-topup"
                        type="number"
                        min={0}
                        step={1}
                        value={topUp || ''}
                        onChange={(e) => setTopUp(Math.max(0, Number(e.target.value) || 0))}
                        className="pl-7 text-[15px]"
                        placeholder="0"
                      />
                    </div>
                  </Field>
                </div>
              )
            ) : (
              <AmountPresets value={amount} onChange={setAmount} />
            )}

            {/* A festival falls on one date, so neither a monthly-repeating sponsorship
                of it nor a promise to sponsor it later is coherent. The whole choice is
                withheld for this fund rather than offered and then refused. */}
            <div className={cn('border-t border-line pt-4', isEvent && 'hidden')}>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                When
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {GIVING_MODES.map((m) => (
                  <label
                    key={m.key}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3 transition-colors',
                      mode === m.key
                        ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                        : 'border-line bg-card hover:border-brand-300',
                    )}
                  >
                    <Radio
                      name="freq"
                      className="mt-0.5"
                      checked={mode === m.key}
                      onChange={() => setMode(m.key)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium text-ink">{m.label}</span>
                      <span className="block text-[12px] leading-snug text-muted">{m.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>

              {recurring ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {CADENCES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={cadence === c}
                      onClick={() => setCadence(c)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                        cadence === c
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-line bg-card text-ink hover:border-brand-300',
                      )}
                    >
                      {titleCase(c)}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* The pledge plan. Three questions in the order a devotee answers them —
                  when it starts, whether it repeats, and how many times — with the
                  schedule they add up to drawn underneath. A date-arithmetic mistake is
                  invisible as settings and obvious as a list of dates. */}
              {isPledge ? (
                <div className="mt-4 space-y-4 rounded-[10px] border border-line bg-tint/40 p-4">
                  <Field label="First payment" htmlFor="pl-start">
                    <div className="flex flex-wrap items-center gap-2">
                      {presets.map((p) => {
                        const value = isoToDateInput(p.date.toISOString())
                        return (
                          <button
                            key={p.key}
                            type="button"
                            aria-pressed={startDate === value}
                            onClick={() => setStartDate(value)}
                            className={cn(
                              'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                              startDate === value
                                ? 'border-brand-500 bg-brand-500 text-white'
                                : 'border-line bg-card text-ink hover:border-brand-300',
                            )}
                          >
                            {p.label}
                          </button>
                        )
                      })}
                      <Input
                        id="pl-start"
                        type="date"
                        min={minDate}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 w-[170px] text-[13.5px]"
                        aria-label="First payment date"
                      />
                    </div>
                    {!startIsValid ? (
                      <p className="mt-1.5 text-[12px] text-brand-600">
                        A pledge falls due in the future. For a gift today, choose One-time donation
                        above.
                      </p>
                    ) : null}
                  </Field>

                  <Field
                    label="Repeat"
                    htmlFor="pl-cadence"
                    className="border-t border-line pt-3.5"
                  >
                    <div className="flex flex-wrap gap-2" id="pl-cadence">
                      {PLEDGE_CADENCES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={pledgeCadence === c}
                          onClick={() => chooseCadence(c)}
                          className={cn(
                            'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                            pledgeCadence === c
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-line bg-card text-ink hover:border-brand-300',
                          )}
                        >
                          {c === 'one-time' ? 'Just once' : titleCase(c)}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {pledgeCadence !== 'one-time' ? (
                    <Field
                      label="How many payments"
                      hint={`up to ${MAX_INSTALLMENTS[pledgeCadence]}`}
                      htmlFor="pl-count"
                    >
                      <Input
                        id="pl-count"
                        type="number"
                        min={1}
                        max={MAX_INSTALLMENTS[pledgeCadence]}
                        value={count || ''}
                        onChange={(e) =>
                          setCount(
                            Math.max(
                              1,
                              Math.min(
                                MAX_INSTALLMENTS[pledgeCadence],
                                Number(e.target.value) || 1,
                              ),
                            ),
                          )
                        }
                        className="max-w-[120px] text-[15px]"
                      />
                    </Field>
                  ) : null}

                  <Field label="A note for the temple office" hint="optional" htmlFor="pl-note">
                    <Input
                      id="pl-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="After the house sale closes"
                    />
                  </Field>

                  <div className="border-t border-line pt-3.5">
                    <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                      Your schedule
                    </p>
                    <PledgeSchedule installments={schedule} />
                  </div>
                </div>
              ) : null}
            </div>

            <Field
              label="Dedicate this donation to…"
              hint="optional"
              htmlFor="dn-ded"
              className="border-t border-line pt-4"
            >
              <Input
                id="dn-ded"
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder="In memory of my father"
              />
            </Field>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="font-serif text-[18px]">
              {isPledge ? 'How you plan to pay' : 'Payment method'}
            </h2>
            {/* Saying this out loud matters more than it looks: the picker below is the
                same control a devotee has just used to pay for a puja, and without the
                line they can reasonably read it as a card about to be charged. */}
            {isPledge ? (
              <p className="text-[13px] text-muted">
                Nothing is charged now. This is only what to expect when the first payment falls due
                — you can pay by another method on the day.
              </p>
            ) : null}
            <PaymentMethodPicker
              value={method}
              onChange={setMethod}
              allow={['card', 'ach', 'zelle', 'check']}
            />
          </Card>
        </div>

        <Card className="sticky top-6 p-5">
          <h3 className="font-serif text-[18px]">{isPledge ? 'Your pledge' : 'Your Donation'}</h3>
          <dl className="mt-3 space-y-2.5 text-[13.5px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Fund</dt>
              <dd className="font-medium">{titleCase(category)}</dd>
            </div>
            {selectedEvent ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Festival</dt>
                <dd className="max-w-[55%] text-right font-medium">{selectedEvent.title}</dd>
              </div>
            ) : null}
            {selectedProject ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Project</dt>
                <dd className="max-w-[55%] text-right font-medium">{selectedProject.title}</dd>
              </div>
            ) : null}
            {chosen.map((o) => (
              <div key={o.key} className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 truncate text-muted">{o.label}</dt>
                <dd className="font-medium tabular-nums">{money(o.price)}</dd>
              </div>
            ))}
            {isEvent && topUp > 0 ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Additional gift</dt>
                <dd className="font-medium tabular-nums">{money(topUp)}</dd>
              </div>
            ) : null}
            {!isEvent ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Frequency</dt>
                <dd className="font-medium">
                  {isPledge
                    ? pledgeCadence === 'one-time'
                      ? 'Pledge · one payment'
                      : `Pledge · ${count} ${pledgeCadence}`
                    : recurring
                      ? `Recurring · ${titleCase(cadence)}`
                      : 'One-time'}
                </dd>
              </div>
            ) : null}
            {isPledge ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">First payment</dt>
                  <dd className="font-medium">{fmtDate(dateInputToISO(startDate))}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Each payment</dt>
                  <dd className="font-medium tabular-nums">{money(amount)}</dd>
                </div>
              </>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">{isPledge ? 'Paying by' : 'Method'}</dt>
              <dd className="font-medium">{titleCase(method)}</dd>
            </div>
            {dedication ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Dedication</dt>
                <dd className="max-w-[55%] text-right font-medium">{dedication}</dd>
              </div>
            ) : null}
          </dl>

          {/* The two figures a pledge has to keep apart, and the reason this block is
              not a single "Total". What is promised is the commitment; what is charged
              today is zero, and a devotee must not have to infer that from the absence
              of a number. */}
          {isPledge ? (
            <div className="mt-4 space-y-2 border-t border-line pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-medium">Total pledged</span>
                <span className="text-[26px] tabular-nums">{money(pledgeTotal)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] text-muted">Charged today</span>
                <span className="text-[15px] font-medium tabular-nums text-leaf-600">
                  {money(0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <span className="text-[13.5px] font-medium">Total today</span>
              <span className="text-[26px] tabular-nums">{money(total)}</span>
            </div>
          )}

          {isPledge ? (
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={pledge}
              disabled={busy || pledgeTotal < 1 || !startIsValid || (isProject && !selectedProject)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <CalendarCheck2 />}
              {busy ? 'Recording…' : `Pledge ${money(pledgeTotal)}`}
            </Button>
          ) : (
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={give}
              disabled={busy || total < 1 || (isProject && !selectedProject)}
            >
              {busy ? <Loader2 className="animate-spin" /> : <HandCoins />}
              {busy ? 'Processing…' : `Give ${money(total)}`}
            </Button>
          )}

          {isProject && !selectedProject ? (
            <p className="mt-2 text-[12px] text-muted">Choose a project to continue.</p>
          ) : null}

          {/* Says which of the two things is missing rather than leaving a dead button. */}
          {isEvent && total < 1 ? (
            <p className="mt-2 text-[12px] text-muted">
              {selectedEvent
                ? 'Tick a sponsorship above, or enter an additional gift.'
                : 'Choose a festival to continue.'}
            </p>
          ) : null}

          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
            {isPledge
              ? 'No payment is taken today and no receipt is issued yet. A 501(c)(3) receipt follows each payment as it arrives — a pledge is deductible only once it is paid.'
              : method === 'check'
                ? 'Your 501(c)(3) tax receipt is issued once the cheque clears. No goods or services are provided in exchange for your contribution.'
                : 'A 501(c)(3) tax receipt is issued immediately. No goods or services are provided in exchange for your contribution.'}
          </p>
        </Card>
      </div>
    </>
  )
}
