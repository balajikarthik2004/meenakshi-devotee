import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Project } from '@/lib/data/types'
import { ProjectCover } from '@/components/shared/ProjectCover'
import { Progress } from '@/components/ui/badge'
import { StatusPill } from '@/components/shared/badges'
import { fundingPct, fundingTone, isOpenForDonations, stillToRaise } from '@/lib/project'
import { cn, fmtDate, money, moneyShort } from '@/lib/utils'

/**
 * One project in the programme grid.
 *
 * Arranged the way a capital appeal actually has to be read: the picture, then the
 * single sentence that says what it buys, then the money. Only the funding bar rides
 * on the card — the work-completed figure is a line of text beneath it rather than a
 * second bar, because two bars at card size become a pattern rather than two facts,
 * and the one a reader is scanning a grid for is "how close is this to paid for".
 *
 * The whole card is the link. A title-only hit area in a grid of nine is a target
 * people miss.
 */
export function ProjectCard({ project }: { project: Project }) {
  const open = isOpenForDonations(project)
  const pctFunded = fundingPct(project)
  const remaining = stillToRaise(project)

  return (
    <Link
      to={`/projects/${project.slug}`}
      className={cn(
        'group flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-line bg-card',
        'shadow-[var(--shadow-sm)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35',
      )}
    >
      <div className="relative h-36 overflow-hidden border-b border-line">
        {project.imageUrl ? (
          <img
            src={project.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <ProjectCover
            cover={project.cover}
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <StatusPill status={project.status} />
        </div>
        {/* The target sits on the art, where it reads as a caption rather than
            competing with the figures in the body below. */}
        <span className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-2.5 py-1 text-[11.5px] font-semibold tabular-nums text-white backdrop-blur-sm">
          {moneyShort(project.targetAmount)} target
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="font-serif text-[17px] leading-snug text-ink transition-colors group-hover:text-brand-600">
          {project.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted">{project.summary}</p>

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold tabular-nums text-ink">
              {money(project.raisedAmount)}
            </span>
            <span className="text-[12px] font-semibold tabular-nums text-muted">
              {Math.round(pctFunded)}%
            </span>
          </div>
          <Progress
            value={pctFunded}
            tone={fundingTone(project)}
            label={`${project.title} — ${money(project.raisedAmount)} of ${money(project.targetAmount)} raised`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11.5px] text-muted">
            <span>
              {remaining > 0 ? `${money(remaining)} still needed` : 'Fully funded'}
            </span>
            <span>{project.progressPct}% built</span>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px]">
          <span className="text-muted">
            {project.targetCompletion
              ? `Due ${fmtDate(project.targetCompletion, 'MMM yyyy')}`
              : 'Date to be confirmed'}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-brand-600">
            {open ? 'Give to this' : 'See the figures'}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
