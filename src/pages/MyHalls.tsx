import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, CalendarX2, Clock, Users } from 'lucide-react'
import type { FacilityBooking } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { StatusPill } from '@/components/shared/badges'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { getMyFacilityBookings, listVenues, setFacilityBookingStatus } from '@/lib/data/api'
import { eventTypeLabel, slotHint, slotLabel } from '@/lib/facility'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { cn, fmtDate, money } from '@/lib/utils'

/**
 * The devotee's own hall requests.
 *
 * Before this page a request went in and disappeared: no reference to quote, no way
 * to see whether the office had said yes, and no way to give a date back. The office
 * was taking those three questions by phone.
 */
export default function MyHalls() {
  const user = useAuthStore((s) => s.user)!
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const { data, loading, refresh } = useAsync(
    async () => Promise.all([getMyFacilityBookings(user.id), listVenues(true)]),
    [user.id],
  )
  const [bookings, venues] = data ?? [[], []]
  const venueName = useMemo(
    () => new Map(venues.map((v) => [v.id, v.name])),
    [venues],
  )

  const now = new Date()
  // The API hands these back newest-event-first, which is right for history and
  // wrong for what is coming: the next date is the one being asked about.
  const upcoming = bookings
    .filter((b) => new Date(b.date) >= now && (b.status === 'pending' || b.status === 'confirmed'))
    .sort((a, b) => a.date.localeCompare(b.date))
  const upcomingIds = new Set(upcoming.map((b) => b.id))
  const past = bookings.filter((b) => !upcomingIds.has(b.id))

  const cancel = async (b: FacilityBooking) => {
    setBusy(b.id)
    await setFacilityBookingStatus(b.id, 'cancelled')
    toast('Booking cancelled', { detail: `${b.reference} — the date is free again.` })
    setBusy(null)
    refresh()
  }

  if (loading) {
    return (
      <>
        <PageHeader title="My hall bookings" />
        <LoadingSkeleton variant="tiles" rows={3} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My hall bookings"
        subtitle="Every hall you have asked for, and where each request has got to."
        actions={
          <Link to="/facility" className={buttonVariants({ size: 'sm' })}>
            <Building2 />
            Book a hall
          </Link>
        }
      />

      {bookings.length === 0 ? (
        <EmptyState
          Icon={Building2}
          title="No hall bookings yet"
          detail="The Kalyana Mandapam, the mini hall, the dining hall and the open-air mandapam can all be hired for a function."
          action={
            <Link to="/facility" className={buttonVariants({ size: 'sm' })}>
              Book a hall
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 ? (
            <section>
              <h2 className="eyebrow mb-2">Coming up</h2>
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    venue={venueName.get(b.venueId) ?? 'Venue'}
                    onCancel={() => cancel(b)}
                    busy={busy === b.id}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section>
              <h2 className="eyebrow mb-2">Past & closed</h2>
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    venue={venueName.get(b.venueId) ?? 'Venue'}
                    muted
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  )
}

function BookingCard({
  booking: b,
  venue,
  onCancel,
  busy,
  muted,
}: {
  booking: FacilityBooking
  venue: string
  onCancel?: () => void
  busy?: boolean
  muted?: boolean
}) {
  return (
    <Card className={cn('p-5', muted && 'opacity-85')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-[18px] text-ink">{venue}</h3>
            <StatusPill status={b.status} />
          </div>
          <p className="mt-1 text-[14px] text-ink-soft">
            {fmtDate(b.date, 'EEEE, MMMM d, yyyy')}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {slotLabel(b.slot)} · {slotHint(b.slot)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {b.expectedGuests} guests
            </span>
            <span>{eventTypeLabel(b.eventType)}</span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[22px] tabular-nums text-ink">{money(b.total)}</p>
          <p className="text-[12px] text-muted">
            + {money(b.deposit)} deposit
            {b.depositPaidAt ? ' · received' : ''}
          </p>
          <Badge variant="neutral" className="mt-1.5">
            {b.reference}
          </Badge>
        </div>
      </div>

      {b.status === 'declined' && b.declineReason ? (
        <p className="mt-3 rounded-[8px] border border-brand-500/25 bg-brand-500/[0.05] p-2.5 text-[12.5px] text-brand-600">
          {b.declineReason}
        </p>
      ) : null}

      {b.status === 'pending' ? (
        <p className="mt-3 text-[12.5px] text-muted">
          The office is reviewing this. The date is held for you meanwhile.
        </p>
      ) : null}

      {b.items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {b.items.map((it) => (
            <Badge key={it.label} variant="neutral">
              {it.label} × {it.qty}
            </Badge>
          ))}
        </div>
      ) : null}

      {onCancel ? (
        <div className="mt-4 flex justify-end border-t border-line pt-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            <CalendarX2 />
            {busy ? 'Cancelling…' : 'Cancel this booking'}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
