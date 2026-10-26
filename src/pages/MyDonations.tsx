import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Donation } from '@/lib/data/types'
import { CalendarCheck2, Coins, Download, FileText, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { TaxReceiptPreview } from '@/components/shared/TaxReceiptPreview'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/overlay'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { StatTile } from '@/components/shared/StatTile'
import { EVENT_BY_ID, PROJECT_BY_ID } from '@/lib/data/mock'
import { listDonationsFor, listPledgesFor } from '@/lib/data/api'
import { signUpHrefFor, useDonorIdentity } from '@/lib/donor'
import { useAsync } from '@/lib/hooks'
import { summarisePledges } from '@/lib/pledge'
import { downloadCSV, fmtDate, money, titleCase } from '@/lib/utils'

/**
 * What a gift was for, in one line. An event sponsorship names the festival and the
 * heads covered; everything else falls back to the fund and any dedication. The table,
 * the CSV export and the printed statement all read from here so a devotee never sees
 * a gift described three different ways.
 */
function purposeOf(d: Donation) {
  const event = d.eventId ? EVENT_BY_ID.get(d.eventId) : undefined
  if (event) {
    return d.eventItems?.length
      ? `${event.title} — ${d.eventItems.join(', ')}`
      : `${event.title} sponsorship`
  }
  const project = d.projectId ? PROJECT_BY_ID.get(d.projectId) : undefined
  if (project) return d.dedicatedTo ? `${project.title} — ${d.dedicatedTo}` : project.title
  return d.dedicatedTo ?? ''
}

/**
 * Giving history for whoever is asking — a signed-in devotee or a guest donor.
 *
 * `RequireDonor` guarantees an identity by the time this renders, so the assertion is
 * safe. Fetching through `listDonationsFor` rather than by user id is what lets a guest
 * see the gift they made ten minutes ago, and what pulls a devotee's pre-account guest
 * gifts into the same statement once they register.
 */
export default function MyDonations() {
  const identity = useDonorIdentity()!
  const { data, loading } = useAsync(
    () => Promise.all([listDonationsFor(identity), listPledgesFor(identity)]),
    [identity.userId, identity.contact.email, identity.contact.phone],
  )
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [showReceipt, setShowReceipt] = useState(false)

  const donations = useMemo(() => data?.[0] ?? [], [data])
  /* Promised money is reported beside the history, never inside it. A pledge is not a
     gift until it is paid, and folding it into a year's total would overstate both the
     devotee's giving and their deduction. */
  const pledgeSummary = useMemo(() => summarisePledges(data?.[1] ?? []), [data])

  const years = useMemo(() => {
    const set = new Set(donations.map((d) => new Date(d.createdAt).getFullYear()))
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [donations])

  /* A devotee's statement is numbered by their record. A guest has no record, so the
     number is derived from the email the statement is addressed to — stable across
     visits, which is what makes it a reference rather than a decoration. */
  const statementKey = (
    identity.userId ?? identity.contact.email.replace(/[^a-z0-9]/gi, '')
  ).toUpperCase()

  const signUpHref = signUpHrefFor(identity.contact)

  const inYear = donations.filter((d) => new Date(d.createdAt).getFullYear() === year)
  const total = inYear.reduce((s, d) => s + d.amount, 0)
  const lifetime = donations.reduce((s, d) => s + d.amount, 0)

  const exportCSV = () =>
    downloadCSV(
      `meenakshi-donations-${year}.csv`,
      inYear.map((d) => ({
        Date: fmtDate(d.createdAt, 'yyyy-MM-dd'),
        Category: titleCase(d.category),
        Amount: d.amount,
        Method: titleCase(d.paymentMethod),
        Recurring: d.isRecurring ? d.recurringCadence : 'No',
        Pledge: d.pledgeId ?? '',
        Purpose: purposeOf(d),
        Receipt: d.taxReceiptId ?? 'pending',
      })),
    )

  if (loading) {
    return (
      <>
        <PageHeader title="My donations" subtitle="Loading your giving history…" />
        <LoadingSkeleton variant="table" rows={5} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="My donations"
        subtitle="Every gift, with its fund and its receipt reference."
        actions={
          <>
            <Select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Filter by year"
              className="w-[110px]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={exportCSV} disabled={inYear.length === 0}>
              <Download />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowReceipt(true)} disabled={inYear.length === 0}>
              <FileText />
              Download {year} statement
            </Button>
          </>
        }
      />

      {/* A guest's history lives on this browser and on the contact details they gave.
          Saying so plainly is fairer than letting them assume the temple is holding it
          for them — and the offer next to it is how they make that assumption true. */}
      {identity.isGuest ? (
        <Card className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-saffron-400/35 bg-saffron-400/[0.07] p-4">
          <UserRound className="size-4 shrink-0 text-brand-600" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
            Showing gifts matched to <span className="font-medium">{identity.contact.email}</span>{' '}
            and <span className="font-medium">{identity.contact.phone}</span>. Create an account and
            these move onto your permanent devotee record, reachable from any device.
          </p>
          <Link to={signUpHref} className={buttonVariants({ size: 'sm' })}>
            Create my account
          </Link>
        </Card>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile
          label={`${year} total`}
          value={money(total)}
          sub={`${inYear.length} gifts`}
          Icon={Coins}
          tone="leaf"
        />
        <StatTile
          label="Lifetime giving"
          value={money(lifetime)}
          sub={`${donations.length} gifts on record`}
        />
        <StatTile
          label="Pledged, not yet given"
          value={money(pledgeSummary.outstanding)}
          sub={
            pledgeSummary.count > 0 ? (
              <Link to="/my/pledges" className="font-medium text-brand-500 hover:underline">
                {pledgeSummary.count} {pledgeSummary.count === 1 ? 'pledge' : 'pledges'} open →
              </Link>
            ) : (
              <Link to="/donate?mode=pledge" className="font-medium text-brand-500 hover:underline">
                Make a pledge →
              </Link>
            )
          }
          Icon={CalendarCheck2}
          tone="gold"
        />
      </div>

      {inYear.length === 0 ? (
        <EmptyState
          Icon={Coins}
          title={`No donations recorded in ${year}`}
          detail="Pick another year, or make your first gift of the year."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Fund</TH>
                <TH>Purpose</TH>
                <TH>Method</TH>
                <TH>Receipt</TH>
                <TH className="text-right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {inYear.map((d) => (
                <TR key={d.id} className="hover:bg-tint/40">
                  <TD className="whitespace-nowrap text-muted">{fmtDate(d.createdAt)}</TD>
                  <TD>
                    <span className="font-medium">{titleCase(d.category)}</span>
                    {d.isRecurring ? (
                      <Badge variant="gold" className="ml-2">
                        {titleCase(d.recurringCadence ?? 'recurring')}
                      </Badge>
                    ) : null}
                    {/* Saying where a gift came from matters here: without it a pledge
                        payment looks like a second, unexplained donation beside the
                        pledge the devotee knows they still owe money on. */}
                    {d.pledgeId ? (
                      <Badge variant="neutral" className="ml-2">
                        Pledge
                      </Badge>
                    ) : null}
                  </TD>
                  <TD className="max-w-[220px] truncate text-muted">{purposeOf(d) || '—'}</TD>
                  <TD>{titleCase(d.paymentMethod)}</TD>
                  <TD className="font-mono text-[12px] text-muted">
                    {d.taxReceiptId ?? 'pending'}
                  </TD>
                  <TD className="text-right font-medium tabular-nums">{money(d.amount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      <Card className="mt-5 p-4 text-[12.5px] leading-relaxed text-muted">
        Sri Meenakshi Temple Society is a 501(c)(3) organization. Contributions are deductible to
        the extent allowed by law; no goods or services were provided in exchange other than
        intangible religious benefits.
      </Card>

      <Dialog
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        title={`${year} contribution statement`}
        description="This is the PDF preview — printing produces the same document."
        className="max-w-3xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowReceipt(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Download />
              Print / save as PDF
            </Button>
          </>
        }
      >
        <TaxReceiptPreview
          donorName={identity.name}
          donorAddress={identity.address}
          receiptNo={`STMT-${year}-${statementKey}`}
          year={year}
          lines={inYear.map((d) => {
            const purpose = purposeOf(d)
            return {
              date: d.createdAt,
              description: `${titleCase(d.category)}${purpose ? ` — ${purpose}` : ''}`,
              amount: d.amount,
            }
          })}
        />
      </Dialog>
    </>
  )
}
