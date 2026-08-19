import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ExternalLink,
  HandCoins,
  Minus,
  Plus,
  Users,
} from 'lucide-react'
import { DeityArt } from '@/components/shared/DeityArt'
import { BreakEvenMeter } from '@/components/shared/BreakEvenMeter'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { StatusPill } from '@/components/shared/badges'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { getEventBySlug, rsvpToEvent } from '@/lib/data/api'
import { TEMPLE } from '@/lib/data/mock'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { cn, fmtDate, googleCalendarUrl, money } from '@/lib/utils'

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>()
  const user = useAuthStore((s) => s.user)
  const { toast } = useToast()

  const { data: event, loading, refresh } = useAsync(() => getEventBySlug(slug!), [slug])

  const [seats, setSeats] = useState(2)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [rsvped, setRsvped] = useState(false)

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <LoadingSkeleton variant="table" rows={5} />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <EmptyState
          title="Festival not found"
          detail="It may have been renamed or removed from the calendar."
          action={
            <Link to="/events" className={buttonVariants({ size: 'sm' })}>
              All festivals
            </Link>
          }
        />
      </div>
    )
  }

  const totalCost = event.costs.reduce((s, c) => s + c.amount, 0)
  const startDate = new Date(event.date)

  const submitRsvp = async (e: React.FormEvent) => {
    e.preventDefault()
    await rsvpToEvent(event.id, seats)
    setRsvped(true)
    refresh()
    toast('RSVP recorded', { detail: `${seats} seat${seats === 1 ? '' : 's'} for ${event.title}.` })
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        to="/events"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All festivals
      </Link>

      <section className="relative overflow-hidden rounded-[14px] border border-line shadow-[var(--shadow-lg)]">
        <DeityArt
          deity={event.title.includes('Navaratri') ? 'Durga' : 'Meenakshi'}
          className="absolute inset-0 h-full w-full"
          label={`${event.title} flyer`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/50 to-transparent" />
        <div className="relative flex min-h-[240px] flex-col justify-end gap-2 p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={event.status} />
            {event.ticketPrice ? (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white backdrop-blur">
                {money(event.ticketPrice)} per seat
              </span>
            ) : (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white backdrop-blur">
                Free · all welcome
              </span>
            )}
          </div>
          <h1 className="max-w-2xl font-serif text-[32px] leading-[1.12] text-white sm:text-[38px]">
            {event.title}
          </h1>
          <p className="text-[14px] text-white/85">
            {fmtDate(event.date, 'EEEE, MMMM d, yyyy')} at 6:00 PM
            {event.endDate ? ` – ${fmtDate(event.endDate, 'MMMM d')}` : ''} · {TEMPLE.city},{' '}
            {TEMPLE.state}
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-serif text-[20px]">About this festival</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{event.description}</p>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <a
                href={googleCalendarUrl({
                  title: `${event.title} — ${TEMPLE.name}`,
                  start: startDate,
                  durationMin: 180,
                  details: event.description,
                  location: `${TEMPLE.address}, ${TEMPLE.city}, ${TEMPLE.state} ${TEMPLE.zip}`,
                })}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <CalendarPlus />
                Add to calendar
                <ExternalLink className="size-3" />
              </a>
              <Link
                to={`/donate?category=event&dedicate=${encodeURIComponent(event.title)}`}
                className={buttonVariants({ size: 'sm' })}
              >
                <HandCoins />
                Sponsor this festival
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-[20px]">What it costs</h2>
              <span className="text-[13px] text-muted">
                Published budget · {money(totalCost)} total
              </span>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {event.costs.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[13.5px] text-ink">{c.label}</span>
                  <span className="text-[13.5px] font-medium tabular-nums">{money(c.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              These are direct costs only. Any surplus above the target goes to the temple’s general
              operating fund and is reported in the annual statement.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-serif text-[20px]">RSVP</h2>
            {rsvped ? (
              <div className="mt-3 flex items-start gap-3 rounded-[10px] border border-leaf-500/30 bg-leaf-500/[0.07] p-4">
                <Check className="mt-0.5 size-5 shrink-0 text-leaf-500" />
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    You’re on the list — {seats} seat{seats === 1 ? '' : 's'}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    A reminder will go to {email || 'your email'} the day before. No ticket needed —
                    just give your name at the desk.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submitRsvp} className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Your name" htmlFor="rsvp-name">
                  <Input
                    id="rsvp-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Santhosh Kumar"
                  />
                </Field>
                <Field label="Email" htmlFor="rsvp-email">
                  <Input
                    id="rsvp-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                  />
                </Field>
                <Field
                  label={event.ticketPrice ? 'Seats' : 'How many attending?'}
                  className="sm:col-span-2"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Fewer seats"
                      onClick={() => setSeats((s) => Math.max(1, s - 1))}
                    >
                      <Minus />
                    </Button>
                    <span className="w-12 text-center text-[20px] tabular-nums">
                      {seats}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="More seats"
                      onClick={() => setSeats((s) => Math.min(20, s + 1))}
                    >
                      <Plus />
                    </Button>
                    {event.ticketPrice ? (
                      <span className="ml-3 text-[13.5px] text-muted">
                        {money(event.ticketPrice * seats)} total
                      </span>
                    ) : null}
                  </div>
                </Field>
                <Button type="submit" className="sm:col-span-2">
                  {event.ticketPrice
                    ? `Reserve ${seats} seat${seats === 1 ? '' : 's'}`
                    : 'Count me in'}
                </Button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="font-serif text-[18px]">Festival budget</h3>
            <BreakEvenMeter
              className="mt-3"
              target={event.targetAmount}
              collected={event.collectedAmount}
              label="Raised so far"
            />
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              Published live. Updated nightly · full transparency.
            </p>
            <Link
              to={`/donate?category=event&dedicate=${encodeURIComponent(event.title)}`}
              className={cn(buttonVariants({}), 'mt-4 w-full')}
            >
              Help close the gap
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="font-serif text-[18px]">Details</h3>
            <dl className="mt-3 space-y-3 text-[13.5px]">
              <div>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  When
                </dt>
                <dd className="mt-0.5">{fmtDate(event.date, 'EEEE, MMMM d, yyyy')}</dd>
              </div>
              <div>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Where
                </dt>
                <dd className="mt-0.5">
                  {TEMPLE.name}
                  <br />
                  {TEMPLE.address}, {TEMPLE.city}, {TEMPLE.state} {TEMPLE.zip}
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Attending
                </dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  <Users className="size-3.5 text-muted" />
                  {event.rsvpCount} devotees
                </dd>
              </div>
              <div>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Entry
                </dt>
                <dd className="mt-0.5">
                  {event.ticketPrice
                    ? `${money(event.ticketPrice)} per seat`
                    : 'Free · all welcome'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
