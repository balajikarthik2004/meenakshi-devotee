import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HardHat, Receipt, ShieldCheck, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { ProjectCard } from '@/components/shared/ProjectCard'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Chips } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { listProjects } from '@/lib/data/api'
import { useAsync } from '@/lib/hooks'
import { PROJECT_FILTERS, summariseProjects } from '@/lib/project'
import { cn, money } from '@/lib/utils'

/**
 * The capital programme, published.
 *
 * Festivals already got this treatment — a target, what has been raised against it,
 * and the gap stated plainly — and the buildings had nothing. They were visible only
 * inside the admin console, which meant the devotees paying for the rajagopuram could
 * not see what it cost or how far along it was. This page is the other half of that
 * promise, and it carries the figures the board reads.
 *
 * The programme band leads, before any individual project. Someone arriving here is
 * usually asking "what is the temple building, and is it being run properly" before
 * they are asking about any one of them — and the three figures that answer it are
 * raised, spent, and the difference, which is the number most appeals never print.
 */
export default function ProjectsIndex() {
  const [filter, setFilter] = useState<string>('all')
  const { data, loading } = useAsync(() => listProjects(), [])

  const projects = data ?? []
  const shown = projects.filter((p) => (filter === 'all' ? true : p.status === filter))
  const s = summariseProjects(projects)
  const pctFunded = s.target > 0 ? (s.raised / s.target) * 100 : 0

  return (
    <>
      <PageHeader
        title="Temple projects"
        subtitle="What the temple is building, what each one costs, and exactly where the money has gone."
        actions={<Chips items={[...PROJECT_FILTERS]} value={filter} onChange={setFilter} />}
      />

      {loading ? (
        <LoadingSkeleton variant="tiles" rows={4} />
      ) : (
        <>
          <Card className="mb-6 overflow-hidden">
            <div className="border-b border-line bg-tint/50 px-5 py-4">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    The capital programme
                  </p>
                  <p className="mt-1 font-serif text-[26px] leading-none text-ink">
                    {money(s.raised)}{' '}
                    <span className="font-sans text-[13.5px] text-muted">
                      raised of {money(s.target)}
                    </span>
                  </p>
                </div>
                <p className="text-[12.5px] text-muted">
                  {s.count} projects · {s.open} open for giving
                </p>
              </div>
              <Progress
                value={pctFunded}
                tone={pctFunded >= 100 ? 'leaf' : 'brand'}
                className="mt-3"
                label={`Capital programme — ${money(s.raised)} of ${money(s.target)} raised`}
              />
            </div>

            {/* In, out, and what is left. Printed side by side so the subtraction is
                visible rather than asserted — "in hand" is the figure that makes the
                other two believable, and the one an appeal page usually omits. */}
            <dl className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Figure
                Icon={HardHat}
                label="Raised to date"
                value={money(s.raised)}
                hint="Across every project"
              />
              <Figure
                Icon={Receipt}
                label="Spent to date"
                value={money(s.spent)}
                hint="Every payment itemised"
              />
              <Figure
                Icon={Wallet}
                label="In hand"
                value={money(s.balance)}
                hint="Raised, not yet paid out"
                tone="text-leaf-600"
              />
            </dl>
          </Card>

          {shown.length === 0 ? (
            <EmptyState
              Icon={HardHat}
              title="Nothing in this list yet"
              detail="Try another filter — the capital programme is reviewed by the board each quarter."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}

          <Card className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <ShieldCheck className="size-4 shrink-0 text-leaf-600" />
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-muted">
              These are the same figures the board reviews and the annual report publishes — there
              is one ledger and one set of numbers. A gift to a project is restricted to that
              project and is not moved to another without the board resolving it in the minutes.
            </p>
            <Link
              to="/donate?category=project"
              className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}
            >
              Give to a project
            </Link>
          </Card>
        </>
      )}
    </>
  )
}

function Figure({
  Icon,
  label,
  value,
  hint,
  tone,
}: {
  Icon: typeof HardHat
  label: string
  value: string
  hint: string
  tone?: string
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-tint text-brand-500 ring-1 ring-inset ring-line">
        <Icon className="size-[16px]" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </dt>
        <dd className={cn('mt-0.5 text-[20px] leading-tight tabular-nums text-ink', tone)}>
          {value}
        </dd>
        <p className="text-[11.5px] text-muted">{hint}</p>
      </div>
    </div>
  )
}
