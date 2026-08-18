import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CalendarClock, HandCoins, Heart, Sparkles } from 'lucide-react'
import { HeroBanner } from '@/components/shared/HeroBanner'
import { TransparencyStrip } from '@/components/shared/TransparencyStrip'
import { EventCard } from '@/components/shared/EventCard'
import { LoadingSkeleton } from '@/components/shared/states'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { listEvents } from '@/lib/data/api'
import { DAILY_SCHEDULE, TEMPLE } from '@/lib/data/mock'
import { useAsync } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  {
    to: '/puja/yearly',
    label: 'Book a Yearly Puja',
    detail: 'Your family named at every occurrence, all year',
    Icon: Sparkles,
  },
  {
    to: '/donate',
    label: 'Make a Donation',
    detail: 'Annadanam, goshala, building fund and more',
    Icon: HandCoins,
  },
  {
    to: '/membership',
    label: 'Renew Membership',
    detail: 'Silver, Gold and Platinum family plans',
    Icon: Heart,
  },
  {
    to: '/facility',
    label: 'Book the Hall',
    detail: 'Weddings, upanayanam and community events',
    Icon: Building2,
  },
]

export default function Home() {
  const { data: events, loading } = useAsync(() => listEvents('upcoming'), [])
  const upcoming = events ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-11 px-6 py-8">
      {loading ? (
        <Skeleton className="h-[340px] w-full rounded-[14px]" />
      ) : (
        <HeroBanner events={upcoming.slice(0, 4)} />
      )}

      <TransparencyStrip />

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-[22px]">How can we serve you today?</h2>
          <Link to="/puja" className="text-[13px] font-medium text-brand-500 hover:underline">
            Browse all pujas
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, label, detail, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col gap-2 rounded-[10px] border border-line bg-card p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow)]"
            >
              <span className="grid size-10 place-items-center rounded-[10px] bg-tint text-brand-500">
                <Icon className="size-5" />
              </span>
              <span className="mt-1 font-serif text-[17px] leading-snug text-ink">{label}</span>
              <span className="text-[13px] leading-relaxed text-muted">{detail}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[13px] font-medium text-brand-500">
                Continue
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-[22px]">Upcoming at the temple</h2>
            <Link to="/events" className="text-[13px] font-medium text-brand-500 hover:underline">
              All festivals
            </Link>
          </div>
          {loading ? (
            <LoadingSkeleton rows={3} className="lg:grid-cols-3" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.slice(0, 3).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>

        <Card className="h-fit p-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="size-4 text-brand-500" />
            <h2 className="font-serif text-[18px]">Today at the temple</h2>
          </div>
          <ul className="divide-y divide-line">
            {DAILY_SCHEDULE.map((s) => (
              <li
                key={s.label}
                className="flex items-baseline justify-between gap-3 py-3 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{s.label}</p>
                  <p className="text-[12.5px] text-muted">{s.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-[13px] text-brand-600">{s.time}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-[10px] bg-tint/70 p-3 text-[12.5px] leading-relaxed text-muted">
            <p className="font-medium text-ink">Temple hours</p>
            <p>Morning {TEMPLE.timings.morning}</p>
            <p>Evening {TEMPLE.timings.evening}</p>
          </div>
          <Link
            to="/calendar"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-4 w-full')}
          >
            Open the full calendar
          </Link>
        </Card>
      </section>
    </div>
  )
}
