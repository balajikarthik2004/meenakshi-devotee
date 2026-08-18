import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getTransparencySnapshot } from '@/lib/data/api'
import type { TransparencySnapshot } from '@/lib/data/types'
import { Progress, Skeleton } from '@/components/ui/badge'
import { cn, money } from '@/lib/utils'

const TILES = [
  { key: 'ytdCollected', label: 'Raised this year' },
  { key: 'annualTarget', label: 'Annual target' },
  { key: 'balanceToBreakeven', label: 'Still to raise' },
] as const

/**
 * The temple's promise, in three numbers. Set on the dark brand ground so it reads as a
 * statement rather than one more card in the stack.
 */
export function TransparencyStrip({ className }: { className?: string }) {
  const [snap, setSnap] = useState<TransparencySnapshot | null>(null)

  useEffect(() => {
    getTransparencySnapshot().then(setSnap)
  }, [])

  return (
    <section className={cn('bg-brand-800 text-brand-50', className)}>
      <div className="mx-auto max-w-5xl px-6 py-14 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-saffron-300">
          Updated nightly · full transparency
        </p>
        <h2 className="mt-3 font-serif text-[30px] leading-tight text-white">
          Where your offering goes
        </h2>

        <dl className="mt-9 grid gap-8 sm:grid-cols-3">
          {TILES.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-[11.5px] uppercase tracking-[0.14em] text-brand-100/65">
                {label}
              </dt>
              <dd className="mt-2">
                {snap ? (
                  <span
                    className={cn(
                      'font-serif text-[38px] leading-none',
                      key === 'balanceToBreakeven' ? 'text-saffron-300' : 'text-white',
                    )}
                  >
                    {money(snap[key])}
                  </span>
                ) : (
                  <Skeleton className="mx-auto h-9 w-32 bg-white/15" />
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mx-auto mt-9 max-w-xl">
          <Progress
            value={snap?.achievedPct ?? 0}
            tone="gold"
            label={`${snap?.achievedPct ?? 0}% of the annual operating target raised`}
            className="bg-white/15"
          />
          <p className="mt-3 text-[13.5px] leading-relaxed text-brand-100/75">
            {snap ? `${snap.achievedPct}% of this year’s operating target.` : 'Loading…'} Every
            dollar is reported to the board monthly and published in the annual report.
          </p>
        </div>

        <Link
          to="/about"
          className="group mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-saffron-200 hover:text-saffron-100"
        >
          How the temple is funded
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}
