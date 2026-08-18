import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Coins,
  Download,
  Flame,
  Heart,
  ReceiptText,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { StatTile } from '@/components/shared/StatTile'
import { NextInYourNameTile } from '@/components/devotee/NextInYourNameTile'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { StatusPill, TierBadge } from '@/components/shared/badges'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import {
  getMembership,
  getMyBookings,
  getUpcomingOccurrences,
  listDonations,
  listEvents,
} from '@/lib/data/api'
import { PUJA_BY_ID } from '@/lib/data/mock'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { cn, fmtDate, money, titleCase } from '@/lib/utils'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)!

  const { data, loading } = useAsync(
    async () =>
      Promise.all([
        getMyBookings(user.id),
        listDonations(user.id),
        getUpcomingOccurrences(user.id, 30),
        getMembership(user.id),
        listEvents('upcoming'),
      ]),
    [user.id],
  )

  if (loading || !data) {
    return (
      <>
        <PageHeader
          title={`Vanakkam, ${user.name.split(' ')[0]}`}
          subtitle="Loading your temple year…"
        />
        <LoadingSkeleton variant="tiles" rows={6} />
      </>
    )
  }

  const [bookings, donations, occurrences, membership, events] = data
  const activeBookings = bookings.filter((b) => b.status === 'active')
  const thisYear = new Date().getFullYear()

  const ytd = donations
    .filter((d) => new Date(d.createdAt).getFullYear() === thisYear)
    .reduce((s, d) => s + d.amount, 0)
  const lifetime =
    donations.reduce((s, d) => s + d.amount, 0) +
    bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.amount, 0)

  const in30 = Date.now() + 30 * 86400000
  const eventsSoon = events.filter((e) => new Date(e.date).getTime() <= in30)

  const nextOcc = occurrences[0]
  const nextBooking = nextOcc ? bookings.find((b) => b.id === nextOcc.bookingId) : undefined
  const nextPuja = nextBooking ? PUJA_BY_ID.get(nextBooking.pujaCatalogId) : undefined

  const nextByBooking = new Map<string, (typeof occurrences)[number]>()
  for (const o of occurrences)
    if (!nextByBooking.has(o.bookingId)) nextByBooking.set(o.bookingId, o)

  return (
    <>
      <PageHeader
        title={`Vanakkam, ${user.name.split(' ')[0]}`}
        subtitle={`${user.nakshatra ?? '—'} nakshatra · ${user.gothra ?? '—'} gothra · Member since ${fmtDate(user.createdAt, 'yyyy')}`}
        actions={
          <>
            <Link to="/puja" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              <Sparkles />
              Sponsor a puja
            </Link>
            <Link to="/donate" className={buttonVariants({ size: 'sm' })}>
              <Coins />
              Donate
            </Link>
          </>
        }
      />

      {/* Row 1 — six stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label={`Donations (${thisYear})`}
          value={money(ytd)}
          sub={`${donations.filter((d) => new Date(d.createdAt).getFullYear() === thisYear).length} gifts this year`}
          Icon={Wallet}
          tone="leaf"
        />
        <StatTile
          label="Lifetime contributions"
          value={money(lifetime)}
          sub="Donations and puja sponsorships"
          Icon={Coins}
        />
        <StatTile
          label="Pujas booked"
          value={activeBookings.length}
          sub={`${bookings.length} total, all time`}
          Icon={Flame}
          tone="brand"
        />
        <StatTile
          label="Upcoming events"
          value={eventsSoon.length}
          sub="In the next 30 days"
          Icon={CalendarDays}
        />
        <StatTile
          label="Membership"
          value={membership ? titleCase(membership.tier) : 'None'}
          sub={
            membership ? (
              <span className="inline-flex items-center gap-1.5">
                Expires {fmtDate(membership.endDate, 'MMM yyyy')}
                <StatusPill status={membership.status} />
              </span>
            ) : (
              <Link to="/membership" className="text-brand-500 hover:underline">
                Join a tier →
              </Link>
            )
          }
          Icon={Heart}
          tone="gold"
        />
        <NextInYourNameTile
          occurrence={nextOcc}
          puja={nextPuja}
          names={nextBooking?.sankalpamNames}
        />
      </div>

      {/* Row 2 — my pujas + upcoming events */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My yearly pujas</CardTitle>
            <Link to="/my/pujas" className="text-[13px] font-medium text-brand-500 hover:underline">
              Manage all
            </Link>
          </CardHeader>
          {activeBookings.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState
                Icon={Flame}
                title="No active sponsorships"
                detail="Sponsor a yearly puja and your family's names will be offered at every occurrence."
                action={
                  <Link to="/puja/yearly" className={buttonVariants({ size: 'sm' })}>
                    Browse yearly pujas
                  </Link>
                }
              />
            </div>
          ) : (
            <TableWrap className="rounded-none border-0 border-t border-line shadow-none">
              <Table>
                <THead>
                  <TR>
                    <TH>Deity</TH>
                    <TH>In whose name</TH>
                    <TH>Cadence</TH>
                    <TH>Next date</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {activeBookings.slice(0, 6).map((b) => {
                    const puja = PUJA_BY_ID.get(b.pujaCatalogId)
                    const next = nextByBooking.get(b.id)
                    return (
                      <TR key={b.id} className="hover:bg-tint/40">
                        <TD>
                          <p className="font-medium text-ink">{puja?.deity}</p>
                          <p className="text-[12px] text-muted">{puja?.name}</p>
                        </TD>
                        <TD className="max-w-[180px] truncate">{b.sankalpamNames.join(', ')}</TD>
                        <TD>{titleCase(b.cadence)}</TD>
                        <TD className="whitespace-nowrap">
                          {next ? fmtDate(next.scheduledAt, 'MMM d') : '—'}
                        </TD>
                        <TD>
                          <StatusPill status={b.status} />
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming events</CardTitle>
            <Link to="/events" className="text-[13px] font-medium text-brand-500 hover:underline">
              All
            </Link>
          </CardHeader>
          <ul className="divide-y divide-line border-t border-line">
            {events.slice(0, 5).map((e) => (
              <li key={e.id}>
                <Link
                  to={`/events/${e.slug}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-tint/40"
                >
                  <span className="w-11 shrink-0 rounded-md border border-line bg-tint/60 py-1 text-center">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-500">
                      {fmtDate(e.date, 'MMM')}
                    </span>
                    <span className="block font-serif text-[15px] leading-none">
                      {fmtDate(e.date, 'd')}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {e.title}
                    </span>
                    <span className="block text-[12px] text-muted">
                      {e.ticketPrice ? `${money(e.ticketPrice)} per seat` : 'Free · all welcome'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Row 3 — donations + tax receipt */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent donations</CardTitle>
            <Link
              to="/my/donations"
              className="text-[13px] font-medium text-brand-500 hover:underline"
            >
              My donations
            </Link>
          </CardHeader>
          {donations.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState
                Icon={Coins}
                title="No donations yet"
                detail="Your giving history will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {donations.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {titleCase(d.category)}
                    </p>
                    <p className="text-[12px] text-muted">
                      {fmtDate(d.createdAt)} · {titleCase(d.paymentMethod)}
                      {d.isRecurring ? ` · recurring ${d.recurringCadence}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{money(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ReceiptText className="size-4 text-brand-500" />
            <h3 className="font-serif text-[18px]">Tax receipts</h3>
          </div>
          <div className="mt-3 rounded-[10px] border border-line bg-tint/50 p-3.5">
            <p className="text-[13.5px] font-medium text-ink">
              {thisYear} Tax Summary — ready Jan {thisYear + 1}
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {money(ytd)} recorded so far this year across{' '}
              {donations.filter((d) => new Date(d.createdAt).getFullYear() === thisYear).length}{' '}
              gifts.
            </p>
          </div>
          <Link
            to="/my/receipts"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-3 w-full')}
          >
            <Download />
            Download {thisYear - 1} statement (PDF preview)
          </Link>
          {membership ? (
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-[12.5px] text-muted">Your membership</span>
              <TierBadge tier={membership.tier} />
            </div>
          ) : null}
        </Card>
      </div>
    </>
  )
}
