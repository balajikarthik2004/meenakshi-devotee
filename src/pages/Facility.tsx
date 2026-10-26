import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  TriangleAlert,
  Users,
} from 'lucide-react'
import type { FacilityBooking, FacilitySlotKey, FacilityVenue } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { MockSuccessScreen } from '@/components/shared/MockSuccessScreen'
import { LoadingSkeleton } from '@/components/shared/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { FACILITY_ADDONS, FACILITY_EVENT_TYPES, FACILITY_SLOTS, TIER_BY_KEY } from '@/lib/data/mock'
import {
  FacilityUnavailableError,
  createFacilityBooking,
  getMembership,
  listFacilityBookings,
  listVenues,
} from '@/lib/data/api'
import {
  eventTypeLabel,
  monthAvailability,
  priceBooking,
  slotAvailability,
  slotHint,
  slotLabel,
} from '@/lib/facility'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { cn, fmtDate, money } from '@/lib/utils'

/**
 * Hall hire, devotee side.
 *
 * The flow is deliberately date-last: space, then occasion, then a calendar that
 * already knows what is gone. Asking for a date first and refusing it afterwards is
 * the thing that makes hall booking feel like a form rather than a booking — so the
 * calendar below greys out what cannot be had, and the slot chips say why.
 */
