import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Award,
  CalendarClock,
  Check,
  ExternalLink,
  GraduationCap,
  Loader2,
  Users,
} from 'lucide-react'
import type { ScholarshipProgramme } from '@/lib/data/scholarshipApi'
import { getProgramme, isOffline } from '@/lib/data/scholarshipApi'
import { PageHeader } from '@/components/layout/layouts'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn, fmtDate } from '@/lib/utils'

/**
 * The scholarship programme, explained.
 *
 * ## Why this page leads with "which one are you?"
 *
 * The temple makes two kinds of award that work completely differently, and a student
 * who applies through the wrong one wastes a year. The three school awards go to
 * Pearland High, Glenda Dawson and Robert Turner, are **need-based**, and are chosen
 * by those schools' own counsellors through the Pearland ISD scholarship packet — the
 * temple does not take those applications. The community awards are the temple's own
 * and are judged on merit.
 *
 * So the page is two cards and the first thing it asks is which you are. Sending a
 * Pearland High senior to our form when their counsellor holds the decision would be
 * worse than telling them nothing.
 *
 * ## Why the criteria are stated before the button
 *
 * A student should know the bar before they spend an evening on a personal statement.
 * The minimum GPA, the closing date and the four things the committee weighs are all
 * above the fold, and the figures that are not confirmed say so.
 */

export default function Scholarship() {
  const [programme, setProgramme] = useState<ScholarshipProgramme | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    getProgramme()
      .then(setProgramme)
      .catch((e) => setOffline(isOffline(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading
      </div>
    )
  }

  const window = programme?.window

  return (
    <>
      <PageHeader
        title="Scholarships"
        subtitle="The temple has awarded scholarships to graduating students for twenty-six years."
      />

      {offline || !programme ? (
        <Card className="flex items-start gap-3 p-6">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-saffron-600" />
          <div>
            <p className="font-semibold text-ink">The scholarship service is not running</p>
            <p className="mt-1 text-[14px] text-muted">
              Start it with <code className="rounded bg-tint px-1">npm run dev</code> in the
              backend folder, then reload.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Two routes, stated before anything else. */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* ---- the temple's own award ---- */}
            <Card className="flex flex-col border-brand-500/25 p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-serif text-[20px] leading-tight text-ink">
                  Community scholarship
                </h2>
                {window?.open ? (
                  <Badge variant="leaf">Open</Badge>
                ) : (
                  <Badge variant="neutral">
                    {window?.reason === 'not-yet' ? 'Not yet open' : 'Closed'}
                  </Badge>
                )}
              </div>
              <p className="text-[13.5px] leading-relaxed text-muted">
                For graduating students of the temple community. Judged on merit by the
                temple's own scholarship committee.
              </p>

              <dl className="mt-4 space-y-2 text-[13px]">
                <Row
                  Icon={Award}
                  label="Awards"
                  value={`about ${programme.expectedAwards} each year`}
                />
                <Row
                  Icon={GraduationCap}
                  label="Minimum"
                  value={`${programme.minGpa.toFixed(1)} unweighted GPA`}
                />
                <Row
                  Icon={CalendarClock}
                  label="Closes"
                  value={
                    window?.open
                      ? `${fmtDate(programme.closesAt, 'd MMMM yyyy')} · ${window.daysLeft} days left`
                      : fmtDate(programme.closesAt, 'd MMMM yyyy')
                  }
                />
              </dl>

              <div className="mt-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                  Judged on
                </p>
                <ul className="mt-1.5 space-y-1">
                  {[
                    ['Grade', programme.weights.gpa],
                    ['Class rank', programme.weights.rank],
                    ['SAT or ACT', programme.weights.tests],
                    ['Community service', programme.weights.service],
                  ].map(([label, w]) => (
                    <li
                      key={String(label)}
                      className="flex items-center justify-between gap-2 text-[13px]"
                    >
                      <span className="flex items-center gap-1.5 text-ink-soft">
                        <Check className="size-3.5 text-leaf-500" />
                        {label}
                      </span>
                      <span className="tabular-nums text-muted">
                        {Math.round(Number(w) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
                {/* A criterion you cannot supply should not read as a criterion you
                    failed, and a student reading this page deserves to know that. */}
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  If your school does not publish class rank, or you have not sat a test,
                  that criterion is left out of your score rather than counted as nought.
                </p>
              </div>

              <div className="mt-auto pt-5">
                {window?.open ? (
                  <Link to="/scholarship/apply" className={cn(buttonVariants({}), 'w-full')}>
                    Apply for this scholarship
                  </Link>
                ) : (
                  <p className="rounded-[10px] border border-line bg-tint/60 px-3 py-2.5 text-center text-[13px] text-muted">
                    {window?.reason === 'not-yet'
                      ? `Applications open ${fmtDate(programme.opensAt, 'd MMMM yyyy')}.`
                      : `Applications closed on ${fmtDate(programme.closesAt, 'd MMMM yyyy')}.`}
                  </p>
                )}
              </div>
            </Card>

            {/* ---- the school awards, which are not ours to take ---- */}
            <Card className="flex flex-col p-5">
              <h2 className="font-serif text-[20px] leading-tight text-ink">
                School awards
              </h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                The temple also funds one award each at three Pearland schools. These are
                <strong className="text-ink-soft"> need-based</strong> and the recipients are
                chosen by each school's own counsellors.
              </p>

              <ul className="mt-4 space-y-1.5">
                {[
                  'Pearland High School',
                  'Glenda Dawson High School',
                  'Robert Turner College and Career High School',
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13px] text-ink-soft">
                    <Users className="mt-0.5 size-3.5 shrink-0 text-muted" />
                    {s}
                  </li>
                ))}
              </ul>

              {/* The honest instruction. Taking an application here for an award a
                  counsellor decides would cost the student a year. */}
              <div className="mt-4 rounded-[10px] border border-hairline bg-tint px-4 py-3 text-[13px] leading-relaxed">
                <p className="font-semibold text-ink">Do not apply here for these.</p>
                <p className="mt-1 text-muted">
                  They are applied for through your school's local scholarship packet, and
                  your counsellor makes the decision. Ask the counselling office — the
                  packet is usually issued in the autumn and closes in late January.
                </p>
              </div>

              <p className="mt-auto pt-5 text-[12.5px] text-muted">
                Awards from both tracks are presented together at the temple's annual
                ceremony.
              </p>
            </Card>
          </div>

          {/* Said once, plainly, because none of these figures is confirmed. */}
          {programme.provisional ? (
            <p className="flex items-start gap-2 rounded-[10px] border border-saffron-500/30 bg-saffron-500/[0.06] px-4 py-3 text-[13px] leading-relaxed text-saffron-600">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                The minimum grade and closing date here follow the temple's previously
                published school packet, and the award count follows past ceremonies.
                They are awaiting confirmation by the office — ring 281-489-0358 if
                anything turns on an exact figure.
              </span>
            </p>
          ) : null}

          <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <ExternalLink className="size-3.5" />
            Funded by donors in the temple community, with a matching contribution from
            the temple.
          </p>
        </div>
      )}
    </>
  )
}

const Row = ({
  Icon,
  label,
  value,
}: {
  Icon: typeof Award
  label: string
  value: string
}) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="flex items-center gap-1.5 text-muted">
      <Icon className="size-3.5" />
      {label}
    </dt>
    <dd className="text-right font-semibold text-ink">{value}</dd>
  </div>
)
