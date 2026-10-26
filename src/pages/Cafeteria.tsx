import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CalendarClock,
  Flame,
  Leaf,
  Loader2,
  Minus,
  Nut,
  Plus,
  ShoppingBasket,
  UtensilsCrossed,
} from 'lucide-react'
import type { KitchenOrder, MenuItem, OrderLine } from '@/lib/data/types'
import type { KitchenStatus } from '@/lib/kitchen'
import { PageHeader } from '@/components/layout/layouts'
import type { CardDetails } from '@/components/shared/CafeteriaPayment'
import {
  CafeteriaPayment,
  cardLooksComplete,
  emptyCard,
} from '@/components/shared/CafeteriaPayment'
import { KitchenStatusBanner } from '@/components/shared/KitchenStatusBanner'
import { OrderTicket } from '@/components/shared/OrderTicket'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { MENU_CATEGORIES } from '@/lib/data/mock'
import { cancelMyOrder, getOrder, listMenu, placeOrder } from '@/lib/data/api'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import {
  DAY_NAMES,
  KITCHEN_WINDOWS,
  MEAL_LABEL,
  estimateMinutes,
  fmtClock,
  isItemServed,
  kitchenStatusAt,
  linesSubtotal,
  toMinutes,
  windowsFor,
} from '@/lib/kitchen'
import { cn, money } from '@/lib/utils'

const ROUND_UPS = [0, 1, 2, 5]

/**
 * The temple cafeteria: order here, collect at the counter.
 *
 * Built around one rule — the kitchen takes orders only while it is actually cooking.
 * Everything on the page reads that from `kitchenStatusAt`: the banner, the menu
 * filter, the checkout button. The API re-checks it on submit rather than trusting
 * this page, because a tab left open across the end of a service would otherwise
 * send breakfast through at lunchtime.
 *
 * There is no delivery and the page never implies one. A temple kitchen run by
 * volunteers serves from a hatch, so the whole flow ends at a token and a counter.
 */
