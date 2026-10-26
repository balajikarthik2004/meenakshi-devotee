import { CreditCard, Landmark, Lock, ShieldCheck } from 'lucide-react'
import type { KitchenOrder } from '@/lib/data/types'
import { Field, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CardDetails {
  number: string
  expiry: string
  cvc: string
  name: string
}

export const emptyCard = (): CardDetails => ({ number: '', expiry: '', cvc: '', name: '' })

/** Digits only, in groups of four — what a card number looks like while you type it. */
export function formatCardNumber(raw: string): string {
  return (raw.match(/\d/g) ?? [])
    .slice(0, 16)
    .join('')
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

/** `MM/YY`, with the slash inserted for you. */
export function formatExpiry(raw: string): string {
  const d = (raw.match(/\d/g) ?? []).slice(0, 4).join('')
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

/**
 * Whether the card fields are filled in well enough to pretend to charge.
 *
 * Length and shape only. There is no Luhn check and no issuer lookup, because there
 * is no payment processor behind this — inventing a stricter validator would imply a
 * rigour the app does not have and would reject perfectly good test cards.
 */
export function cardLooksComplete(c: CardDetails): boolean {
  const digits = (c.number.match(/\d/g) ?? []).length
  const [mm, yy] = c.expiry.split('/')
  return (
    digits === 16 &&
    !!mm &&
    mm.length === 2 &&
    Number(mm) >= 1 &&
    Number(mm) <= 12 &&
    !!yy &&
    yy.length === 2 &&
    c.cvc.length >= 3 &&
    c.name.trim().length > 1
  )
}

/**
 * How the devotee is going to pay for their food.
 *
 * Two genuinely different things happen depending on the answer, so the choice is
 * made as two cards rather than two radio dots in a row: paying by card means
 * nothing to do at the counter but your token, and paying at the counter means the
 * kitchen starts cooking on trust and you settle when you collect. A devotee who
 * misreads that arrives at a hatch either holding money they do not need or owing
 * money they did not expect, so each option says what it costs them in attention.
 *
 * The card fields are a mock. They are labelled as one, in the open, rather than
 * quietly accepting a real card number into an app with no processor behind it.
 */
export function CafeteriaPayment({
  method,
  onMethod,
  card,
  onCard,
  total,
  className,
}: {
  method: KitchenOrder['paymentMethod']
  onMethod: (m: KitchenOrder['paymentMethod']) => void
  card: CardDetails
  onCard: (c: CardDetails) => void
  total: number
  className?: string
}) {
  const set = (patch: Partial<CardDetails>) => onCard({ ...card, ...patch })

  return (
    <div className={cn('min-w-0', className)}>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        How you’ll pay
      </p>

      <div className="grid gap-2">
        <Option
          Icon={CreditCard}
          label="Pay now by card"
          blurb="Nothing to settle at the counter — just show your token."
          selected={method === 'card'}
          onSelect={() => onMethod('card')}
        />
        <Option
          Icon={Landmark}
          label="Pay at the counter"
          blurb="The kitchen starts cooking now; you pay when you collect."
          selected={method === 'cash-at-counter'}
          onSelect={() => onMethod('cash-at-counter')}
        />
      </div>

      {method === 'card' ? (
        <div className="mt-3 rounded-[10px] border border-line bg-tint/40 p-3.5">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <Lock className="size-3" />
            Demonstration only — no card is charged and nothing is stored.
          </p>

          <div className="space-y-2.5">
            <Field label="Card number" htmlFor="pay-num">
              <Input
                id="pay-num"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                value={card.number}
                onChange={(e) => set({ number: formatCardNumber(e.target.value) })}
                className="font-mono tracking-[0.04em]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Expiry" htmlFor="pay-exp">
                <Input
                  id="pay-exp"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
                  className="font-mono"
                />
              </Field>
              <Field label="CVC" htmlFor="pay-cvc">
                <Input
                  id="pay-cvc"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123"
                  value={card.cvc}
                  onChange={(e) =>
                    set({ cvc: (e.target.value.match(/\d/g) ?? []).slice(0, 4).join('') })
                  }
                  className="font-mono"
                />
              </Field>
            </div>

            <Field label="Name on card" htmlFor="pay-name">
              <Input
                id="pay-name"
                autoComplete="off"
                placeholder="As printed on the card"
                value={card.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
          </div>

          <p className="mt-2.5 flex items-start gap-1.5 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-muted">
            <ShieldCheck className="mt-px size-3.5 shrink-0 text-leaf-600" />
            <span>
              In production this panel is replaced by the processor’s own hosted fields, so card
              numbers never reach the temple’s servers.
            </span>
          </p>
        </div>
      ) : (
        <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-saffron-400/40 bg-saffron-400/[0.09] p-3 text-[12.5px] leading-relaxed text-ink">
          <Landmark className="mt-px size-3.5 shrink-0 text-brand-600" />
          <span>
            Bring <span className="font-semibold">${total.toFixed(2)}</span> to the cafeteria
            counter. Card and cash are both taken there.
          </span>
        </p>
      )}
    </div>
  )
}

function Option({
  Icon,
  label,
  blurb,
  selected,
  onSelect,
}: {
  Icon: typeof CreditCard
  label: string
  blurb: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-[10px] border p-3 text-left transition-colors',
        selected
          ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
          : 'border-line bg-card hover:border-brand-300',
      )}
    >
      <span
        className={cn(
          'mt-px grid size-7 shrink-0 place-items-center rounded-[8px]',
          selected ? 'bg-brand-500 text-white' : 'bg-tint text-muted',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        <span className="block text-[12px] leading-snug text-muted">{blurb}</span>
      </span>
    </button>
  )
}
