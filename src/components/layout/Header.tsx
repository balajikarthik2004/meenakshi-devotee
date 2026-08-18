import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Clock, LogOut, MapPin, Menu, Phone, UserRound, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Avatar } from '@/components/ui/badge'
import { MenuItem, Popover } from '@/components/ui/overlay'
import { Logo } from '@/components/shared/Logo'
import { useAuthStore } from '@/lib/store/auth'
import { TEMPLE } from '@/lib/data/mock'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/puja', label: 'Sponsor a Puja' },
  { to: '/events', label: 'Festivals' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/about', label: 'About' },
]

export function Header() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

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
                Devasthanam
              </span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
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
          {[...NAV, { to: '/donate', label: 'Donate', end: false }].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
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
