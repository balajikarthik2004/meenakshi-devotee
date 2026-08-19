import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { DAILY_SCHEDULE, TEMPLE, TEMPLE_EIN } from '@/lib/data/mock'

const LINKS = [
  { to: '/puja', label: 'Sponsor a puja' },
  { to: '/donate', label: 'Make a donation' },
  { to: '/membership', label: 'Membership' },
  { to: '/facility', label: 'Book the hall' },
  { to: '/events', label: 'Festivals' },
  { to: '/about', label: 'About the temple' },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-saffron-400/60 bg-brand-800 text-brand-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo size={42} onDark />
            <div>
              <p className="font-serif text-[19px] leading-tight text-saffron-200">
                Sri Meenakshi Temple Society
              </p>
              <p className="text-[10.5px] uppercase tracking-[0.18em] text-brand-100/70">
                Pearland · Texas
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-brand-100/80">
            A registered 501(c)(3) non-profit serving the Greater Houston community. Every lamp lit
            here is paid for by a family that chose to give.
          </p>
        </div>

        <nav>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-saffron-300">
            Worship & give
          </h3>
          <ul className="space-y-2">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-[13.5px] text-brand-100/80 transition-colors hover:text-saffron-200"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-saffron-300">
            Visit
          </h3>
          <address className="space-y-2.5 not-italic text-[13.5px] text-brand-100/80">
            <p className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-saffron-300/80" />
              <span>
                {TEMPLE.address}
                <br />
                {TEMPLE.city}, {TEMPLE.state} {TEMPLE.zip}
              </span>
            </p>
            <p className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-saffron-300/80" />
              <a href={`tel:${TEMPLE.phone}`} className="hover:text-saffron-200">
                {TEMPLE.phone}
              </a>
            </p>
            <p className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-saffron-300/80" />
              <a href={`mailto:${TEMPLE.email}`} className="hover:text-saffron-200">
                {TEMPLE.email}
              </a>
            </p>
          </address>

          <div className="mt-4 border-t border-brand-100/15 pt-3 text-[12.5px] text-brand-100/70">
            <p className="mb-1 font-medium text-brand-50">Daily worship</p>
            {DAILY_SCHEDULE.map((d) => (
              <p key={d.label} className="flex justify-between gap-3">
                <span>{d.label}</span>
                <span className="font-mono text-saffron-200/90">{d.time}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-brand-100/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-6 py-5 text-[12px] text-brand-100/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Sri Meenakshi Temple Society · 501(c)(3) non-profit · EIN{' '}
            {TEMPLE_EIN}
          </p>
          {/* <p>Prototype build — no payment is processed and no email is sent.</p> */}
        </div>
      </div>
    </footer>
  )
}
