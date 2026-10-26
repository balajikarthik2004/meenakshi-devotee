import { Clock, UtensilsCrossed } from 'lucide-react'
import type { KitchenStatus } from '@/lib/kitchen'
import { DAY_NAMES, MEAL_LABEL, fmtClock, lastOrderMinute, toMinutes } from '@/lib/kitchen'
import { cn } from '@/lib/utils'

/**
 * Whether the kitchen is open, said once, at the top of the page.
 *
 * Three states, not two. "Serving, ordering open" and "serving, last orders gone" are
 * genuinely different situations, and telling a devotee the cafeteria is closed while
 * they can see people eating in it is the version of this component that gets a
 * volunteer shouted at. The closed state's only useful content is when it opens
 * again, so that is what it leads with.
 */
export function KitchenStatusBanner({
  status,
  className,
}: {
  status: KitchenStatus
  className?: string
}) {
  const next = status.next
  const nextLine = next
    ? `${DAY_NAMES[next.date.getDay()]} ${fmtClock(toMinutes(next.window.opens))} — ${MEAL_LABEL[next.window.meal].toLowerCase()}`
    : 'See the published times below'

  const tone = status.ordering
    ? 'border-leaf-500/30 bg-leaf-500/[0.07]'
    : status.serving
      ? 'border-saffron-400/40 bg-saffron-400/[0.09]'
      : 'border-line bg-tint/60'

  const dot = status.ordering ? 'bg-leaf-500' : status.serving ? 'bg-saffron-500' : 'bg-muted'

  return (
    <div className={cn('rounded-[12px] border p-4', tone, className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            {status.ordering ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-leaf-500 opacity-60" />
            ) : null}
            <span className={cn('relative inline-flex size-2.5 rounded-full', dot)} />
          </span>
          <span className="text-[14px] font-semibold text-ink">
            {status.ordering
              ? 'The kitchen is open'
              : status.serving
                ? 'Online orders have closed'
                : 'The kitchen is closed'}
          </span>
        </span>

        {status.ordering && status.current ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
            <UtensilsCrossed className="size-3.5" />
            {MEAL_LABEL[status.current.meal]} until {fmtClock(toMinutes(status.current.closes))}
          </span>
        ) : null}

        {/* A countdown only once it is actually worth hurrying for. Half an hour out
            it is information; two hours out it is pressure. */}
        {status.ordering && (status.minutesToLastOrder ?? 0) <= 45 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-400/25 px-2.5 py-0.5 text-[12.5px] font-medium text-brand-700">
            <Clock className="size-3.5" />
            Last online orders in {status.minutesToLastOrder} min
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        {status.ordering && status.current ? (
          <>
            Order here and collect at the cafeteria counter. Online orders for this service close at{' '}
            {fmtClock(lastOrderMinute(status.current))}.
          </>
        ) : status.serving && status.current ? (
          <>
            The counter is still serving until {fmtClock(toMinutes(status.current.closes))} — you
            can order in person. Online ordering reopens {nextLine}.
          </>
        ) : (
          <>Online ordering opens again {nextLine}.</>
        )}
      </p>
    </div>
  )
}
