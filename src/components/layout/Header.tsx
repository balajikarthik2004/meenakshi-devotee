import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Clock, LogOut, MapPin, Menu, Phone, UserRound, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Avatar } from '@/components/ui/badge'
import { MenuItem, Popover } from '@/components/ui/overlay'
import { Logo } from '@/components/shared/Logo'
import { useAuthStore } from '@/lib/store/auth'
import { TEMPLE } from '@/lib/data/mock'
import { cn } from '@/lib/utils'

/**
 * The bar, and what did not fit in it.
 *
 * There is less room here than it looks. The bar is capped at 1,152px, the gutters take
 * 48, the wordmark about 210 and the Donate and Sign in buttons about 180 — which
 * leaves roughly 680px for links. Nine of them wanted some 900px, so the row had been
 * quietly crushing itself for a while, and hall hire had nowhere to go.
 *
 * {@link PRIMARY} is what a visitor actually arrives to do: book a priest, book a room,
 * find out when something is on, eat, enrol a child, or work out who the temple is.
 * Six of those come to about 580px and leave the bar room to breathe.
 *
 * {@link SECONDARY} is not a bin for dead links — every one still has a page, and the
 * Festivals index and the capital projects are both linked from the homepage body,
 * which is where somebody browsing rather than navigating will meet them anyway.
 *
 * Home is deliberately absent: the wordmark to the left of this row is the way back,
 * on every site a visitor has ever used. It stays in the mobile drawer, where the
 * wordmark is in the bar above rather than beside the links, and where vertical space
 * costs nothing.
 */
const PRIMARY = [
  { to: '/puja', label: 'Sponsor a Puja' },
  { to: '/facility', label: 'Book a Hall' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/kitchen', label: 'Cafeteria' },
  { to: '/school', label: 'VHS School' },
  { to: '/about', label: 'About' },
]

const SECONDARY = [
  { to: '/events', label: 'Festivals' },
  { to: '/projects', label: 'Projects' },
  { to: '/scholarship', label: 'Scholarships' },
]

/** The drawer has no width problem, so it shows everything, Home included. */
const MOBILE_NAV = [
  { to: '/', label: 'Home', end: true },
  ...PRIMARY,
  ...SECONDARY,
  { to: '/donate', label: 'Donate' },
]

export function Header() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const moreActive = SECONDARY.some(
    (n) => pathname === n.to || pathname.startsWith(`${n.to}/`),
  )

  return (
    <header className="sticky top-0 z-30">
      {/* Saffron welcome strip — the temple's own banner colour, kept to a hairline */}
      <div className="bg-gradient-to-r from-saffron-500 via-saffron-400 to-saffron-500 text-brand-800">
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-between gap-4 px-6 text-[12px]">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {TEMPLE.address}, {TEMPLE.city}, {TEMPLE.state}
            </span>
          </span>
          <span className="hidden items-center gap-4 sm:flex">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {TEMPLE.timings.morning} · {TEMPLE.timings.evening}
            </span>
            <a href={`tel:${TEMPLE.phone}`} className="flex items-center gap-1.5 hover:underline">
              <Phone className="size-3.5" />
              {TEMPLE.phone}
            </a>
          </span>
        </div>
      </div>

      <div className="border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-4 px-6">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <Logo size={40} />
            <span className="leading-tight">
              <span className="block font-serif text-[19px] text-brand-600">Sri Meenakshi</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">
                Temple Society
              </span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {PRIMARY.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'relative px-3 py-2 text-[14px] font-medium transition-colors',
                    isActive ? 'text-brand-600' : 'text-ink/70 hover:text-brand-600',
                    isActive &&
                      'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-saffron-400',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}

            {/* The overflow. It lights up like any other item when you are on one of
                its pages, because a bar where nothing is marked leaves you unsure the
                site knows where you are. */}
            <Popover
              align="end"
              trigger={({ open: isOpen, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={isOpen}
                  className={cn(
                    'relative flex items-center gap-1 px-3 py-2 text-[14px] font-medium transition-colors',
                    moreActive ? 'text-brand-600' : 'text-ink/70 hover:text-brand-600',
                    moreActive &&
                      'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-saffron-400',
                  )}
                >
                  More
                  <ChevronDown
                    aria-hidden
                    className={cn('size-3.5 transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
              )}
            >
              {(close) =>
                SECONDARY.map((n) => (
                  <MenuItem
                    key={n.to}
                    onClick={() => {
                      close()
                      navigate(n.to)
                    }}
                  >
                    {n.label}
                  </MenuItem>
                ))
              }
            </Popover>
          </nav>

          <div className={cn('flex items-center gap-2', 'lg:ml-4', 'ml-auto lg:ml-4')}>
            <Link
              to="/donate"
              className={cn(buttonVariants({ size: 'sm' }), 'hidden shadow-none sm:inline-flex')}
            >
              Donate
            </Link>

            {user ? (
              <Popover
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Account menu"
                    className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 transition-colors hover:bg-tint"
                  >
                    <Avatar initials={user.avatarInitials} className="size-7 text-[11px]" />
                    <span className="hidden text-[13px] font-medium sm:inline">
                      {user.name.split(' ')[0]}
                    </span>
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <div className="border-b border-line px-2.5 pb-2 pt-1">
                      <p className="text-[13px] font-medium">{user.name}</p>
                      <p className="truncate text-[12px] text-muted">{user.email}</p>
                    </div>
                    <MenuItem
                      onClick={() => {
                        close()
                        navigate('/dashboard')
                      }}
                    >
                      <UserRound className="size-4" />
                      My dashboard
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        close()
                        signOut()
                        navigate('/')
                      }}
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </MenuItem>
                  </>
                )}
              </Popover>
            ) : (
              <Link
                to="/signin"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'hidden sm:inline-flex',
                )}
              >
                Sign in
              </Link>
            )}

            <button
              type="button"
              className="grid size-9 place-items-center rounded-md text-ink/70 transition-colors hover:bg-tint lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <nav className="animate-fade-in border-b border-line bg-card px-4 py-2 lg:hidden">
          {MOBILE_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={'end' in n ? n.end : undefined}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2.5 text-[15px] font-medium',
                  isActive ? 'bg-tint text-brand-600' : 'text-ink',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
          {!user ? (
            <NavLink
              to="/signin"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-ink"
            >
              Sign in
            </NavLink>
          ) : null}
        </nav>
      ) : null}
    </header>
  )
}
