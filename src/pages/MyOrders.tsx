import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Coins, RotateCcw, UtensilsCrossed, Wallet } from 'lucide-react'
import type { KitchenOrder } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { OrderTicket } from '@/components/shared/OrderTicket'
import { StatTile } from '@/components/shared/StatTile'
import { StatusPill } from '@/components/shared/badges'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { MENU_BY_ID } from '@/lib/data/mock'
import { listOrdersFor } from '@/lib/data/api'
import { useDonorIdentity } from '@/lib/donor'
import { useAsync } from '@/lib/hooks'
import { isActive } from '@/lib/kitchen'
import { cn, fmtDate, money } from '@/lib/utils'

/**
 * Cafeteria orders, with anything still in the kitchen pulled to the top.
 *
 * A devotee opening this page is asking one of two questions — "is my food ready" or
 * "what did I order last time" — and the first is urgent in a way the second never
 * is. Live tickets render in full, with the token legible from arm's length.
 * Everything settled becomes a card below, because a row in a table cannot carry the
 * one thing that makes an old order useful: a look at what was in it, and a way to
 * order it again.
 */
export default function MyOrders() {
  const identity = useDonorIdentity()
  const navigate = useNavigate()
  const { data, loading, refresh } = useAsync(
    () => (identity ? listOrdersFor(identity) : Promise.resolve([])),
    [identity?.userId, identity?.contact.email, identity?.contact.phone],
  )

  const orders = useMemo(() => data ?? [], [data])
  const live = orders.filter((o) => isActive(o.status) || o.status === 'ready')
  const past = orders.filter((o) => !live.includes(o))

  const spent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
  const given = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.donationAmount, 0)

  /* Only while something is actually cooking. Polling a page of finished orders is
     a request every five seconds that can never change anything. */
  useEffect(() => {
    if (live.length === 0) return
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [live.length, refresh])

  /** Sends the devotee back to the board with the same dishes pre-selected. */
  const reorder = (order: KitchenOrder) => {
    const params = order.lines.map((l) => `${l.itemId}:${l.qty}`).join(',')
    navigate(`/kitchen?reorder=${encodeURIComponent(params)}`)
  }

  if (loading) {
    return (
      <>
        <PageHeader title="My orders" subtitle="Loading your cafeteria orders…" />
        <LoadingSkeleton variant="table" rows={4} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My orders"
        subtitle="Cafeteria orders, and the token for anything still in the kitchen."
        actions={
          <Link to="/kitchen" className={buttonVariants({ size: 'sm' })}>
            <UtensilsCrossed />
            Order food
          </Link>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          Icon={UtensilsCrossed}
          title="No orders yet"
          detail="The temple kitchen cooks fresh tiffin and meals during published hours. Order ahead and collect at the counter."
          action={
            <Link to="/kitchen" className={buttonVariants({ size: 'sm' })}>
              See the cafeteria board
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {live.length > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-serif text-[18px]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
                </span>
                In the kitchen now
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {live.map((o) => (
                  <OrderTicket key={o.id} order={o} />
                ))}
              </div>
            </section>
          ) : null}

          {past.length > 0 ? (
            <section>
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <StatTile
                  label="Orders placed"
                  value={orders.length}
                  sub={`${past.filter((o) => o.status === 'collected').length} collected`}
                  Icon={UtensilsCrossed}
                />
                <StatTile
                  label="Spent at the cafeteria"
                  value={money(spent, true)}
                  sub="Across every order"
                  Icon={Wallet}
                  tone="leaf"
                />
                <StatTile
                  label="Added to annadanam"
                  value={money(given, true)}
                  sub="Round-ups, receipted as gifts"
                  Icon={Coins}
                  tone="gold"
                />
              </div>

              <h2 className="mb-3 font-serif text-[18px]">Earlier orders</h2>
              <div className="space-y-3">
                {past.map((o) => (
                  <PastOrderCard key={o.id} order={o} onReorder={() => reorder(o)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <Card className="mt-6 p-4 text-[12.5px] leading-relaxed text-muted">
        Food is collected from the cafeteria counter — the temple does not deliver. An order can be
        cancelled only while the kitchen has not started it; once a pan is on the heat the food
        exists, and cancelling it wastes it.
      </Card>
    </>
  )
}

/**
 * A finished order, as something you might want to repeat.
 *
 * Led by the food rather than by the date: the thumbnails are what let somebody
 * recognise an order at a glance, which is the whole reason to look at this list.
 */
function PastOrderCard({ order, onReorder }: { order: KitchenOrder; onReorder: () => void }) {
  const cancelled = order.status === 'cancelled'
  const thumbs = order.lines
    .map((l) => ({ line: l, item: MENU_BY_ID.get(l.itemId) }))
    .filter((t) => t.item?.image)
    .slice(0, 4)

  return (
    <Card className={cn('overflow-hidden transition-colors', cancelled && 'opacity-75')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        {/* A short strip of what was in it. Overlapped rather than laid out in a
            row, so four dishes take the space of two and the card stays a row. */}
        {thumbs.length > 0 ? (
          <div className="flex shrink-0 -space-x-3">
            {thumbs.map(({ line, item }) => (
              <img
                key={line.itemId}
                src={item!.image}
                alt=""
                loading="lazy"
                className="size-11 rounded-full border-2 border-card object-cover"
              />
            ))}
            {order.lines.length > thumbs.length ? (
              <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-card bg-tint text-[11.5px] font-semibold text-muted">
                +{order.lines.length - thumbs.length}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-semibold text-ink">{order.token}</span>
            <StatusPill status={order.status} />
            <span className="text-[12px] text-muted">
              {fmtDate(order.placedAt, 'EEE d MMM, h:mm a')}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {order.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}
          </p>
          {cancelled && order.cancelReason ? (
            <p className="mt-0.5 text-[12px] italic text-brand-600">{order.cancelReason}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-right">
            <span className="block text-[16px] font-medium tabular-nums text-ink">
              {money(order.total, true)}
            </span>
            {order.donationAmount > 0 ? (
              <span className="block text-[11.5px] text-leaf-600">
                incl. {money(order.donationAmount, true)} annadanam
              </span>
            ) : null}
          </span>
          <Button variant="outline" size="sm" onClick={onReorder}>
            <RotateCcw />
            Reorder
          </Button>
        </div>
      </div>
    </Card>
  )
}
