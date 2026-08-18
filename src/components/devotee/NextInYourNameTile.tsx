import { Flame } from 'lucide-react'
import type { PujaCatalogItem, PujaOccurrence } from '@/lib/data/types'
import { cn, fmtDate, fmtTime } from '@/lib/utils'

/**
 * "Next puja in your name" — the tile devotees look at first. Deliberately reads as a
 * sentence, not a stat: a date, a deity, and who it is being offered for.
 */
export function NextInYourNameTile({
  occurrence,
  puja,
  names,
  className,
}: {
  occurrence?: PujaOccurrence
  puja?: PujaCatalogItem
  names?: string[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-[10px] border border-saffron-300/50 bg-gradient-to-r from-brand-800 to-brand-700 p-5 text-white shadow-[var(--shadow)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron-300">
          Next puja in your name
        </p>
        <span className="grid size-8 place-items-center rounded-full bg-saffron-400/15 text-saffron-300">
          <Flame className="size-4" />
        </span>
      </div>

      {occurrence && puja ? (
        <>
          <p className="mt-2 font-serif text-[26px] leading-tight text-white">
            {fmtDate(occurrence.scheduledAt, 'MMM d')} · {puja.name}
          </p>
          <p className="mt-1.5 text-[13px] text-brand-100/80">
            {fmtTime(occurrence.scheduledAt)} at the {puja.deity} sannidhi
            {names?.length ? ` · for ${names[0]}` : ''}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-serif text-[26px] leading-tight text-white/70">
            Nothing scheduled
          </p>
          <p className="mt-1.5 text-[13px] text-brand-100/80">
            Sponsor a puja and your family’s names will appear here.
          </p>
        </>
      )}
    </div>
  )
}
