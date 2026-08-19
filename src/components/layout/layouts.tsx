import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
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
  // { to: '/my/pujas', label: 'My Pujas', Icon: Flame },
  { to: '/puja', label: 'Yearly Puja', Icon: Sparkles },
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

  /* On the sand rail the current page is a white card rather than a tinted block —
     the surface underneath is already warm, so a second tint would barely register. */
  const navItem = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200',
      isActive
        ? 'bg-gradient-to-r from-white to-white/60 text-brand-700 shadow-sm ring-1 ring-saffron-400/20'
        : 'text-muted hover:bg-white/40 hover:text-brand-900 hover:translate-x-0.5',
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
          {({ isActive }) => (
            <>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-saffron-400"
                />
              ) : null}
              <Icon className="size-4 shrink-0" />
              {label}
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={() => {
          signOut()
          navigate('/')
        }}
        className="group mt-1 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[13.5px] font-medium text-muted transition-all duration-200 hover:bg-white/40 hover:text-brand-900 hover:translate-x-0.5"
      >
        <LogOut className="size-4 shrink-0" />
        Sign out
      </button>
    </nav>
  )

  return (
    <div className="app-shell min-h-dvh">
      {/* Mobile bar */}
      <div className="app-rail sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line px-4 lg:hidden">
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
        <div className="app-rail animate-fade-in border-b border-line p-3 lg:hidden">{nav}</div>
      ) : null}

      <div className="lg:flex">
        {/* A full-height rail rather than a column of links floating on the page: the
            navigation gets its own surface, and the left edge of every screen is
            anchored at any window height. */}
        <aside className="app-rail sticky top-0 hidden h-dvh w-[254px] shrink-0 flex-col overflow-y-auto border-r border-line px-4 py-6 lg:flex">
          <Link to="/" className="mb-5 flex items-center gap-2.5 px-1">
            <Logo size={32} />
            <span className="leading-tight">
              <span className="block font-serif text-[15px] leading-[1.2]">
                Sri Meenakshi
                <br />
                Temple Society
              </span>
              <span className="block text-[10.5px] uppercase tracking-[0.12em] text-muted">
                Devotee portal
              </span>
            </span>
          </Link>

          {user ? (
            <div className="mb-4 flex items-center gap-2.5 rounded-[12px] border border-line bg-card p-3 shadow-[var(--shadow-sm)]">
              <Avatar initials={user.avatarInitials} />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium">{user.name}</p>
                <p className="truncate text-[12px] text-muted">{user.city}</p>
              </div>
            </div>
          ) : null}

          {nav}

          <p className="mt-auto px-3 pt-6 text-[11px] leading-relaxed text-muted/70">
            Sri Meenakshi Temple Society
            <br />
            Pearland, Texas
          </p>
        </aside>

        <main className="animate-fade-in min-w-0 flex-1">
          <div className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
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
  backTo,
  backLabel = 'Back',
  className,
}: {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  backTo?: string
  backLabel?: string
  className?: string
}) {
  return (
    <div className={cn('mb-6', className)}>
      {backTo ? (
        <Link to={backTo} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[26px] leading-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
