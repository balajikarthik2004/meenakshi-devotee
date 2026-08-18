import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Flame,
  HandCoins,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { Header } from './Header'
import { Footer } from './Footer'
import { Logo, LogoWordmark } from '@/components/shared/Logo'
import { Avatar } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------- public */

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="animate-fade-in flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/* ------------------------------------------------------------------- minimal */

export function MinimalLayout() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="animate-fade-in">
        <Outlet />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------- app */

const APP_NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/my/pujas', label: 'My Pujas', Icon: Flame },
  { to: '/puja', label: 'Book a Puja', Icon: Sparkles },
  { to: '/donate', label: 'Donate', Icon: HandCoins },
  { to: '/membership', label: 'Membership', Icon: Heart },
  { to: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/my/donations', label: 'My Donations', Icon: ReceiptText },
  { to: '/profile', label: 'Profile', Icon: Settings },
]

export function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname }} replace />
  return <Outlet />
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const [mobileNav, setMobileNav] = useState(false)

  const navItem = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors',
      isActive ? 'bg-brand-500/[0.09] text-brand-600' : 'text-muted hover:bg-tint hover:text-ink',
    )

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {APP_NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/puja'}
          onClick={() => setMobileNav(false)}
          className={navItem}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => {
          signOut()
          navigate('/')
        }}
        className="mt-1 flex items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13.5px] font-medium text-muted transition-colors hover:bg-tint hover:text-ink"
      >
        <LogOut className="size-4 shrink-0" />
        Sign out
      </button>
    </nav>
  )

  return (
    <div className="min-h-dvh bg-bg">
      {/* Mobile bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card px-4 lg:hidden">
        <Button
          variant="plain"
          size="icon"
          aria-label="Toggle navigation"
          onClick={() => setMobileNav((o) => !o)}
        >
          {mobileNav ? <X /> : <Menu />}
        </Button>
        <Link to="/dashboard">
          <LogoWordmark compact />
        </Link>
        {user ? (
          <Avatar initials={user.avatarInitials} className="ml-auto size-8 text-[12px]" />
        ) : null}
      </div>
      {mobileNav ? (
        <div className="animate-fade-in border-b border-line bg-card p-3 lg:hidden">{nav}</div>
      ) : null}

      <div className="mx-auto flex max-w-[1240px] gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <aside className="sticky top-8 hidden h-fit w-[236px] shrink-0 lg:block">
          <Link to="/" className="mb-5 flex items-center gap-2.5">
            <Logo size={32} />
            <span className="leading-tight">
              <span className="block font-serif text-[15px]">Sri Meenakshi</span>
              <span className="block text-[10.5px] uppercase tracking-[0.12em] text-muted">
                Devotee portal
              </span>
            </span>
          </Link>

          {user ? (
            <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-line bg-card p-3">
              <Avatar initials={user.avatarInitials} />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium">{user.name}</p>
                <p className="truncate text-[12px] text-muted">{user.city}</p>
              </div>
            </div>
          ) : null}

          {nav}
        </aside>

        <main className="animate-fade-in min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Standard page heading used by every authenticated screen. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="font-serif text-[26px] leading-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
