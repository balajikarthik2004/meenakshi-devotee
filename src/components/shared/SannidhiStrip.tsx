import { Link } from 'react-router-dom'
import { DEITY_IMAGES, DeityArt } from './DeityArt'
import { TEMPLE } from '@/lib/data/mock'
import { cn } from '@/lib/utils'

/** A short line about each sannidhi — what a devotee actually comes to that shrine for. */
const BLURB: Record<string, string> = {
  Meenakshi: 'The presiding goddess',
  Sundareswarar: 'Abhishekam & Pradosham',
  Venkateshwara: 'Saturday thirumanjanam',
  Lakshmi: 'Friday Ashtalakshmi deepam',
  Ganesha: 'Before every beginning',
  Murugan: 'Vel puja & kavadi',
  Ayyappan: 'Mandala season',
  Durga: 'Tuesday kumkumarchana',
}

/**
 * The eight sannidhis, as a devotee would walk the prakaram. This is the section that
 * makes the homepage feel like a temple rather than a booking form — so it earns its
 * space, and the four quick-action tiles it replaced did not.
 */
export function SannidhiStrip({ className }: { className?: string }) {
  return (
    <section className={cn('mx-auto max-w-6xl px-6', className)}>
      <div className="mb-7 text-center">
        <h2 className="rule-saffron rule-center font-serif text-[30px] leading-tight">
          The eight sannidhis
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[14.5px] leading-relaxed text-muted">
          Daily worship follows the Agama tradition at every shrine. Choose a deity to see the pujas
          offered in their name.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {TEMPLE.deities
          .filter((d) => DEITY_IMAGES[d])
          .map((deity) => (
            <Link
              key={deity}
              to={`/puja?deity=${encodeURIComponent(deity)}`}
              className="group relative isolate block overflow-hidden rounded-[10px] shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            >
              <DeityArt
                deity={deity}
                className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-[1.04]"
                label={`${deity} sannidhi`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/25 to-transparent" />
              {/* A brass hairline that lights up on hover, like a lamp being raised */}
              <div className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-inset ring-saffron-300/0 transition-all duration-300 group-hover:ring-saffron-300/60" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                <p className="font-serif text-[17px] leading-tight text-white sm:text-[19px]">
                  {deity}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-saffron-200/90">
                  {BLURB[deity]}
                </p>
              </div>
            </Link>
          ))}
      </div>
    </section>
  )
}
