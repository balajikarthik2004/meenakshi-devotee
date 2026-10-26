import { Check, Clock, UtensilsCrossed, X } from 'lucide-react'
import type { KitchenOrder } from '@/lib/data/types'
import { Card } from '@/components/ui/card'
import { ORDER_STEPS, stepIndex } from '@/lib/kitchen'
import { cn, fmtDate, money } from '@/lib/utils'

/**
 * The devotee's own ticket, live.
 *
 * The token is the entire point of this component and is sized accordingly: it is
 * what gets called across a serving hatch and what the devotee holds a phone up to
 * show. Everything else on the card is smaller than it, including the price.
 *
 * The three steps are drawn even before they happen, because an order that shows only
 * its current state gives no sense of how much is left — and a devotee deciding
 * whether to sit down or wait at the counter is asking exactly that.
 */
export function OrderTicket({ order, className }: { order: KitchenOrder; className?: string }) {
  const step = stepIndex(order.status)
  const cancelled = order.status === 'cancelled'
  const ready = order.status === 'ready'

  const dueBy = new Date(new Date(order.placedAt).getTime() + order.promisedMinutes * 60000)

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* The token block. Deep brand field when it is ready to collect, so a glance
          at a phone on a table tells you to get up. */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors',
          ready ? 'bg-leaf-500 text-white' : cancelled ? 'bg-tint' : 'bg-brand-500 text-white',
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.12em]',
              cancelled ? 'text-muted' : 'text-white/75',
            )}
          >
            Your token
          </p>
          <p
            className={cn(
              'font-serif text-[40px] leading-none tabular-nums',
              cancelled && 'text-muted line-through',
            )}
          >
            {order.token}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn('text-[13px] font-semibold', cancelled ? 'text-muted' : 'text-white/90')}
          >
            {cancelled ? 'Cancelled' : ready ? 'Ready to collect' : 'Being prepared'}
          </p>
          <p className={cn('text-[12px]', cancelled ? 'text-muted' : 'text-white/70')}>
            {cancelled
              ? (order.cancelReason ?? 'No longer in the kitchen')
              : ready
                ? 'Show this at the counter'
                : `Ready by about ${fmtDate(dueBy, 'h:mm a')}`}
          </p>
        </div>
      </div>

      {!cancelled ? (
        <ol className="flex items-stretch border-b border-line">
          {ORDER_STEPS.map((s, i) => {
            const done = step > i
            const now = step === i
            return (
              <li
                key={s.status}
                className={cn(
                  'relative flex-1 px-3 py-3 text-center',
                  i > 0 && 'border-l border-line',
                  now && 'bg-tint/60',
                )}
              >
                <span
                  className={cn(
                    'mx-auto grid size-7 place-items-center rounded-full text-[12px] font-semibold',
                    done
                      ? 'bg-leaf-500 text-white'
                      : now
                        ? 'bg-brand-500 text-white'
                        : 'bg-line text-muted',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <p
                  className={cn(
                    'mt-1.5 text-[12.5px] font-medium',
                    now ? 'text-ink' : done ? 'text-leaf-600' : 'text-muted',
                  )}
                >
                  {s.label}
                </p>
              </li>
            )
          })}
        </ol>
      ) : null}

      <div className="p-5">
        <ul className="divide-y divide-line">
          {order.lines.map((l) => (
            <li
              key={l.itemId}
              className="flex items-baseline justify-between gap-3 py-2 text-[13.5px]"
            >
              <span className="min-w-0">
                <span className="mr-2 font-semibold tabular-nums text-brand-600">{l.qty}×</span>
                {l.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {money(l.unitPrice * l.qty, true)}
              </span>
            </li>
          ))}
        </ul>

        {order.note ? (
          <p className="mt-3 rounded-[9px] border border-line bg-tint/60 p-2.5 text-[12.5px] italic text-muted">
            “{order.note}”
          </p>
        ) : null}

        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[13px]">
          <Row label="Food" value={money(order.subtotal, true)} />
          {order.donationAmount > 0 ? (
            <Row label="Annadanam round-up" value={money(order.donationAmount, true)} />
          ) : null}
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5">
            <dt className="font-medium">Total</dt>
            <dd className="text-[17px] font-medium tabular-nums">{money(order.total, true)}</dd>
          </div>
        </dl>

        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
          {order.paymentMethod === 'card' ? (
            <>
              <Check className="size-3.5 text-leaf-600" />
              Paid by card
            </>
          ) : (
            <>
              <Clock className="size-3.5" />
              Pay at the counter when you collect
            </>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5">
            {cancelled ? <X className="size-3.5" /> : <UtensilsCrossed className="size-3.5" />}
            Ordered {fmtDate(order.placedAt, 'h:mm a')}
          </span>
        </p>
      </div>
    </Card>
  )
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
)