export default function Cafeteria() {
  const user = useAuthStore((s) => s.user)
  const { toast } = useToast()

  /* The clock is state, not a read: the page has to cross the last-orders cut-off
     while somebody is sitting on it, and a status computed once at mount would keep
     the checkout button alive for an hour after the kitchen stopped taking tickets. */
  const [params, setParams] = useSearchParams()

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const status = useMemo(() => kitchenStatusAt(now), [now])

  useEffect(() => {
    if (!params.get('reorder')) return
    const next = new URLSearchParams(params)
    next.delete('reorder')
    setParams(next, { replace: true })
  }, [params, setParams])

  const { data: menu, loading } = useAsync(() => listMenu(), [])
  /**
   * Seeded from `?reorder=itemId:qty,…`, which "Reorder" on the orders page sends.
   *
   * Read once, into the initial state, and then stripped from the URL — leaving it
   * there would re-fill the tray every time the component remounted, including
   * after the devotee had deliberately emptied it.
   */
  const [cart, setCart] = useState<Record<string, number>>(() => {
    const raw = params.get('reorder')
    if (!raw) return {}
    const out: Record<string, number> = {}
    for (const pair of raw.split(',')) {
      const [id, qty] = pair.split(':')
      const n = Number(qty)
      if (id && Number.isFinite(n) && n > 0) out[id] = Math.min(20, Math.floor(n))
    }
    return out
  })
  const [roundUp, setRoundUp] = useState(0)
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<KitchenOrder['paymentMethod']>('card')
  const [card, setCard] = useState<CardDetails>(emptyCard)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<KitchenOrder | null>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const [activeCat, setActiveCat] = useState<string>('')

  /* Once an order is in, this page becomes that order. Polling is how the devotee
     sees the kitchen accept it without refreshing — they are standing in the
     cafeteria looking at the phone, which is exactly when a stale page is useless. */
  useEffect(() => {
    if (!placed || placed.status === 'collected' || placed.status === 'cancelled') return
    const t = setInterval(async () => {
      const fresh = await getOrder(placed.id)
      if (fresh) setPlaced(fresh)
    }, 5000)
    return () => clearInterval(t)
  }, [placed])

  const servable = useMemo(() => {
    if (!menu || !status.current) return []
    return menu.filter((m) => isItemServed(m, status.current!.meal, now.getDay()))
  }, [menu, status, now])

  /**
   * The whole board, always listed.
   *
   * A closed cafeteria used to show nothing at all, which answered the wrong
   * question: somebody looking at this page on a Monday is usually deciding whether
   * to come on Tuesday, and "we are closed" with no menu tells them nothing about
   * whether it is worth the trip. So the dishes are always on the page, and what
   * changes is whether they can be added to a tray.
   */
  const board = useMemo(() => menu ?? [], [menu])

  const orderableNow = (item: MenuItem) => servable.some((m) => m.id === item.id)

  /**
   * The board cut into its courses, empty ones dropped.
   *
   * Everything is on one page now rather than behind a filter. A filter made the
   * devotee click five times to see a menu of twenty-four dishes and never showed
   * them the whole thing; the rail beside it jumps instead of hiding, which is how
   * a menu is actually read.
   */
  const sections = useMemo(
    () =>
      MENU_CATEGORIES.map((c) => ({
        ...c,
        items: board.filter((m) => m.category === c.key),
      })).filter((c) => c.items.length > 0),
    [board],
  )

  /**
   * Lights the rail entry for whatever course is on screen.
   *
   * The top fifth of the viewport is the read line: a section counts as "the one you
   * are looking at" once its heading reaches roughly where the eye sits, not when it
   * first peeks in at the bottom. Without that the rail flickers two entries ahead
   * of the reader, which is worse than not highlighting at all.
   */
  useEffect(() => {
    if (loading) return
    const headings = Array.from(document.querySelectorAll<HTMLElement>('[data-menu-section]'))
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveCat(visible.target.getAttribute('data-menu-section') ?? '')
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
    /* Rebuilt only when the set of headings can actually have changed. Left with no
       dependency list it tore down and re-created the observer on every render, and
       since the observer itself calls `setActiveCat`, that is a render that schedules
       the work that causes the next render. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sections.length])

  const jumpTo = (key: string) => {
    document
      .querySelector(`[data-menu-section="${key}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const lines: OrderLine[] = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = servable.find((m) => m.id === itemId)
          return { itemId, name: item?.name ?? '', qty, unitPrice: item?.price ?? 0 }
        })
        .filter((l) => l.name),
    [cart, servable],
  )

  const subtotal = linesSubtotal(lines)
  const total = subtotal + roundUp
  const portions = lines.reduce((s, l) => s + l.qty, 0)
  const eta = menu ? estimateMinutes(lines, menu) : 0

  const setQty = (id: string, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta)
      const copy = { ...c }
      if (next === 0) delete copy[id]
      else copy[id] = next
      return copy
    })

  const submit = async () => {
    setError(null)
    if (!name.trim() || phone.trim().length < 7) {
      setError('We need a name and a phone number to call out your order.')
      return
    }
    if (method === 'card' && !cardLooksComplete(card)) {
      setError('Please complete the card details, or choose to pay at the counter.')
      return
    }
    setBusy(true)
    const result = await placeOrder({
      userId: user?.id ?? null,
      contactName: name.trim(),
      contactPhone: phone.trim(),
      lines,
      donationAmount: roundUp,
      paymentMethod: method,
      note,
    })
    setBusy(false)

    if (!result.ok) {
      setError(result.reason)
      return
    }
    setPlaced(result.order)
    setCart({})
    setCard(emptyCard())
    setRoundUp(0)
    setNote('')
    toast(`Order ${result.order.token} sent to the kitchen`, {
      detail: 'You will see it move along as the kitchen picks it up.',
    })
  }

  const cancel = async () => {
    if (!placed) return
    const updated = await cancelMyOrder(placed.id)
    if (updated) {
      setPlaced(updated)
      toast('Order cancelled')
    } else {
      toast('Too late to cancel', {
        detail: 'The kitchen has already started cooking. Please speak to the counter.',
      })
    }
  }

  /* ------------------------------------------------------- the live ticket */

  if (placed) {
    return (
      <>
        <PageHeader
          title="Your order"
          subtitle="Collect from the cafeteria counter when your token is called."
        />
        <div className="mx-auto max-w-lg space-y-4">
          <OrderTicket order={placed} />

          <div className="flex flex-wrap justify-center gap-2.5">
            {placed.status === 'placed' ? (
              <Button variant="outline" onClick={cancel}>
                Cancel this order
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setPlaced(null)}>
              Order something else
            </Button>
            <Link to="/my/orders" className={buttonVariants({})}>
              My orders
            </Link>
          </div>

          <Card className="p-4 text-[12.5px] leading-relaxed text-muted">
            The cafeteria counter is beside the annadanam hall. Show your token{' '}
            <span className="font-medium text-ink">{placed.token}</span> — there is no need to queue
            before it turns green.
          </Card>
        </div>
      </>
    )
  }

  /* ------------------------------------------------------------ the board */

  return (
    <>
      <PageHeader
        title="Temple cafeteria"
        subtitle="Cooked fresh in the temple kitchen. Order here and collect at the counter."
        actions={
          <Link to="/my/orders" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            My orders
          </Link>
        }
      />

      <KitchenStatusBanner status={status} className="mb-5" />

      {loading ? (
        <LoadingSkeleton variant="tiles" rows={4} />
      ) : (
        /* Three columns: where you are, what there is, and what you have chosen.
           The courses rail is narrow and fixed so the menu keeps the room. */
        <div className="grid gap-5 lg:grid-cols-[148px_minmax(0,1fr)] lg:items-start xl:grid-cols-[148px_minmax(0,1fr)_296px]">
          <CategoryRail sections={sections} active={activeCat} onJump={jumpTo} />

          <div className="min-w-0 space-y-5">
            {!status.ordering ? <ClosedNotice status={status} /> : null}

            {sections.length === 0 ? (
              <EmptyState
                Icon={UtensilsCrossed}
                title="The board is empty"
                detail="No dishes are listed yet."
              />
            ) : (
              sections.map((section) => (
                <section key={section.key} className="min-w-0">
                  {/* `scroll-mt` keeps the heading clear of the sticky chrome when
                      the rail jumps to it, rather than tucking it underneath. */}
                  <div
                    data-menu-section={section.key}
                    className="mb-2.5 scroll-mt-24 border-b border-line pb-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <h2 className="font-serif text-[19px] text-ink">{section.label}</h2>
                      <span className="text-[12px] text-muted">
                        {section.items.length} {section.items.length === 1 ? 'dish' : 'dishes'}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-muted">{section.blurb}</p>
                  </div>

                  <div className="grid gap-3">
                    {section.items.map((item) => (
                      <DishCard
                        key={item.id}
                        item={item}
                        qty={cart[item.id] ?? 0}
                        orderable={status.ordering && orderableNow(item)}
                        soldOut={!item.available}
                        onAdd={() => setQty(item.id, 1)}
                        onRemove={() => setQty(item.id, -1)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}

            {/* Only while the kitchen is open. When it is shut the times move to the
                right column, where the tray would be, rather than appearing twice. */}
            {status.ordering ? <ScheduleCard /> : null}
          </div>

          {/* The tray, or — when the kitchen is shut — the week's times in its place.
              A basket that cannot be used is worse than no basket: it invites
              somebody to fill it and then refuses them at the end. */}
          {!status.ordering ? (
            <div className="min-w-0 lg:col-span-2 xl:col-span-1">
              <ScheduleCard />
            </div>
          ) : (
            /* A tray with eight dishes, a note, two contact fields and a payment
               choice is taller than a laptop viewport, and a sticky card that
               overflows puts its own Place order button permanently off screen.
               So the card is a column: the heading and the total stay put, and
               only the middle scrolls. */
            <Card
              ref={trayRef}
              className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden lg:col-span-2 xl:sticky xl:top-6 xl:col-span-1"
            >
              <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-tint/50 px-5 py-3.5">
                <ShoppingBasket className="size-4 text-brand-500" />
                <h2 className="font-serif text-[17px]">Your tray</h2>
                {portions > 0 ? (
                  <span className="ml-auto rounded-full bg-brand-500 px-2 py-0.5 text-[11.5px] font-semibold text-white">
                    {portions}
                  </span>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {lines.length === 0 ? (
                  <p className="text-[13.5px] text-muted">
                    Nothing chosen yet. Tap a dish to add it.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y divide-line">
                      {lines.map((l) => (
                        <li
                          key={l.itemId}
                          className="flex items-center justify-between gap-3 py-2 text-[13.5px]"
                        >
                          <span className="min-w-0 truncate">
                            <span className="mr-1.5 font-semibold tabular-nums text-brand-600">
                              {l.qty}×
                            </span>
                            {l.name}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="tabular-nums text-muted">
                              {money(l.unitPrice * l.qty, true)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(l.itemId, -1)}
                              aria-label={`Remove one ${l.name}`}
                              className="grid size-6 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand-300 hover:text-brand-600"
                            >
                              <Minus className="size-3" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* A round-up, not a tip. The kitchen is volunteers; the money goes
                      to the annadanam fund and lands in the ledger as a donation. */}
                    <div className="mt-4 border-t border-line pt-3.5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Add to the annadanam fund
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-muted">
                        Feeds a devotee who cannot pay. Receipted as a donation.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ROUND_UPS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            aria-pressed={roundUp === amount}
                            onClick={() => setRoundUp(amount)}
                            className={cn(
                              'rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors',
                              roundUp === amount
                                ? 'border-brand-500 bg-brand-500 text-white'
                                : 'border-line bg-card text-ink hover:border-brand-300',
                            )}
                          >
                            {amount === 0 ? 'No thanks' : money(amount)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field
                      label="A note for the kitchen"
                      hint="optional"
                      htmlFor="kt-note"
                      className="mt-4 border-t border-line pt-3.5"
                    >
                      <Input
                        id="kt-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Less spicy, please"
                      />
                    </Field>

                    <div className="mt-4 grid gap-3 border-t border-line pt-3.5 sm:grid-cols-2">
                      <Field label="Name" htmlFor="kt-name">
                        <Input
                          id="kt-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Called out at the counter"
                        />
                      </Field>
                      <Field label="Phone" htmlFor="kt-phone">
                        <Input
                          id="kt-phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(281) 555-0142"
                        />
                      </Field>
                    </div>

                    <CafeteriaPayment
                      className="mt-4 border-t border-line pt-3.5"
                      method={method}
                      onMethod={setMethod}
                      card={card}
                      onCard={setCard}
                      total={total}
                    />

                    <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[13.5px]">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted">Food</dt>
                        <dd className="tabular-nums">{money(subtotal, true)}</dd>
                      </div>
                      {roundUp > 0 ? (
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-muted">Annadanam</dt>
                          <dd className="tabular-nums">{money(roundUp, true)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </>
                )}
              </div>

              {/* Pinned. Whatever is happening in the scroll area above, the figure
                  being charged and the button that charges it are both on screen. */}
              <div className="shrink-0 border-t border-line bg-card p-5">
                {error ? (
                  <p className="mb-3 flex items-start gap-2 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.06] p-2.5 text-[12.5px] text-brand-700">
                    <AlertCircle className="mt-px size-3.5 shrink-0" />
                    {error}
                  </p>
                ) : null}

                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] font-medium">Total</span>
                  <span className="text-[24px] tabular-nums">{money(total, true)}</span>
                </div>
                {lines.length > 0 ? (
                  <p className="mt-0.5 text-[12px] text-muted">
                    Ready in about {eta} minutes once the kitchen accepts it.
                  </p>
                ) : null}

                <Button
                  size="lg"
                  className="mt-3 w-full"
                  onClick={submit}
                  disabled={busy || lines.length === 0 || !status.ordering}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <UtensilsCrossed />}
                  {busy ? 'Sending to the kitchen…' : `Place order · ${money(total, true)}`}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* On a phone the tray sits under twenty-five dishes, so a devotee who has
          chosen four of them has to scroll past the rest to find out what they owe.
          This bar carries the running total with them and jumps to the tray. It is
          deliberately absent on desktop, where the tray is already in view. */}
      {status.ordering && portions > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 p-3 shadow-[0_-6px_20px_rgba(64,34,12,0.1)] backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => trayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex w-full items-center gap-3 rounded-[10px] bg-brand-500 px-4 py-3 text-white transition-colors active:bg-brand-600"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20 text-[12px] font-bold">
              {portions}
            </span>
            <span className="min-w-0 flex-1 text-left text-[14px] font-semibold">
              View your tray
            </span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">
              {money(total, true)}
            </span>
          </button>
        </div>
      ) : null}
      {/* Keeps the last dish clear of the bar above rather than under it. */}
      {status.ordering && portions > 0 ? <div className="h-20 lg:hidden" aria-hidden /> : null}
    </>
  )
}

/* ------------------------------------------------------------------ pieces */

/**
 * Why the tray is missing, said loudly and once.
 *
 * Deliberately the most emphatic block on the page when it appears. The banner at
 * the top already states the kitchen's state in a sentence, but somebody who has
 * scrolled to the dosas needs telling again at the point where they are about to
 * try to order one — and being told *when it reopens* is the only useful content,
 * so that is what it is built around.
 */
function ClosedNotice({ status }: { status: KitchenStatus }) {
  const next = status.next
  const closedAllDay = status.reason === 'closed-today'
  /* "Closed today" and "finished for today" are different facts and a devotee acts
     on them differently. Monday is dark from the start; a Wednesday evening is not —
     the kitchen cooked lunch and has shut. The question is whether this weekday has
     any services at all, not whether the next one happens to fall today. */
  const servesLaterToday = windowsFor(new Date().getDay()).length > 0

  return (
    <div className="overflow-hidden rounded-[12px] border-2 border-brand-500 bg-brand-500 text-white shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
        <AlertCircle className="size-5 shrink-0" />
        <p className="min-w-0 flex-1 text-[15px] font-semibold">
          {closedAllDay
            ? servesLaterToday
              ? 'The temple kitchen has finished for today'
              : 'The temple kitchen is closed today'
            : status.serving
              ? 'Online orders for this service have closed'
              : 'The kitchen is between services'}
        </p>
      </div>
      <div className="bg-white/10 px-4 py-2.5 text-[13px] leading-relaxed">
        {next ? (
          <>
            <span className="font-semibold">
              Opens again {DAY_NAMES[next.date.getDay()]} at{' '}
              {fmtClock(toMinutes(next.window.opens))}
            </span>{' '}
            for {MEAL_LABEL[next.window.meal].toLowerCase()}. The full menu is below — you can see
            what is cooked, but nothing can be added to a tray until the kitchen opens.
          </>
        ) : (
          <>The full menu is below. Ordering reopens with the kitchen.</>
        )}
      </div>
    </div>
  )
}

function DishCard({
  item,
  qty,
  orderable,
  soldOut,
  onAdd,
  onRemove,
}: {
  item: MenuItem
  qty: number
  /** Cooked at the service running right now, and the site is taking tickets. */
  orderable: boolean
  soldOut: boolean
  onAdd: () => void
  onRemove: () => void
}) {
  const chosen = qty > 0

  return (
    <Card
      className={cn(
        'group relative flex min-w-0 gap-0 overflow-hidden p-0 transition-all duration-200',
        chosen
          ? 'border-brand-500/50 ring-1 ring-brand-500/20'
          : 'hover:border-brand-200 hover:shadow-[var(--shadow)]',
      )}
    >
      {/* A fixed-width strip rather than a banner across the top. At two cards per
          row a 16:9 header would push the price and the Add button below the fold
          on a phone, and the thing a hungry person scans is the name and the cost —
          the photograph is there to confirm a choice, not to make the page a gallery. */}
      <div className="relative w-[104px] shrink-0 self-stretch overflow-hidden bg-tint sm:w-[120px]">
        <DishThumb item={item} />
        {/* The photograph always stays in full colour.
            It was greyscaled while a dish could not be ordered, which looked
            reasonable on one card and was a disaster on the page: the kitchen is
            dark every Monday, so the entire menu rendered grey on the exact day
            somebody is browsing it to decide whether to come tomorrow. Food has to
            look like food. Availability is said in words on the row below instead,
            where it cannot be mistaken for the picture being broken. */}
        {soldOut ? (
          <span className="absolute inset-x-0 bottom-0 bg-brand-600/90 py-0.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white">
            Sold out
          </span>
        ) : null}
        {chosen ? (
          <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-brand-500 text-[12px] font-bold text-white shadow-[var(--shadow-sm)]">
            {qty}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-[14.5px] font-medium leading-snug text-ink">
            {item.name}
            {item.tamilName ? (
              <span className="ml-1.5 text-[12px] font-normal text-muted">{item.tamilName}</span>
            ) : null}
          </h3>
          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
            {money(item.price, true)}
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted">
          {item.description}
        </p>

        {/* Only what varies gets a mark. Every dish here is vegetarian, so a green
            tick on all twenty-five of them would carry no information at all. */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {item.popular ? <Tag tone="gold">Popular</Tag> : null}
          {item.noOnionGarlic ? (
            <Tag tone="leaf">
              <Leaf className="size-3" />
              No onion or garlic
            </Tag>
          ) : null}
          {item.spicy ? (
            <Tag tone="brand">
              <Flame className="size-3" />
              Spicy
            </Tag>
          ) : null}
          {item.containsNuts ? (
            <Tag tone="neutral">
              <Nut className="size-3" />
              Nuts
            </Tag>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="min-w-0 text-[11.5px] leading-tight text-muted">
            {soldOut ? (
              <span className="font-medium text-brand-600">Not cooked today</span>
            ) : (
              <>
                {item.prepMinutes} min
                <br />
                {item.servedAt.map((m) => MEAL_LABEL[m].replace(' tiffin', '')).join(' · ')}
              </>
            )}
          </span>

          {!orderable ? (
            <span className="shrink-0 rounded-full bg-tint px-2.5 py-1 text-[11.5px] font-medium text-muted">
              Not now
            </span>
          ) : qty === 0 ? (
            <Button size="sm" variant="outline" onClick={onAdd} className="shrink-0">
              <Plus />
              Add
            </Button>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove one ${item.name}`}
                className="grid size-7 place-items-center rounded-full border border-line transition-colors hover:border-brand-300 hover:text-brand-600"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="min-w-[1.25rem] text-center text-[15px] font-semibold tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                onClick={onAdd}
                aria-label={`Add one ${item.name}`}
                className="grid size-7 place-items-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
              >
                <Plus className="size-3.5" />
              </button>
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * Where you are in the menu, and a way to the rest of it.
 *
 * A long menu feels navigable rather than endless when you can see where you are in
 * it, so the rail lists every course, highlights the one on screen, and jumps.
 *
 * It carried a per-course count of what was cooking right now, which was accurate
 * and useless: outside a service every one of them reads zero, and six zeroes down
 * the side of a menu reads as a broken page rather than as a closed kitchen. The
 * banner at the top already says the kitchen is shut, and each card says "Not now".
 *
 * Below `lg` it becomes a horizontal strip that scrolls sideways, because a vertical
 * rail on a phone is a column of links where the menu should be.
 */
function CategoryRail({
  sections,
  active,
  onJump,
}: {
  sections: { key: string; label: string }[]
  active: string
  onJump: (key: string) => void
}) {
  if (sections.length === 0) return null

  return (
    <nav
      aria-label="Menu courses"
      className={cn(
        'z-10 -mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6',
        'lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0',
        'lg:sticky lg:top-6 lg:self-start',
      )}
    >
      <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-muted lg:block">
        Courses
      </p>
      <ul className="flex gap-1.5 lg:flex-col lg:gap-0.5">
        {sections.map((c) => {
          const on = active === c.key
          return (
            <li key={c.key} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => onJump(c.key)}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'relative flex w-full items-center gap-2 whitespace-nowrap rounded-[9px] px-3 py-2 text-left text-[13px] font-medium transition-colors',
                  on
                    ? 'bg-brand-500/[0.08] text-brand-700'
                    : 'text-muted hover:bg-tint hover:text-ink',
                )}
              >
                {on ? (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 hidden h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500 lg:block"
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * The dish photograph, or an honest stand-in for it.
 *
 * Not every dish has a photograph that is actually of that dish — the only almond
 * milk on Commons is a supermarket carton, which says the wrong thing about a drink
 * this kitchen makes by hand. Rather than borrow a picture of something else, those
 * fall back to the dish's own initial on the temple's sand, which reads as a
 * deliberate tile instead of a broken image.
 */
function DishThumb({ item }: { item: MenuItem }) {
  if (!item.image) {
    return (
      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-saffron-100 to-tint">
        <span className="font-serif text-[30px] leading-none text-brand-500/35">
          {item.name.charAt(0)}
        </span>
      </div>
    )
  }
  return (
    <img
      src={item.image}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
    />
  )
}

function Tag({
  tone,
  children,
}: {
  tone: 'gold' | 'leaf' | 'brand' | 'neutral'
  children: React.ReactNode
}) {
  const tones = {
    gold: 'border-gold-500/30 bg-gold-500/10 text-gold-600',
    leaf: 'border-leaf-500/25 bg-leaf-500/[0.08] text-leaf-600',
    brand: 'border-brand-500/25 bg-brand-500/[0.06] text-brand-600',
    neutral: 'border-line bg-tint text-muted',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/** The week's services, in full. The only useful thing to show a closed kitchen. */
function ScheduleCard() {
  const todayIdx = new Date().getDay()
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line bg-tint/50 px-5 py-3.5">
        <CalendarClock className="size-4 text-brand-500" />
        <h2 className="font-serif text-[17px]">Kitchen times</h2>
      </div>
      <ul className="divide-y divide-line">
        {DAY_NAMES.map((day, i) => {
          const windows = windowsFor(i)
          return (
            <li
              key={day}
              className={cn(
                'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]',
                i === todayIdx && 'bg-saffron-400/[0.08]',
              )}
            >
              <span className={cn('font-medium', i === todayIdx ? 'text-ink' : 'text-muted')}>
                {day}
                {i === todayIdx ? (
                  <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-600">
                    Today
                  </span>
                ) : null}
              </span>
              {windows.length === 0 ? (
                <span className="text-muted">Closed</span>
              ) : (
                <span className="text-right text-muted">
                  {windows.map((w) => (
                    <span key={w.meal} className="block tabular-nums">
                      {fmtClock(toMinutes(w.opens))} – {fmtClock(toMinutes(w.closes))}
                      <span className="ml-1.5 text-[11.5px]">
                        {MEAL_LABEL[w.meal].toLowerCase()}
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">
        Online orders close {KITCHEN_WINDOWS[0] ? KITCHEN_WINDOWS[0].lastOrderMinutesBefore : 30} to
        60 minutes before each service ends, so the kitchen can finish what is already on the rail.
      </p>
    </Card>
  )
}
