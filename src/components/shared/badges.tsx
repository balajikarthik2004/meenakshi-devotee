import { Crown, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { MembershipTier, Role } from '@/lib/data/types'
import { titleCase } from '@/lib/utils'

const ROLE_VARIANT: Record<Role, 'brand' | 'gold' | 'leaf' | 'neutral'> = {
  admin: 'brand',
  board: 'gold',
  priest: 'leaf',
  devotee: 'neutral',
  // Cafeteria staff — the saffron the kitchen board already wears.
  kitchen: 'gold',
  // The school coordinators wear the tulsi green the classes use.
  school: 'leaf',
}

export const RoleBadge = ({ role }: { role: Role }) => (
  <Badge variant={ROLE_VARIANT[role]}>{titleCase(role)}</Badge>
)

/**
 * The two memberships wear different marks but not a hierarchy of them — the senior
 * rate is a concession, not a lesser membership, so neither badge is the dull one.
 */
const TIER_META: Record<
  MembershipTier,
  { variant: 'neutral' | 'gold' | 'brand'; Icon: typeof Crown; label: string }
> = {
  normal: { variant: 'gold', Icon: ShieldCheck, label: 'Member' },
  senior: { variant: 'brand', Icon: Crown, label: 'Senior Citizen' },
}

export const TierBadge = ({ tier }: { tier: MembershipTier }) => {
  const meta = TIER_META[tier]
  if (!meta) return <Badge variant="neutral">{titleCase(tier)}</Badge>
  return (
    <Badge variant={meta.variant}>
      <meta.Icon className="size-3" />
      {meta.label}
    </Badge>
  )
}

type AnyStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'scheduled'
  | 'skipped'
  | 'expired'
  | 'pending'
  | 'confirmed'
  | 'upcoming'
  | 'ongoing'
  | 'planned'
  | 'in-progress'
  // A pledge: a promise the temple is holding, and how much of it has arrived.
  | 'partially-fulfilled'
  | 'fulfilled'
  | 'lapsed'
  // A cafeteria ticket, from the rail to the counter.
  | 'placed'
  | 'preparing'
  | 'ready'
  | 'collected'

const STATUS_VARIANT: Record<AnyStatus, 'leaf' | 'gold' | 'brand' | 'neutral' | 'default'> = {
  active: 'leaf',
  confirmed: 'leaf',
  completed: 'neutral',
  scheduled: 'default',
  upcoming: 'default',
  ongoing: 'leaf',
  'in-progress': 'gold',
  // A pledge not yet due is simply waiting, like a scheduled puja; part-paid wears the
  // same amber as anything still owing; lapsed wears the warning colour because an
  // unkept promise is the one row on the register that needs somebody to act.
  'partially-fulfilled': 'gold',
  fulfilled: 'leaf',
  lapsed: 'brand',
  // An unaccepted ticket is the loud one — it is work nobody has looked at yet.
  placed: 'brand',
  preparing: 'gold',
  ready: 'leaf',
  collected: 'neutral',
  planned: 'neutral',
  pending: 'gold',
  paused: 'gold',
  expired: 'brand',
  cancelled: 'brand',
  skipped: 'brand',
}

/**
 * @param label overrides the humanised status.
 *
 * `titleCase` turns most statuses into the words people actually use, but not all:
 * it renders `pending-payment` as "Pending Payment" while every other surface in
 * the school module calls that state "Awaiting payment". A coordinator filtering
 * for one and reading the other has to work out they are the same thing.
 */
export const StatusPill = ({ status, label }: { status: string; label?: string }) => (
  <Badge variant={STATUS_VARIANT[status as AnyStatus] ?? 'neutral'}>
    {label ?? titleCase(status)}
  </Badge>
)
