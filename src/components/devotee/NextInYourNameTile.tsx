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
        'rounded-[10px] border border-brand-500/25 bg-brand-500/[0.06] p-4 shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
          Next puja in your name
        </p>
        <span className="grid size-7 place-items-center rounded-md bg-brand-500/12 text-brand-600">
          <Flame className="size-4" />
        </span>
      </div>

      {occurrence && puja ? (
        <>
          <p className="mt-2 font-serif text-[19px] leading-tight text-ink">
            {fmtDate(occurrence.scheduledAt, 'MMM d')} · {puja.name}
          </p>
          <p className="mt-1 text-[12.5px] text-muted">
            {fmtTime(occurrence.scheduledAt)} at the {puja.deity} sannidhi
            {names?.length ? ` · for ${names[0]}` : ''}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-serif text-[19px] leading-tight text-muted">Nothing scheduled</p>
          <p className="mt-1 text-[12.5px] text-muted">
            Sponsor a puja and your family’s names will appear here.
          </p>
        </>
      )}
    </div>
  )
}