export default function Facility() {
  const user = useAuthStore((s) => s.user)!
  const now = useMemo(() => new Date(), [])

  const { data, loading, refresh } = useAsync(
    async () => Promise.all([listVenues(), listFacilityBookings(), getMembership(user.id)]),
    [user.id],
  )
  const [venues, bookings, membership] = data ?? [[], [], null]

  const [venueId, setVenueId] = useState<string>('')
  const [eventType, setEventType] = useState<FacilityBooking['eventType']>('wedding')
  const [slot, setSlot] = useState<FacilitySlotKey>('full-day')
  const [day, setDay] = useState<string | null>(null)
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [guests, setGuests] = useState(120)
  const [phone, setPhone] = useState(user.phone)
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<FacilityBooking | null>(null)

  const venue: FacilityVenue | undefined = venues.find((v) => v.id === venueId) ?? venues[0]

  /*
   * Open the calendar on the first month that can actually be booked.
   *
   * The Kalyana Mandapam wants three weeks' notice, so for most of any month the
   * current page of the calendar is entirely struck through — a devotee landing on a
   * wall of greyed dates reads it as "no availability" rather than as "turn the
   * page". Jumping to the earliest bookable month costs nothing and is almost always
   * the month they wanted.
   */
  useEffect(() => {
    if (!venue) return
    const earliest = new Date(now)
    earliest.setDate(earliest.getDate() + venue.minNoticeDays)
    setCursor((c) =>
      c.getFullYear() === earliest.getFullYear() && c.getMonth() === earliest.getMonth()
        ? c
        : new Date(earliest.getFullYear(), earliest.getMonth(), 1),
    )
  }, [venue, now])

  const items = FACILITY_ADDONS.filter((it) => (qty[it.label] ?? 0) > 0).map((it) => ({
    label: it.label,
    qty: qty[it.label]!,
    price: it.price,
  }))

  /* Both tiers carry the same hire discount — the senior rate is a cheaper membership,
     not a smaller one — so the figure comes from the tier spec. A lapsed membership
     earns nothing: the discount is a benefit of being a member now. */
  const discountPct =
    membership?.status === 'active'
      ? (TIER_BY_KEY.get(membership.tier)?.facilityDiscountPct ?? 0)
      : 0

  const price = venue
    ? priceBooking({ venue, slot, items, discountPct })
    : { hireCharge: 0, addOnsTotal: 0, discountPct: 0, discount: 0, total: 0, deposit: 0 }

  const month = venue
    ? monthAvailability({
        venue,
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
        bookings,
        now,
      })
    : []

  /** The state of the slot the devotee has actually picked. */
  const picked =
    venue && day
      ? slotAvailability({ venue, day, slot, bookings, now })
      : null
  const canBook = picked?.state === 'free' && guests > 0 && phone.trim().length > 0

  const chooseEvent = (key: FacilityBooking['eventType']) => {
    setEventType(key)
    // A muhurtham is a morning and a reception is not; following the occasion saves
    // the common case a tap, and the chips are right there to override it.
    const spec = FACILITY_EVENT_TYPES.find((e) => e.key === key)
    if (spec) setSlot(spec.defaultSlot)
  }

  const book = async () => {
    if (!venue || !day) return
    setBusy(true)
    setError(null)
    try {
      const fb = await createFacilityBooking({
        userId: user.id,
        venueId: venue.id,
        date: new Date(`${day}T00:00:00`).toISOString(),
        slot,
        eventType,
        expectedGuests: guests,
        items,
        discountPct,
        contactPhone: phone.trim(),
        notes: notes.trim() || undefined,
      })
      setDone(fb)
    } catch (e) {
      // The slot can go while the form is open. Re-reading the register puts the
      // calendar straight rather than leaving it advertising a date that is gone.
      setError(e instanceof FacilityUnavailableError ? e.message : 'Could not submit that request.')
      refresh()
      setDay(null)
    } finally {
      setBusy(false)
    }
  }

  if (done && venue) {
    return (
      <MockSuccessScreen
        title="Hall request submitted"
        subtitle="The office will confirm within one business day. The date is held for you until then."
        referenceLabel="Reference"
        reference={done.reference}
        rows={[
          { label: 'Venue', value: venue.name },
          { label: 'Date', value: fmtDate(done.date, 'EEEE, MMMM d, yyyy') },
          { label: 'Slot', value: `${slotLabel(done.slot)} · ${slotHint(done.slot)}` },
          { label: 'Occasion', value: eventTypeLabel(done.eventType) },
          { label: 'Expected guests', value: String(done.expectedGuests) },
          ...(done.items.length
            ? [{ label: 'Add-ons', value: done.items.map((l) => `${l.label} ×${l.qty}`).join(', ') }]
            : []),
          ...(done.discountPct
            ? [
                {
                  label: `Member discount (${done.discountPct}%)`,
                  value: `−${money(done.hireCharge + done.addOnsTotal - done.total)}`,
                },
              ]
            : []),
          { label: 'Hire total', value: money(done.total) },
          { label: 'Refundable deposit', value: money(done.deposit) },
        ]}
        emailSubject={`Your ${venue.name} request for ${fmtDate(done.date)} — ${done.reference}`}
        emailBody={
          <>
            <p>Dear {user.name},</p>
            <p className="mt-2">
              We have received your request for the <strong>{venue.name}</strong> on{' '}
              {fmtDate(done.date, 'EEEE, MMMM d, yyyy')} ({slotHint(done.slot)}), reference{' '}
              <strong>{done.reference}</strong>. The office will confirm the date and send an
              invoice for {money(done.total)}, plus a refundable deposit of {money(done.deposit)}.
            </p>
            <p className="mt-2 text-muted">
              Setup access begins two hours before your slot. Vegetarian catering only, please.
            </p>
          </>
        }
        actions={
          <>
            <Link to="/my/halls" className={buttonVariants({ variant: 'ghost' })}>
              My hall bookings
            </Link>
            <Link
              to="/facility"
              className={buttonVariants({})}
              onClick={() => {
                setDone(null)
                setDay(null)
                refresh()
              }}
            >
              Book another date
            </Link>
          </>
        }
      />
    )
  }

  if (loading || !venue) {
    return (
      <>
        <PageHeader title="Book a hall" subtitle="Weddings, upanayanam, seemantham and gatherings." />
        <LoadingSkeleton variant="tiles" rows={3} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Book a hall"
        subtitle="Weddings, receptions, upanayanam, seemantham and community gatherings."
        actions={
          <Link to="/my/halls" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            My hall bookings
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          {/* ---------------------------------------------------------- venue */}
          <Card className="p-5">
            <h2 className="font-serif text-[18px]">Choose a space</h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {venues.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={venue.id === v.id}
                  onClick={() => {
                    setVenueId(v.id)
                    setDay(null)
                  }}
                  className={cn(
                    'rounded-[10px] border p-4 text-left transition-colors active:scale-[.99]',
                    venue.id === v.id
                      ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                      : 'border-line bg-card hover:border-brand-300',
                  )}
                >
                  <Building2
                    className={cn('size-5', venue.id === v.id ? 'text-brand-500' : 'text-muted')}
                  />
                  <span className="mt-2 block font-serif text-[16px] text-ink">{v.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted">
                    <Users className="size-3.5" />
                    Seats {v.capacity}
                  </span>
                  <span className="mt-1.5 block text-[13px] font-medium text-ink">
                    From {money(v.rates.morning)} a slot
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-muted">{venue.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {venue.amenities.map((a) => (
                <Badge key={a} variant="neutral">
                  {a}
                </Badge>
              ))}
            </div>
          </Card>

          {/* -------------------------------------------------------- occasion */}
          <Card className="p-5">
            <h2 className="font-serif text-[18px]">The occasion</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="What is the function?" htmlFor="fb-type">
                <Select
                  id="fb-type"
                  value={eventType}
                  onChange={(e) => chooseEvent(e.target.value as FacilityBooking['eventType'])}
                >
                  {FACILITY_EVENT_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Expected guests"
                htmlFor="fb-guests"
                hint={
                  guests > venue.capacity
                    ? `${venue.name} seats ${venue.capacity} — the office may ask you to move`
                    : `Seats up to ${venue.capacity}`
                }
              >
                <Input
                  id="fb-guests"
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 0))}
                />
              </Field>
            </div>

            <p className="eyebrow mt-4 mb-2">Which part of the day?</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {FACILITY_SLOTS.map((s) => {
                const state = day
                  ? slotAvailability({ venue, day, slot: s.key, bookings, now })
                  : null
                const blocked = state != null && state.state !== 'free'
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={slot === s.key}
                    disabled={blocked}
                    onClick={() => setSlot(s.key)}
                    className={cn(
                      'rounded-[10px] border p-3 text-left transition-colors',
                      blocked && 'cursor-not-allowed opacity-45',
                      !blocked && slot === s.key
                        ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                        : 'border-line bg-card hover:border-brand-300',
                    )}
                  >
                    <span className="block text-[14px] font-medium text-ink">{s.label}</span>
                    <span className="mt-0.5 block text-[12px] text-muted">{s.hint}</span>
                    <span className="mt-1 block text-[13px] font-semibold text-ink">
                      {money(venue.rates[s.key])}
                    </span>
                    {blocked ? (
                      <span className="mt-1 block text-[11.5px] text-brand-500">
                        {state?.state === 'taken' ? 'Already booked' : state?.reason}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* --------------------------------------------------------- the date */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif text-[18px]">Pick a date</h2>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {venue.name} needs {venue.minNoticeDays} days’ notice. Greyed dates are taken or
                  too soon.
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            <p className="mt-3 text-center font-serif text-[16px] text-ink">
              {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="py-1 text-center text-[11px] font-semibold text-faint">
                  {d}
                </div>
              ))}
              {Array.from(
                { length: (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7 },
                (_, i) => (
                  <div key={`lead-${i}`} />
                ),
              )}
              {month.map((d) => {
                // The chosen slot decides whether a day is offered, not the summary:
                // a morning booking leaves the evening free, and a devotee who wants
                // the evening should be able to take it.
                const state = d.slots[slot]
                const free = state.state === 'free'
                const selected = day === d.day
                return (
                  <button
                    key={d.day}
                    type="button"
                    disabled={!free}
                    aria-pressed={selected}
                    title={free ? undefined : state.state === 'taken' ? 'Already booked' : state.reason}
                    onClick={() => setDay(d.day)}
                    className={cn(
                      'aspect-square rounded-[8px] border text-[13px] font-medium tabular-nums transition-colors',
                      !free && 'cursor-not-allowed border-line/60 bg-line/35 text-faint',
                      free && !selected && 'border-line bg-card text-ink hover:border-brand-300',
                      selected && 'border-brand-500 bg-brand-500 text-white',
                      free && !selected && d.summary === 'partial' && 'border-saffron-500/40',
                    )}
                  >
                    {d.date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3">
              <span className="flex items-center gap-1.5 text-[12px] text-muted">
                <span className="size-3 rounded-[3px] border border-line bg-card" />
                Free
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-muted">
                <span className="size-3 rounded-[3px] border border-saffron-500/50 bg-card" />
                One slot left that day
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-muted">
                <span className="size-3 rounded-[3px] border border-line/60 bg-line/35" />
                Taken or inside notice
              </span>
            </div>
          </Card>

          {/* ----------------------------------------------------------- extras */}
          <Card className="p-5">
            <h2 className="font-serif text-[18px]">Add-ons</h2>
            <p className="mt-1 text-[13px] text-muted">
              Add only what you need — set a quantity to zero to remove it.
            </p>
            <ul className="mt-3 divide-y divide-line">
              {FACILITY_ADDONS.map((it) => (
                <li key={it.label} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{it.label}</p>
                    <p className="text-[12px] text-muted">
                      {money(it.price)} {it.unit}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    aria-label={`Quantity of ${it.label}`}
                    value={qty[it.label] ?? 0}
                    onChange={(e) =>
                      setQty((q) => ({ ...q, [it.label]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    className="w-[92px]"
                  />
                </li>
              ))}
            </ul>
          </Card>

          {/* ---------------------------------------------------------- contact */}
          <Card className="p-5">
            <h2 className="font-serif text-[18px]">How the office reaches you</h2>
            <div className="mt-3 grid gap-3">
              <Field label="Contact number" htmlFor="fb-phone" className="max-w-[260px]">
                <Input id="fb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field
                label="Anything the office should know"
                htmlFor="fb-notes"
                hint="Muhurtham timing, outside caterer, early access — anything at all."
              >
                <Textarea
                  id="fb-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Muhurtham is at 9:40 am; we would like access from 6 am to set up."
                />
              </Field>
            </div>
          </Card>
        </div>

        {/* ---------------------------------------------------------- estimate */}
        <Card className="sticky top-6 p-5">
          <h3 className="font-serif text-[18px]">Estimate</h3>

          <dl className="mt-3 space-y-2.5 text-[13.5px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">
                {venue.name} · {slotLabel(slot)}
              </dt>
              <dd className="font-medium tabular-nums">{money(price.hireCharge)}</dd>
            </div>
            {items.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 truncate text-muted">
                  {l.label} × {l.qty}
                </dt>
                <dd className="font-medium tabular-nums">{money(l.qty * l.price)}</dd>
              </div>
            ))}
            {price.discount > 0 ? (
              <div className="flex items-baseline justify-between gap-3 text-leaf-600">
                <dt className="flex items-center gap-1.5">
                  Member discount
                  <Badge variant="leaf">{discountPct}%</Badge>
                </dt>
                <dd className="font-medium tabular-nums">−{money(price.discount)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <span className="text-[13.5px] font-medium">Hire total</span>
            <span className="text-[26px] tabular-nums">{money(price.total)}</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            <Info className="size-3.5 shrink-0" />
            Plus {money(price.deposit)} refundable deposit
          </p>

          <div className="mt-3 rounded-[8px] border border-line bg-tint/50 p-3">
            <p className="text-[12.5px] text-muted">Your date</p>
            <p className="mt-0.5 text-[13.5px] font-medium text-ink">
              {day ? fmtDate(`${day}T00:00:00`, 'EEEE, MMMM d, yyyy') : 'Not chosen yet'}
            </p>
            <p className="text-[12.5px] text-muted">{slotHint(slot)}</p>
          </div>

          {error ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-[8px] border border-brand-500/30 bg-brand-500/[0.06] p-2.5 text-[12.5px] text-brand-600">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          ) : null}

          <Button size="lg" className="mt-4 w-full" onClick={book} disabled={!canBook || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            {busy ? 'Submitting…' : day ? 'Request this date' : 'Pick a date first'}
          </Button>

          {discountPct === 0 ? (
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
              <Link to="/membership" className="font-medium text-brand-500 hover:underline">
                Members save 10%
              </Link>{' '}
              on every hall booking — and the senior citizen rate is{' '}
              {money(TIER_BY_KEY.get('senior')!.price)} a year.
            </p>
          ) : null}
        </Card>
      </div>
    </>
  )
}
