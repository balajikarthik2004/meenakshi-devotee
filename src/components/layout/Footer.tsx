import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, Camera, Mail, MapPin, Phone, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Logo } from '@/components/shared/Logo'
import { DAILY_SCHEDULE, TEMPLE, TEMPLE_EIN } from '@/lib/data/mock'

const COLUMNS = [
  {
    title: 'Worship',
    links: [
      { to: '/puja', label: 'Sponsor a puja' },
      { to: '/puja/yearly', label: 'Yearly pujas' },
      { to: '/puja/one-time', label: 'One-time archana' },
      { to: '/calendar', label: 'Temple calendar' },
    ],
  },
  {
    title: 'Give',
    links: [
      { to: '/donate', label: 'Make a donation' },
      { to: '/membership', label: 'Membership' },
      { to: '/my/receipts', label: 'Tax receipts' },
      { to: '/facility', label: 'Book the hall' },
    ],
  },
  {
    title: 'Temple',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/events', label: 'Festivals' },
      { to: '/profile', label: 'My profile' },
      { to: '/signin', label: 'Sign in' },
    ],
  },
]

export function Footer() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')

  return (
    <footer className="mt-12 border-t border-line bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <div>
              <p className="font-serif text-[16px] leading-tight">{TEMPLE.name}</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Pearland, Texas</p>
            </div>
          </div>
          <address className="space-y-1.5 not-italic text-[13px] text-muted">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {TEMPLE.address}
                <br />
                {TEMPLE.city}, {TEMPLE.state} {TEMPLE.zip}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" />
              <a href={`tel:${TEMPLE.phone}`} className="hover:text-ink">
                {TEMPLE.phone}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0" />
              <a href={`mailto:${TEMPLE.email}`} className="hover:text-ink">
                {TEMPLE.email}
              </a>
            </p>
          </address>
          <div className="flex gap-1.5">
            {[
              { Icon: AtSign, label: 'Facebook' },
              { Icon: Camera, label: 'Instagram' },
              { Icon: Play, label: 'YouTube' },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={`${label} (prototype link)`}
                className="grid size-8 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand-300 hover:text-brand-500"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title}>
            <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              {col.title}
            </h3>
            <ul className="space-y-1.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-[13px] text-ink/80 transition-colors hover:text-brand-500"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="text-[12.5px] text-muted">
            <p className="mb-1 font-medium text-ink">Temple hours</p>
            <p>
              Morning {TEMPLE.timings.morning} · Evening {TEMPLE.timings.evening}
            </p>
            <p className="mt-0.5">
              {DAILY_SCHEDULE.map((d) => `${d.label} ${d.time}`).join(' · ')}
            </p>
          </div>

          <form
            className="flex w-full max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              toast('Subscribed to temple emails', {
                detail: `${email || 'Your address'} will receive the weekly festival note.`,
              })
              setEmail('')
            }}
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Get temple emails"
              aria-label="Email address for temple newsletter"
            />
            <Button type="submit" size="sm">
              Sign up
            </Button>
          </form>
        </div>
      </div>

      <div className="border-t border-line bg-tint/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4 text-[12px] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {TEMPLE.name}. A registered 501(c)(3) non-profit · EIN{' '}
            {TEMPLE_EIN}.
          </p>
          <p>Prototype build — no payments are processed and no emails are sent.</p>
        </div>
      </div>
    </footer>
  )
}
