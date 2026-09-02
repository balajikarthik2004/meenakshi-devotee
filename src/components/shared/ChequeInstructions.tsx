import { useState } from 'react'
import { Banknote, Check, /* Clock, */ Copy, MapPin } from 'lucide-react'
import { TEMPLE } from '@/lib/data/mock'
import { cn } from '@/lib/utils'

/** The address block, as it should be written on an envelope. */
const postalLines = [
  TEMPLE.name,
  TEMPLE.address,
  `${TEMPLE.city}, ${TEMPLE.state} ${TEMPLE.zip}`,
]

/**
 * Where to send a cheque, shown the moment "Check" is the chosen method.
 *
 * Deliberately an inline panel rather than a modal. The devotee needs this at the desk
 * where they actually write the cheque, which is minutes or days after this screen —
 * a dialog they must dismiss to carry on paying takes the address away exactly when it
 * starts being useful. Inline, it stays on the page, and it is repeated on the
 * confirmation screen with the reference number to write on the memo line.
 */
export function ChequeInstructions({
  reference,
  className,
}: {
  /** Booking or donation id, once one exists — written on the memo line. */
  reference?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(postalLines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is blocked in insecure contexts and by some browser settings. The
      // address is on screen either way, so this fails quietly rather than alarming.
    }
  }

  return (
    <div
      className={cn(
        'rounded-[10px] border border-saffron-400/50 bg-saffron-500/[0.07] p-4',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
        <Banknote className="size-4 shrink-0 text-saffron-600" />
        Paying by cheque
      </p>

      <dl className="mt-3 space-y-3 text-[13px]">
        <div>
          <dt className="text-[12px] uppercase tracking-[0.07em] text-muted">Make payable to</dt>
          <dd className="mt-0.5 font-medium text-ink">{TEMPLE.name}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.07em] text-muted">
            <MapPin className="size-3" />
            Mail or drop it at
          </dt>
          <dd className="mt-1 flex items-start justify-between gap-3">
            <address className="not-italic leading-relaxed text-ink">
              {postalLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:border-brand-300 hover:text-ink"
            >
              {copied ? <Check className="size-3 text-leaf-500" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </dd>
        </div>

        {reference ? (
          <div>
            <dt className="text-[12px] uppercase tracking-[0.07em] text-muted">
              Write on the memo line
            </dt>
            <dd className="mt-0.5 font-mono text-[13px] font-medium text-ink">{reference}</dd>
          </div>
        ) : null}
      </dl>

      {/* <p className="mt-3 flex items-start gap-1.5 border-t border-saffron-400/40 pt-2.5 text-[12px] leading-relaxed text-muted">
        <Clock className="mt-px size-3 shrink-0" />
        <span>
          The office desk is open {TEMPLE.timings.morning} and {TEMPLE.timings.evening}. Your
          receipt is issued once the cheque clears, so it may take a few days longer than a card
          gift.
        </span>
      </p> */}
    </div>
  )
}
