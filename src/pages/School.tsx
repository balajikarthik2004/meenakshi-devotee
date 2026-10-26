import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock, GraduationCap, MapPin, Users } from 'lucide-react'
import type { SchoolClass } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { getSchoolTerm, listClasses } from '@/lib/data/api'
import { useAsync } from '@/lib/hooks'
import {
  CATEGORY_BLURB,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  ageRange,
  isFull,
  isNearlyFull,
  registrationOpen,
  seatsLeft,
  termWindow,
  timeRange,
} from '@/lib/school'
import { cn, fmtDate, money } from '@/lib/utils'

/**
 * The Vedic Heritage School's class catalogue.
 *
 * A parent arriving here is doing one thing: working out which class their child
 * fits, and whether there is still room in it. So every card leads with the age
 * band and the seats, and the whole catalogue is on one page with a rail to jump
 * by subject — the same arrangement as the cafeteria board, for the same reason a
 * filter was wrong there: hiding eight of the nine Purna Vidya levels from a
 * parent who does not yet know which one their child is in helps nobody.
 */
export default function School() {
  const [active, setActive] = useState('')
  const { data, loading } = useAsync(async () => Promise.all([listClasses(), getSchoolTerm()]), [])

  const classes = useMemo(() => (data?.[0] ?? []).filter((c) => c.active), [data])
  const term = data?.[1]

  const sections = useMemo(
    () =>
      CATEGORY_ORDER.map((key) => ({
        key,
        label: CATEGORY_LABEL[key],
        blurb: CATEGORY_BLURB[key],
        items: classes.filter((c) => c.category === key),
      })).filter((s) => s.items.length > 0),
    [classes],
  )

  const open = term ? registrationOpen(term) : false
  const windowState = term ? termWindow(term) : 'before'

  const jump = (key: string) => {
    setActive(key)
    document
      .querySelector(`[data-school-section="${key}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <PageHeader
        title="Vedic Heritage School"
        subtitle="The temple’s Hindu WISDOM Program — Purna Vidya, languages, music and yoga, on alternate Sunday mornings."
        actions={
          <Link to="/my/classes" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            My classes
          </Link>
        }
      />

      {loading || !term ? (
        <LoadingSkeleton variant="tiles" rows={4} />
      ) : (
        <>
          {/* The year, and whether it can be joined. Everything a parent needs to
              know before reading a single class sits in this one block. */}
          <Card className="mb-6 overflow-hidden">
            <div className="border-b border-line bg-tint/50 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {term.cadence}
                  </p>
                  <h2 className="mt-1 font-serif text-[24px] leading-none text-ink">{term.name}</h2>
                  <p className="mt-1.5 text-[13px] text-muted">
                    {fmtDate(term.startDate, 'd MMMM yyyy')} –{' '}
                    {fmtDate(term.endDate, 'd MMMM yyyy')} · 8:45 AM – 12:30 PM
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-[12.5px] font-semibold',
                    open ? 'bg-leaf-500/15 text-leaf-600' : 'bg-saffron-400/25 text-brand-700',
                  )}
                >
                  {open
                    ? 'Registration open'
                    : windowState === 'before'
                      ? 'Registration opens soon'
                      : 'Registration closed'}
                </span>
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                {open ? (
                  <>
                    Registration closes{' '}
                    <span className="font-medium text-ink">
                      {fmtDate(term.registrationCloses, 'd MMMM yyyy')}
                    </span>
                    . Fees are paid first and the place is confirmed by the coordinators — you can
                    pay by card here, or send a cheque and we will confirm when it arrives.
                  </>
                ) : windowState === 'before' ? (
                  <>
                    Registration opens{' '}
                    <span className="font-medium text-ink">
                      {fmtDate(term.registrationOpens, 'd MMMM yyyy')}
                    </span>
                    . The full class list is below so you can plan.
                  </>
                ) : (
                  <>
                    The year is under way and online registration has closed. Please write to the
                    coordinators — a mid-year place is sometimes possible.
                  </>
                )}
              </p>
            </div>

            <dl className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Fact Icon={GraduationCap} label="Classes" value={`${classes.length} this year`} />
              <Fact Icon={CalendarDays} label="When" value={term.cadence} />
              <Fact Icon={MapPin} label="Where" value="17130 McLean Rd, Pearland" />
            </dl>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[164px_minmax(0,1fr)] lg:items-start">
            {/* Subjects rail, same pattern as the cafeteria courses. */}
            <nav
              aria-label="Subjects"
              className="z-10 -mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:sticky lg:top-6 lg:self-start lg:overflow-visible lg:px-0 lg:pb-0"
            >
              <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-muted lg:block">
                Subjects
              </p>
              <ul className="flex gap-1.5 lg:flex-col lg:gap-0.5">
                {sections.map((s) => (
                  <li key={s.key} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => jump(s.key)}
                      aria-current={active === s.key ? 'true' : undefined}
                      className={cn(
                        'w-full whitespace-nowrap rounded-[9px] px-3 py-2 text-left text-[13px] font-medium transition-colors',
                        active === s.key
                          ? 'bg-brand-500/[0.08] text-brand-700'
                          : 'text-muted hover:bg-tint hover:text-ink',
                      )}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0 space-y-6">
              {sections.length === 0 ? (
                <EmptyState
                  Icon={GraduationCap}
                  title="No classes listed yet"
                  detail="The coordinators publish the year’s classes before registration opens."
                />
              ) : (
                sections.map((section) => (
                  <section key={section.key} className="min-w-0">
                    <div
                      data-school-section={section.key}
                      className="mb-3 scroll-mt-24 border-b border-line pb-2"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <h2 className="font-serif text-[19px] text-ink">{section.label}</h2>
                        <span className="text-[12px] text-muted">
                          {section.items.length} {section.items.length === 1 ? 'class' : 'classes'}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-muted">{section.blurb}</p>
                    </div>

                    <div className="grid gap-3">
                      {section.items.map((c) => (
                        <ClassRow key={c.id} cls={c} canBook={open} />
                      ))}
                    </div>
                  </section>
                ))
              )}

              <Card className="p-4 text-[12.5px] leading-relaxed text-muted">
                The Purna Vidya levels are progressive, but a family joining midway is placed by the
                coordinators after a short assessment — book the level that fits your child’s age
                and they will confirm it. Questions to{' '}
                <span className="font-medium text-ink">hwp.vhs@smdpearland.org</span>.
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function Fact({ Icon, label, value }: { Icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-tint text-brand-500 ring-1 ring-inset ring-line">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </dt>
        <dd className="mt-0.5 text-[14px] text-ink">{value}</dd>
      </div>
    </div>
  )
}

/**
 * One class in the catalogue.
 *
 * A row rather than a tile: there are seventeen of them and the three things a
 * parent compares — age, time, seats — line up down the page when they share a
 * column, and do not when every card is its own little grid.
 */
function ClassRow({ cls, canBook }: { cls: SchoolClass; canBook: boolean }) {
  const full = isFull(cls)
  const nearly = isNearlyFull(cls)

  return (
    <Link
      to={`/school/${cls.slug}`}
      className={cn(
        'group flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-[12px] border border-line bg-card p-4',
        'shadow-[var(--shadow-sm)] transition-all duration-200',
        'hover:-translate-y-px hover:border-brand-200 hover:shadow-[var(--shadow)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35',
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-tint font-mono text-[11.5px] font-semibold text-brand-700 ring-1 ring-inset ring-line">
        {cls.code}
      </span>

      <span className="min-w-0 flex-1 basis-[14rem]">
        <span className="block text-[14.5px] font-medium text-ink transition-colors group-hover:text-brand-600">
          {cls.name}
        </span>
        <span className="block truncate text-[12.5px] text-muted">{cls.summary}</span>
      </span>

      <span className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" />
          {ageRange(cls)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {timeRange(cls.startTime, cls.endTime)}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-3">
        <span className="text-right">
          <span className="block text-[15px] font-medium tabular-nums text-ink">
            {cls.fee === 0 ? 'Free' : money(cls.fee)}
          </span>
          {/* Seats only earn a line once they change what a parent does. */}
          {full ? (
            <Badge variant="brand">Waiting list</Badge>
          ) : nearly ? (
            <Badge variant="gold">{seatsLeft(cls)} left</Badge>
          ) : (
            <span className="block text-[11.5px] text-muted">
              {canBook ? 'Places available' : 'for the year'}
            </span>
          )}
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
