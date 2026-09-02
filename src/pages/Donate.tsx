import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, HandCoins, Loader2, UserRound } from 'lucide-react'
import type { Cadence, Donation, DonationCategory, TempleEvent } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { GuestDonorForm } from '@/components/shared/GuestDonorForm'
import { AmountPresets } from '@/components/shared/AmountPresets'
import { BreakEvenMeter } from '@/components/shared/BreakEvenMeter'
import { PaymentMethodPicker } from '@/components/shared/PaymentMethodPicker'
import { MockSuccessScreen } from '@/components/shared/MockSuccessScreen'
import { ChequeInstructions } from '@/components/shared/ChequeInstructions'
import { TaxReceiptPreview } from '@/components/shared/TaxReceiptPreview'
import { LoadingSkeleton } from '@/components/shared/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, Field, Input, Radio } from '@/components/ui/input'
import { DONATION_CATEGORIES } from '@/lib/data/mock'
import { createDonation, listEvents } from '@/lib/data/api'
import type { DonorIdentity } from '@/lib/donor'
import { signUpHrefFor, useDonorIdentity } from '@/lib/donor'
import { useGuestDonorStore } from '@/lib/store/guest'
import { useAsync } from '@/lib/hooks'
import { cn, fmtDate, money, titleCase } from '@/lib/utils'

const CADENCES: Cadence[] = ['monthly', 'quarterly', 'yearly']

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
  const [recurring, setRecurring] = useState(false)
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [dedication, setDedication] = useState(params.get('dedicate') ?? '')
  const [method, setMethod] = useState<Donation['paymentMethod']>('card')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Donation | null>(null)

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

  // A festival is a fixed date, so a monthly-repeating sponsorship of one is incoherent.
  useEffect(() => {
    if (isEvent) setRecurring(false)
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

  /** What the devotee actually pays — items plus top-up for an event, else the preset. */
  const total = isEvent ? itemsSubtotal + topUp : amount

  const signUpHref = signUpHrefFor(identity.contact)

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
    })
    setBusy(false)
    setDone(d)
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
            <h2 className="font-serif text-[18px]">How much?</h2>

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

            {/* A festival falls on one date, so a monthly-repeating sponsorship of it is
                incoherent. The choice is simply withheld for this fund. */}
            <div className={cn('border-t border-line pt-4', isEvent && 'hidden')}>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                Frequency
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                  <Radio name="freq" checked={!recurring} onChange={() => setRecurring(false)} />
                  One-time Donation
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                  <Radio name="freq" checked={recurring} onChange={() => setRecurring(true)} />
                  Recurring Donation
                </label>
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
            <h2 className="font-serif text-[18px]">Payment method</h2>
            <PaymentMethodPicker
              value={method}
              onChange={setMethod}
              allow={['card', 'ach', 'zelle', 'check']}
            />
          </Card>
        </div>

        <Card className="sticky top-6 p-5">
          <h3 className="font-serif text-[18px]">Your Donation</h3>
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
                  {recurring ? `Recurring · ${titleCase(cadence)}` : 'One-time'}
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Method</dt>
              <dd className="font-medium">{titleCase(method)}</dd>
            </div>
            {dedication ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Dedication</dt>
                <dd className="max-w-[55%] text-right font-medium">{dedication}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <span className="text-[13.5px] font-medium">Total today</span>
            <span className="text-[26px] tabular-nums">{money(total)}</span>
          </div>

          <Button size="lg" className="mt-4 w-full" onClick={give} disabled={busy || total < 1}>
            {busy ? <Loader2 className="animate-spin" /> : <HandCoins />}
            {busy ? 'Processing…' : `Give ${money(total)}`}
          </Button>

          {/* Says which of the two things is missing rather than leaving a dead button. */}
          {isEvent && total < 1 ? (
            <p className="mt-2 text-[12px] text-muted">
              {selectedEvent
                ? 'Tick a sponsorship above, or enter an additional gift.'
                : 'Choose a festival to continue.'}
            </p>
          ) : null}

          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
            {method === 'check'
              ? 'Your 501(c)(3) tax receipt is issued once the cheque clears. No goods or services are provided in exchange for your contribution.'
              : 'A 501(c)(3) tax receipt is issued immediately. No goods or services are provided in exchange for your contribution.'}
          </p>
        </Card>
      </div>
    </>
  )
}
