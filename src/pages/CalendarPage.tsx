import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import {
  CalendarLegend,
  MonthCalendar,
  type CalendarEntry,
} from '@/components/shared/MonthCalendar'
import { LoadingSkeleton } from '@/components/shared/states'
import { Chips } from '@/components/ui/tabs'
import { Sheet } from '@/components/ui/overlay'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  getMyBookings,
  getUpcomingOccurrences,
  listEvents,
  listRecurringRules,
} from '@/lib/data/api'
import { eventEntries, expandRules, occurrenceEntries } from '@/lib/calendar'
import { TEMPLE } from '@/lib/data/mock'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { cn, fmtDate, fmtTime, googleCalendarUrl } from '@/lib/utils'

export default function CalendarPage() {
  const user = useAuthStore((s) => s.user)
  const [month, setMonth] = useState(() => new Date())
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [selected, setSelected] = useState<Date | null>(null)

  const { data, loading } = useAsync(
    async () =>
      Promise.all([
        listRecurringRules(),
        listEvents(),
        user ? getUpcomingOccurrences(user.id, 400) : Promise.resolve([]),
        user ? getMyBookings(user.id) : Promise.resolve([]),
      ]),
    [user?.id],
  )

  const entries = useMemo<CalendarEntry[]>(() => {
    if (!data) return []
    const [rules, events, occurrences, bookings] = data
    const mine = occurrenceEntries(occurrences, bookings)
    if (filter === 'mine') return mine
    return [...expandRules(month, rules), ...eventEntries(events), ...mine]
  }, [data, month, filter])

  const dayEntries = selected
    ? entries
        .filter((e) => e.date.toDateString() === selected.toDateString())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    : []

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Temple calendar"
        subtitle="The weekly rhythm, the festival year, and the pujas offered in your name."
        backTo="/dashboard"
        backLabel="Back to Dashboard"
        actions={
          <Chips
            value={filter}
            onChange={(k) => setFilter(k as 'all' | 'mine')}
            items={[
              { key: 'all', label: 'All events' },
              { key: 'mine', label: 'Only my pujas' },
            ]}
          />
        }
      />

      {!user && filter === 'mine' ? (
        <p className="mb-4 rounded-[10px] border border-line bg-tint/60 p-3.5 text-[13px] text-muted">
          <Link to="/signin" className="font-medium text-brand-500 hover:underline">
            Sign in
          </Link>{' '}
          to see the pujas sponsored in your family’s name.
        </p>
      ) : null}

      {loading ? (
        <LoadingSkeleton variant="table" rows={6} />
      ) : (
        <>
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            entries={entries}
            selected={selected ?? undefined}
            onSelect={setSelected}
          />
          <CalendarLegend className="mt-4" />
          <p className="mt-3 text-[12.5px] text-muted">
            Click any day to see its full schedule and add it to your own calendar. All times are{' '}
            {TEMPLE.timezone.replace('_', ' ')} (Houston).
          </p>
        </>
      )}

      <Sheet
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected ? fmtDate(selected, 'EEEE, MMMM d') : ''}
        description={`${dayEntries.length} scheduled item${dayEntries.length === 1 ? '' : 's'}`}
      >
        {dayEntries.length === 0 ? (
          <p className="text-[13.5px] text-muted">
            Nothing scheduled. The temple is open {TEMPLE.timings.morning} and{' '}
            {TEMPLE.timings.evening} for darshan.
          </p>
        ) : (
          <ul className="space-y-3">
            {dayEntries.map((e) => (
              <li key={e.id} className="rounded-[10px] border border-line p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-ink">{e.label}</p>
                    <p className="text-[12.5px] text-muted">{fmtTime(e.date)}</p>
                  </div>
                  <Badge
                    variant={e.kind === 'my-puja' ? 'brand' : e.kind === 'event' ? 'leaf' : 'gold'}
                  >
                    {e.kind === 'my-puja'
                      ? 'In your name'
                      : e.kind === 'event'
                        ? 'Festival'
                        : 'Puja'}
                  </Badge>
                </div>
                {e.detail ? (
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                    {e.detail}
                  </p>
                ) : null}
                <a
                  href={googleCalendarUrl({
                    title: `${e.label} — Sri Meenakshi Devasthanam`,
                    start: e.date,
                    durationMin: 60,
                    details: e.detail,
                    location: `${TEMPLE.address}, ${TEMPLE.city}, ${TEMPLE.state} ${TEMPLE.zip}`,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-3')}
                >
                  <CalendarPlus />
                  Add to Google Calendar
                  <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
