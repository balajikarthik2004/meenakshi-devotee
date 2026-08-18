import { useState } from 'react'
import { PageHeader } from '@/components/layout/layouts'
import { EventCard } from '@/components/shared/EventCard'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Chips } from '@/components/ui/tabs'
import { listEvents } from '@/lib/data/api'
import { useAsync } from '@/lib/hooks'

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Happening now' },
  { key: 'completed', label: 'Past' },
  { key: 'all', label: 'All' },
]

export default function EventsIndex() {
  const [filter, setFilter] = useState('upcoming')
  const { data, loading } = useAsync(
    () => listEvents(filter === 'all' ? undefined : (filter as 'upcoming')),
    [filter],
  )

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Festivals & events"
        subtitle="Every festival carries a published budget. You can see exactly what it costs and what has been raised."
        actions={<Chips items={FILTERS} value={filter} onChange={setFilter} />}
      />

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Nothing in this list yet"
          detail="Try another filter — the temple year runs from Aadi through Chithirai."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((e) => (
            <EventCard key={e.id} event={e} showMeter />
          ))}
        </div>
      )}
    </div>
  )
}
