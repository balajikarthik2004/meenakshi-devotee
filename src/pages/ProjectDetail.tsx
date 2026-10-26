import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  HandCoins,
  HardHat,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import type { Project } from '@/lib/data/types'
import { ProjectCover } from '@/components/shared/ProjectCover'
import { ProjectMoneyFlow } from '@/components/shared/ProjectMoneyFlow'
import { StatusPill } from '@/components/shared/badges'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { getProjectBySlug, listProjectDonations } from '@/lib/data/api'
import { useAsync } from '@/lib/hooks'
import { isOpenForDonations, stillToRaise } from '@/lib/project'
import { cn, fmtDate, money } from '@/lib/utils'

/**
 * One project, and every dollar of it.
 *
 * Arranged around the question a devotee actually has before giving — "where would my
 * money go, and where has everybody else's gone?" — so the two ledgers are the
 * substance of the page rather than an appendix to it. Expenditure comes before
 * contributions on purpose: any appeal can list what it received, and what makes the
 * rest of the page credible is being willing to print, line by line and with the
 * vendor named, what was done with it.
 */
export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data, loading } = useAsync(async () => {
    const project = await getProjectBySlug(slug!)
    if (!project) return { project: null, gifts: [] }
    return { project, gifts: await listProjectDonations(project.id, 12) }
  }, [slug])

  if (loading) {
    return (
      <>
        <LoadingSkeleton variant="tiles" rows={2} />
        <LoadingSkeleton variant="table" rows={5} className="mt-5" />
      </>
    )
  }

  const project = data?.project ?? null
  const gifts = data?.gifts ?? []

  if (!project) {
    return (
      <EmptyState
        Icon={HardHat}
        title="Project not found"
        detail="It may have been renamed, completed or removed from the capital programme."
        action={
          <Link to="/projects" className={buttonVariants({ size: 'sm' })}>
            All projects
          </Link>
        }
      />
    )
  }

  const open = isOpenForDonations(project)
  const remaining = stillToRaise(project)
  const donateHref = `/donate?category=project&project=${project.id}`

  return (
    <>
      <Link
        to="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All projects
      </Link>

      <section className="relative overflow-hidden rounded-[14px] border border-line shadow-[var(--shadow-lg)]">
        {project.imageUrl ? (
          <img src={project.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ProjectCover cover={project.cover} overlay className="absolute inset-0" />
        )}
        {/* A second wash from the left so the type has a dark field to sit on
            whatever the artwork happens to be doing behind it. */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/45 to-ink/10" />
        <div className="relative flex min-h-[230px] flex-col justify-end gap-2.5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={project.status} />
            <Pill>{money(project.targetAmount)} target</Pill>
            {project.targetCompletion ? (
              <Pill>Due {fmtDate(project.targetCompletion, 'MMMM yyyy')}</Pill>
            ) : null}
          </div>
          <h1 className="max-w-2xl font-serif text-[30px] leading-[1.14] text-white sm:text-[36px]">
            {project.title}
          </h1>
          <p className="max-w-xl text-[14px] leading-relaxed text-white/85">{project.summary}</p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.65fr_1fr] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <h2 className="font-serif text-[20px]">About this project</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{project.description}</p>
            <Timeline project={project} />
          </Card>

          <Card className="overflow-hidden">
            <SectionHead
              Icon={Receipt}
              title="Where the money went"
              meta={`${project.expenses.length} payment${project.expenses.length === 1 ? '' : 's'} · ${money(project.spentAmount)}`}
            />
            {project.expenses.length === 0 ? (
              <div className="p-5 pt-0">
                <EmptyState
                  Icon={Receipt}
                  title="Nothing spent yet"
                  detail="No payment has been made out of this project's fund. Every one will be itemised here."
                />
              </div>
            ) : (
              <TableWrap className="rounded-none border-0 border-t border-line shadow-none">
                <Table>
                  <THead>
                    <TR>
                      <TH className="pl-5">Date</TH>
                      <TH>Paid to</TH>
                      <TH>For</TH>
                      <TH className="pr-5 text-right">Amount</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {project.expenses.map((e) => (
                      <TR key={e.id} className="hover:bg-tint/40">
                        <TD className="whitespace-nowrap pl-5 text-muted">{fmtDate(e.date)}</TD>
                        <TD className="font-medium">{e.vendor}</TD>
                        <TD className="max-w-[260px] text-muted">
                          {e.description}
                          {e.reference ? (
                            <span className="ml-1.5 font-mono text-[11.5px] text-muted/70">
                              {e.reference}
                            </span>
                          ) : null}
                        </TD>
                        <TD className="pr-5 text-right font-medium tabular-nums">
                          {money(e.amount)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </Card>

          <Card className="overflow-hidden">
            {/* Captioned as recent, never as the total — `raisedAmount` is the
                audited figure and includes years of giving that predate this ledger.
                A list implied to be a total that is not one would be the single most
                misleading thing on an otherwise honest page. */}
            <SectionHead
              Icon={HandCoins}
              title="Recent contributions"
              meta="Latest gifts earmarked for this project"
            />
            {gifts.length === 0 ? (
              <div className="p-5 pt-0">
                <EmptyState
                  Icon={HandCoins}
                  title="No gifts recorded yet"
                  detail="Be the first to give toward this project."
                />
              </div>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {gifts.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]"
                  >
                    <span className="min-w-0">
                      <span className="block text-muted">{fmtDate(d.createdAt)}</span>
                      {d.dedicatedTo ? (
                        <span className="block truncate text-[12px] italic text-muted/70">
                          {d.dedicatedTo}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-ink">
                      {money(d.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {project.notes.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-serif text-[20px]">Updates from the temple office</h2>
              <ul className="mt-3 space-y-2.5">
                {project.notes.map((n, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-muted">
                    <span
                      aria-hidden
                      className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand-500/60"
                    />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <Card className="sticky top-6 overflow-hidden">
          <div className="border-b border-line bg-tint/50 px-5 py-3.5">
            <h3 className="font-serif text-[17px]">This project’s money</h3>
          </div>
          <div className="p-5">
            <ProjectMoneyFlow project={project} />

            <div className="mt-4 border-t border-line pt-4">
              {open ? (
                <>
                  <p className="text-[13px] leading-relaxed text-muted">
                    {remaining > 0 ? (
                      <>
                        <span className="font-medium text-ink">{money(remaining)}</span> is still
                        needed to reach the published target.
                      </>
                    ) : (
                      <>
                        The target has been met. Further gifts stay with this project and are
                        reported here.
                      </>
                    )}
                  </p>
                  <Link
                    to={donateHref}
                    className={cn(buttonVariants({ size: 'lg' }), 'mt-3 w-full')}
                  >
                    <HandCoins />
                    Give to this project
                  </Link>
                  {/* The rajagopuram is a six-figure target; pledging is often the
                      only way a household takes a meaningful part in one. */}
                  <Link
                    to={`${donateHref}&mode=pledge`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'mt-2 w-full',
                    )}
                  >
                    <CalendarCheck2 />
                    Pledge for later
                  </Link>
                </>
              ) : (
                <p className="text-[13px] leading-relaxed text-muted">
                  This project is closed to new gifts
                  {project.status === 'completed' ? ' — the work is complete' : ''}. Its figures
                  stay published so the record is permanent.
                </p>
              )}
            </div>

            <p className="mt-4 flex gap-2 border-t border-line pt-3.5 text-[11.5px] leading-relaxed text-muted">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-leaf-600" />
              <span>
                Restricted to this project. Sri Meenakshi Temple Society is a 501(c)(3)
                organization; a receipt is issued for every gift.
              </span>
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ pieces */

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
    {children}
  </span>
)

function SectionHead({
  Icon,
  title,
  meta,
}: {
  Icon: typeof Receipt
  title: string
  meta: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-5 pb-3">
      <h2 className="flex items-center gap-2.5 font-serif text-[20px]">
        <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-tint text-brand-500 ring-1 ring-inset ring-line">
          <Icon className="size-[15px]" />
        </span>
        {title}
      </h2>
      <p className="text-[12.5px] text-muted">{meta}</p>
    </div>
  )
}

/** Started, due, and where today sits between them. */
function Timeline({ project }: { project: Project }) {
  if (!project.startedAt && !project.targetCompletion) return null

  const start = project.startedAt ? new Date(project.startedAt).getTime() : null
  const end = project.targetCompletion ? new Date(project.targetCompletion).getTime() : null
  const elapsed =
    start && end && end > start
      ? Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100))
      : null

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 text-muted">
          <CalendarDays className="size-3.5" />
          {project.startedAt ? `Began ${fmtDate(project.startedAt, 'MMMM yyyy')}` : 'Not yet begun'}
        </span>
        <span className="text-muted">
          {project.targetCompletion
            ? `Due ${fmtDate(project.targetCompletion, 'MMMM yyyy')}`
            : 'Completion date to be confirmed'}
        </span>
      </div>
      {elapsed !== null ? (
        /* Time elapsed, drawn apart from the two bars in the sidebar. A project can
           be on schedule and behind on money, or the reverse, and this is the axis
           neither of those shows. */
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/80">
          <div
            className="h-full rounded-full bg-muted/50"
            style={{ width: `${elapsed}%` }}
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  )
}
