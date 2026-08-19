import { useMemo, useState } from 'react'
import { Coins, Download, FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { TaxReceiptPreview } from '@/components/shared/TaxReceiptPreview'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/overlay'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { StatTile } from '@/components/shared/StatTile'
import { listDonations } from '@/lib/data/api'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { downloadCSV, fmtDate, money, titleCase } from '@/lib/utils'

export default function MyDonations() {
  const user = useAuthStore((s) => s.user)!
  const { data, loading } = useAsync(() => listDonations(user.id), [user.id])
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [showReceipt, setShowReceipt] = useState(false)

  const donations = useMemo(() => data ?? [], [data])

  const years = useMemo(() => {
    const set = new Set(donations.map((d) => new Date(d.createdAt).getFullYear()))
    set.add(new Date().getFullYear())
    return [...set].sort((a, b) => b - a)
  }, [donations])

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
        Dedication: d.dedicatedTo ?? '',
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
          label="Recurring gifts"
          value={donations.filter((d) => d.isRecurring).length}
          sub="Active standing orders"
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
                <TH>Dedication</TH>
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
                  </TD>
                  <TD className="max-w-[220px] truncate text-muted">{d.dedicatedTo ?? '—'}</TD>
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
        Sri Meenakshi Temple Society is a 501(c)(3) organization. Contributions are deductible to the
        extent allowed by law; no goods or services were provided in exchange other than intangible
        religious benefits.
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
          donorName={user.name}
          donorAddress={
            user.address ? `${user.address}, ${user.city}, ${user.state} ${user.zip}` : undefined
          }
          receiptNo={`STMT-${year}-${user.id.toUpperCase()}`}
          year={year}
          lines={inYear.map((d) => ({
            date: d.createdAt,
            description: `${titleCase(d.category)}${d.dedicatedTo ? ` — ${d.dedicatedTo}` : ''}`,
            amount: d.amount,
          }))}
        />
      </Dialog>
    </>
  )
}
