import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { HeroBanner } from '@/components/shared/HeroBanner'
import { SannidhiStrip } from '@/components/shared/SannidhiStrip'
import { TransparencyStrip } from '@/components/shared/TransparencyStrip'
import { EventCard } from '@/components/shared/EventCard'
import { LoadingSkeleton } from '@/components/shared/states'
import { Skeleton } from '@/components/ui/badge'
import { listEvents } from '@/lib/data/api'
import { DAILY_SCHEDULE } from '@/lib/data/mock'
import { useAsync } from '@/lib/hooks'

export default function Home() {
  const { data: events, loading } = useAsync(() => listEvents('upcoming'), [])
  const upcoming = events ?? []

  return (
    <div>
      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-none sm:h-[600px]" />
      ) : (
        <HeroBanner next={upcoming[0]} />
      )}

      {/* Daily worship — a ribbon, not a card. Three times, nothing else. */}
      <section className="border-b border-line bg-tint/70">
        <div className="mx-auto grid max-w-5xl divide-y divide-line/80 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {DAILY_SCHEDULE.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-0.5 py-5 text-center">
              <span className="font-mono text-[13px] tracking-wide text-brand-500">{s.time}</span>
              <span className="font-serif text-[18px] text-ink">{s.label}</span>
              <span className="text-[12.5px] text-muted">{s.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <SannidhiStrip className="py-16" />

      <TransparencyStrip />

      <section className="mx-auto max-w-6xl px-6 py-16 pb-4">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="rule-saffron font-serif text-[30px] leading-tight">
              Upcoming festivals
            </h2>
            <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-muted">
              Each festival carries a published budget — you can see what it costs and what has been
              raised.
            </p>
          </div>
          <Link
            to="/events"
            className="group mt-1.5 inline-flex shrink-0 items-center gap-1.5 text-[14px] font-medium text-brand-500 hover:text-brand-600"
          >
            All festivals
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} className="lg:grid-cols-3" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 3).map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
