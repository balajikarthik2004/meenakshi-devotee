import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, UserRound, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar } from '@/components/ui/badge'
import { MenuItem, Popover } from '@/components/ui/overlay'
import { LogoWordmark } from '@/components/shared/Logo'
import { useAuthStore } from '@/lib/store/auth'
import { cn } from '@/lib/utils'

const PUBLIC_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/calendar', label: 'Calendar' },
  { to: '/events', label: 'Events' },
  { to: '/puja', label: 'Sponsor a Puja' },
  { to: '/donate', label: 'Donate' },
  { to: '/about', label: 'About' },
]

export function Header() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors',
      isActive ? 'bg-tint text-brand-600' : 'text-muted hover:bg-tint hover:text-ink',
    )

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
        <Link to="/" className="shrink-0">
          <LogoWordmark />
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
          {PUBLIC_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Popover
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 transition-colors hover:bg-tint"
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
                  <div className="px-2.5 pb-2 pt-1">
                    <p className="text-[13px] font-medium text-ink">{user.name}</p>
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
            <>
              <Link
                to="/signin"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'hidden sm:inline-flex',
                )}
              >
                Sign in
              </Link>
              <Link to="/signup" className={buttonVariants({ size: 'sm' })}>
                Create account
              </Link>
            </>
          )}

          <Button
            variant="plain"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="animate-fade-in border-t border-line bg-card px-4 py-2 lg:hidden">
          {PUBLIC_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2.5 text-[14px] font-medium',
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
              className="block rounded-md px-3 py-2.5 text-[14px] font-medium text-ink"
            >
              Sign in
            </NavLink>
          ) : null}
        </nav>
      ) : null}
    </header>
  )
}
