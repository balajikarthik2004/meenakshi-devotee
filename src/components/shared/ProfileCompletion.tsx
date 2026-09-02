import type { FamilyMember, User } from '@/lib/data/types'
import { Avatar } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * What a complete devotee profile looks like, in the order it matters to the temple.
 *
 * Nakshatra and gothra lead because they are read aloud in every sankalpam — a booking
 * made without them is the one thing on this page that produces a wrong ritual rather
 * than merely an inconvenience. The address follows because prasadam-by-post and the
 * mailed annual statement both depend on it. Name, email and phone are seeded at
 * sign-up and are here for completeness rather than because they are ever missing.
 */
const CHECKS: { key: string; label: string; done: (u: User, family: FamilyMember[]) => boolean }[] =
  [
    { key: 'nakshatra', label: 'Nakshatra', done: (u) => Boolean(u.nakshatra) },
    { key: 'gothra', label: 'Gothra', done: (u) => Boolean(u.gothra) },
    { key: 'dob', label: 'Date of birth', done: (u) => Boolean(u.dob) },
    { key: 'family', label: 'Family members', done: (_u, f) => f.length > 0 },
    {
      key: 'address',
      label: 'Postal address',
      done: (u) => Boolean(u.address && u.city && u.state && u.zip),
    },
    { key: 'email', label: 'Email', done: (u) => Boolean(u.email) },
    { key: 'phone', label: 'Phone', done: (u) => Boolean(u.phone) },
  ]

export interface ProfileCompletion {
  pct: number
  done: string[]
  missing: string[]
}

export function profileCompletion(user: User, family: FamilyMember[] = []): ProfileCompletion {
  const done: string[] = []
  const missing: string[] = []
  for (const c of CHECKS) (c.done(user, family) ? done : missing).push(c.label)
  return { pct: Math.round((done.length / CHECKS.length) * 100), done, missing }
}

/**
 * The avatar inside a completion ring.
 *
 * The ring is drawn as one SVG arc rather than a stack of divs so it stays crisp at
 * any size and needs no fixed pixel maths. It is decorative for a sighted reader who
 * can also see the percentage nearby, so the SVG is hidden from assistive tech and the
 * accessible name lives on the wrapper — otherwise a screen reader announces the
 * initials, then a meaningless graphic, then the same number again.
 */
export function AvatarWithCompletion({
  initials,
  pct,
  size = 40,
  className,
}: {
  initials: string
  pct: number
  size?: number
  className?: string
}) {
  const stroke = size >= 56 ? 3.5 : 2.5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const complete = clamped >= 100

  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Profile ${clamped}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className={cn(
            'transition-[stroke-dashoffset] duration-700',
            complete ? 'stroke-leaf-500' : 'stroke-brand-500',
          )}
        />
      </svg>
      {/* Inset so the ring never crowds the disc. */}
      <Avatar
        initials={initials}
        className="size-auto"
        // The avatar is sized from the ring rather than a Tailwind step so the two
        // always agree, whatever `size` the caller picks.
        style={{
          width: size - stroke * 2 - 4,
          height: size - stroke * 2 - 4,
          fontSize: Math.max(10, Math.round(size * 0.32)),
        }}
      />
    </span>
  )
}
