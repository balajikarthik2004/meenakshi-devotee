import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { TransparencyStrip } from '@/components/shared/TransparencyStrip'
import { DeityArt } from '@/components/shared/DeityArt'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DAILY_SCHEDULE, STAFF, TEMPLE, TEMPLE_EIN } from '@/lib/data/mock'

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="About the Devasthanam"
        subtitle="A Tamil Saiva–Vaishnava temple serving the Greater Houston community."
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <DeityArt deity="Meenakshi" className="h-44 w-full" />
            <div className="space-y-3 p-5 text-[14.5px] leading-relaxed text-muted">
              <p>
                Sri Meenakshi Devasthanam was founded by Tamil families who wanted their children to
                grow up hearing the same Sanskrit and Tamil verses they had grown up with. What
                began as a small prayer hall on the Pearland prairie is now one of the largest South
                Indian temples in the United States.
              </p>
              <p>
                The temple houses sannidhis for {TEMPLE.deities.slice(0, -1).join(', ')} and{' '}
                {TEMPLE.deities.at(-1)}. Daily worship follows the Agama tradition, with four
                priests performing the full cycle of abhishekam, alangaram, archana and
                deeparadhana.
              </p>
              <p>
                We are a registered 501(c)(3) non-profit run entirely on devotee contributions.
                There is no endowment behind us — every lamp lit, every plate served at annadanam
                and every priest’s honorarium comes from a family that chose to give.
              </p>
            </div>
          </Card>

          <TransparencyStrip />

          <Card className="p-5">
            <h2 className="font-serif text-[20px]">Priests & staff</h2>
            <ul className="mt-3 divide-y divide-line">
              {STAFF.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint text-[12px] font-semibold text-brand-600">
                    {s.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{s.name}</p>
                    <p className="text-[12.5px] text-muted">{s.title}</p>
                  </div>
                  <a
                    href={`mailto:${s.email}`}
                    className="text-[12.5px] text-brand-500 hover:underline"
                  >
                    {s.email}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
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
                <span className="text-ink">Elected board of nine</span>
              </p>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
              Contributions are tax-deductible to the extent allowed by law. Our audited statements
              are presented at the Annual General Meeting and published to all members.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
