import { Clock, ExternalLink, Mail, MapPin, Phone } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { TransparencyStrip } from '@/components/shared/TransparencyStrip'
import { DeityArt } from '@/components/shared/DeityArt'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BOARD_EMERITUS,
  BOARD_GROUPS,
  BOARD_HEADCOUNT,
  BOARD_PRESIDENT,
  BOARD_SOURCE,
  BOARD_TERM,
  DAILY_SCHEDULE,
  STAFF,
  TEMPLE,
  TEMPLE_EIN,
} from '@/lib/data/mock'

/** `Sockalingam Kannappan` -> `SK`. Two letters at most, so the circle stays a circle. */
const initials = (name: string) =>
  name
    .replace(/[^\p{L}\s.]/gu, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/* Spelled out, because the prose around it is. Beyond ten the numeral is the better
   read anyway, so the fallback is not a compromise. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const spell = (n: number) => WORDS[n] ?? String(n)

export default function About() {
  /* Counted rather than stated. The page used to say "four priests" in prose while the
     staff list beside it was free to grow, and the two would have parted company the
     first time somebody was added. */
  const priests = STAFF.filter((m) => m.role === 'priest').length

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="About the Temple Society"
        subtitle="A Tamil Saiva–Vaishnava temple serving the Greater Houston community."
      />

      {/* The four things a first-time visitor checks before reading a word of prose:
          how big the temple is, who serves it, whether a gift is deductible, and
          whether they can simply turn up. Every figure is counted from the data the
          rest of the site runs on, so none of them can drift out of date on their own. */}
      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: 'Sannidhis', v: String(TEMPLE.deities.length) },
          { k: 'Priests', v: String(priests) },
          { k: 'Status', v: '501(c)(3)' },
          { k: 'Open', v: 'All 7 days' },
        ].map((f) => (
          <div key={f.k} className="rounded-[12px] border border-line bg-card px-4 py-3">
            <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{f.k}</dt>
            <dd className="mt-0.5 font-serif text-[19px] leading-tight text-ink">{f.v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <DeityArt deity="Meenakshi" className="h-44 w-full" />
            <div className="space-y-3 p-5 text-[14.5px] leading-relaxed text-muted">
              <p>
                Sri Meenakshi Temple Society was founded by Tamil families who wanted their children
                to grow up hearing the same Sanskrit and Tamil verses they had grown up with. What
                began as a small prayer hall on the Pearland prairie is now one of the largest South
                Indian temples in the United States.
              </p>
              <p>
                The temple houses sannidhis for {TEMPLE.deities.slice(0, -1).join(', ')} and{' '}
                {TEMPLE.deities.at(-1)}. Daily worship follows the Agama tradition, with{' '}
                {spell(priests)} priests performing the full cycle of abhishekam, alangaram,
                archana and deeparadhana.
              </p>
              <p>
                We are a registered 501(c)(3) non-profit run entirely on devotee contributions.
                There is no endowment behind us — every lamp lit, every plate served at annadanam
                and every priest’s honorarium comes from a family that chose to give.
              </p>
            </div>
          </Card>

          <TransparencyStrip />
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="font-serif text-[18px]">Visit us</h3>
            <address className="mt-3 space-y-2.5 not-italic text-[13.5px] text-muted">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" />
                <span className="text-ink">
                  {TEMPLE.address}
                  <br />
                  {TEMPLE.city}, {TEMPLE.state} {TEMPLE.zip}
                </span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-brand-500" />
                <a href={`tel:${TEMPLE.phone}`} className="text-ink hover:text-brand-500">
                  {TEMPLE.phone}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-brand-500" />
                <a href={`mailto:${TEMPLE.email}`} className="text-ink hover:text-brand-500">
                  {TEMPLE.email}
                </a>
              </p>
            </address>

            <div className="mt-4 border-t border-line pt-4">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                <Clock className="size-3.5" />
                Temple hours
              </p>
              <p className="mt-1.5 text-[13.5px] text-ink">Morning {TEMPLE.timings.morning}</p>
              <p className="text-[13.5px] text-ink">Evening {TEMPLE.timings.evening}</p>
              <p className="mt-1 text-[12.5px] text-muted">
                Open all seven days, including festivals.
              </p>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                Daily worship
              </p>
              <ul className="mt-2 space-y-1.5">
                {DAILY_SCHEDULE.map((d) => (
                  <li
                    key={d.label}
                    className="flex items-baseline justify-between gap-3 text-[13px]"
                  >
                    <span className="text-ink">{d.label}</span>
                    <span className="font-mono text-[12.5px] text-brand-600">{d.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-serif text-[18px]">Non-profit status</h3>
            <div className="mt-3 space-y-2 text-[13px] text-muted">
              <p className="flex items-center justify-between gap-3">
                <span>Organisation type</span>
                <Badge variant="leaf">501(c)(3)</Badge>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Federal EIN</span>
                <span className="font-mono text-ink">{TEMPLE_EIN}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Fiscal year</span>
                <span className="text-ink">January – December</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span>Governance</span>
                {/* Counted from the roster below rather than typed, so it cannot
                    disagree with the names a reader can see further down the page. */}
                <a href="#board" className="font-medium text-brand-500 hover:underline">
                  Board of {BOARD_HEADCOUNT}
                </a>
              </p>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
              Contributions are tax-deductible to the extent allowed by law. Our audited statements
              are presented at the Annual General Meeting and published to all members.
            </p>
          </Card>
        </div>
      </div>

      {/* --------------------------------------------- governance, and who serves */}
      {/* Full width, below the two columns, because thirty-six names will not sit in a
          sidebar and should not be made to. The order is the order of the society's own
          sheet: the president, then the committee that runs the temple day to day, then
          the directors, then the councils that advise them. */}
      <section id="board" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-[24px] leading-tight text-ink">Board & governance</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              The {BOARD_HEADCOUNT} members elected and appointed to serve the society for the{' '}
              {BOARD_TERM} term.
            </p>
          </div>
          <a
            href={BOARD_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-500 hover:underline"
          >
            Official roster (PDF)
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        {/* The president leads alone. One name in a card of its own is the layout
            saying what the roster says by giving him the whole top of the sheet. */}
        <Card className="mb-4 flex flex-wrap items-center gap-4 border-saffron-400/40 bg-gradient-to-r from-tint/70 to-card p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-500/10 font-serif text-[18px] text-brand-600">
            {initials(BOARD_PRESIDENT.name)}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
              {BOARD_PRESIDENT.office}
            </p>
            <p className="font-serif text-[22px] leading-tight text-ink">
              {BOARD_PRESIDENT.name}
            </p>
          </div>
        </Card>

        {/* `items-start` so a five-name card does not stretch itself to match a
            ten-name one and sit half empty. */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {BOARD_GROUPS.map((group) => (
            <Card key={group.key} className="p-5">
              <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
                <h3 className="font-serif text-[18px] leading-tight text-ink">
                  {group.title}
                  {group.subtitle ? (
                    <span className="ml-1.5 text-[13px] font-normal text-muted">
                      {group.subtitle}
                    </span>
                  ) : null}
                </h3>
                <span className="shrink-0 text-[12.5px] tabular-nums text-muted">
                  {group.members.length} members
                </span>
              </div>
              <ul className="divide-y divide-line/70">
                {group.members.map((m) => (
                  <li
                    key={m.name}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2"
                  >
                    <span className="text-[14px] text-ink">{m.name}</span>
                    {/* The office, where there is one. A badge would shout; this is a
                        caption, and the six who hold an office are already first. */}
                    {m.office ? (
                      <span className="text-[12.5px] text-muted">{m.office}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {BOARD_EMERITUS.map((m) => (
            <Card key={m.name} className="flex items-center gap-3.5 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint font-serif text-[13px] text-brand-600">
                {initials(m.name)}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{m.office}</p>
                <p className="text-[14.5px] font-medium leading-tight text-ink">{m.name}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* The people the board appoints, directly under the board that appoints them.
            This card used to sit in the left column, above the fold and above the
            governance it answers to, which had the page introducing the clergy before
            it had said who runs the temple. Full width now, in two columns, because at
            this width a single column would strand each email half a screen from the
            name it belongs to. */}
        <Card className="mt-4 p-5">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5">
            <h3 className="font-serif text-[18px] leading-tight text-ink">Priests & staff</h3>
            <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{STAFF.length} staff</span>
          </div>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {STAFF.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 border-b border-line/70 py-3 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint text-[12px] font-semibold text-brand-600">
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-tight text-ink">{m.name}</p>
                  <p className="text-[12.5px] text-muted">{m.title}</p>
                </div>
                <a
                  href={`mailto:${m.email}`}
                  className="shrink-0 text-[12.5px] text-brand-500 hover:underline"
                >
                  {m.email}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}
