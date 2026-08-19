import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays } from 'lucide-react'
import type { TempleEvent } from '@/lib/data/types'
import { buttonVariants } from '@/components/ui/button'
import { cn, fmtDate } from '@/lib/utils'

/**
 * The front door. One photograph, one sentence, one action — the rotating carousel this
 * replaced asked a visitor to read four competing headlines before doing anything.
 *
 * The next festival is a quiet chip rather than a rival headline.
 */
export function HeroBanner({ next, className }: { next?: TempleEvent; className?: string }) {
  return (
    <section className={cn('relative isolate overflow-hidden', className)}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        src="/deities/hero.mp4"
      />
      <div className="absolute inset-0 bg-brand-900/20" />
      {/* A soft pool of shade behind the copy to keep text readable against the video. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 48% at 50% 52%, rgba(40,5,3,0.5) 0%, rgba(40,5,3,0.2) 55%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center gap-5 px-6 py-20 text-center sm:min-h-[600px]">
        <p className="text-[11.5px] uppercase tracking-[0.32em] text-saffron-300">
          Pearland · Texas
        </p>

        <h1 className="font-serif text-[38px] leading-[1.08] text-white [text-shadow:0_2px_24px_rgba(40,5,3,.7)] sm:text-[56px]">
          Sri Meenakshi
          <span className="mt-1 block text-saffron-200">Temple Society</span>
        </h1>

        <p className="max-w-lg text-[15.5px] leading-relaxed text-white/90 [text-shadow:0_1px_10px_rgba(40,5,3,.85)]">
          Sponsor a puja in your family’s name, and see exactly where every dollar you give is
          spent.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/puja" className={buttonVariants({ size: 'lg' })}>
            Sponsor a puja
            <ArrowRight />
          </Link>
          <Link
            to="/donate"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'lg' }),
              'border-white/45 bg-white/10 text-white backdrop-blur hover:bg-white/20',
            )}
          >
            Make a donation
          </Link>
        </div>

        {next ? (
          <Link
            to={`/events/${next.slug}`}
            className="group mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] text-white/90 backdrop-blur transition-colors hover:border-saffron-300/60 hover:bg-white/15"
          >
            <CalendarDays className="size-4 shrink-0 text-saffron-300" />
            <span>
              Next festival · <span className="font-medium text-white">{next.title}</span> on{' '}
              {fmtDate(next.date, 'MMMM d')}
            </span>
            <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
    </section>
  )
}
