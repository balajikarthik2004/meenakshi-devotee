import { useMemo, useState } from 'react'
import { Download, FileText, ReceiptText } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { TaxReceiptPreview } from '@/components/shared/TaxReceiptPreview'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/overlay'
import { getMyBookings, listDonations } from '@/lib/data/api'
import { PUJA_BY_ID } from '@/lib/data/mock'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { fmtDate, money, titleCase } from '@/lib/utils'

export default function MyReceipts() {
  const user = useAuthStore((s) => s.user)!
  const { data, loading } = useAsync(
    async () => Promise.all([listDonations(user.id), getMyBookings(user.id)]),
    [user.id],
  )
  const [openYear, setOpenYear] = useState<number | null>(null)

  const byYear = useMemo(() => {
    if (!data) return []
    const [donations, bookings] = data
    const map = new Map<number, { date: string; description: string; amount: number }[]>()

    for (const d of donations) {
      const y = new Date(d.createdAt).getFullYear()
      const list = map.get(y) ?? []
      list.push({
        date: d.createdAt,
        description: `${titleCase(d.category)} donation${d.dedicatedTo ? ` — ${d.dedicatedTo}` : ''}`,
        amount: d.amount,
      })
      map.set(y, list)
    }
    for (const b of bookings) {
      if (b.status === 'cancelled') continue
      const y = new Date(b.createdAt).getFullYear()
      const list = map.get(y) ?? []
      list.push({
        date: b.createdAt,
        description: `${PUJA_BY_ID.get(b.pujaCatalogId)?.name ?? 'Puja'} sponsorship (${b.cadence})`,
        amount: b.amount,
      })
      map.set(y, list)
    }

    return [...map.entries()]
      .map(([year, lines]) => ({
        year,
        lines: lines.sort((a, b) => a.date.localeCompare(b.date)),
        total: lines.reduce((s, l) => s + l.amount, 0),
      }))
      .sort((a, b) => b.year - a.year)
  }, [data])

  if (loading) {
    return (
      <>
        <PageHeader title="Receipt archive" subtitle="Loading your statements…" />
        <LoadingSkeleton variant="table" rows={4} />
      </>
    )
  }

  const open = byYear.find((y) => y.year === openYear)

  return (
    <>
      <PageHeader
        title="Receipt archive"
        subtitle="One consolidated 501(c)(3) statement per year, covering donations and puja sponsorships."
      />

      {byYear.length === 0 ? (
        <EmptyState
          Icon={ReceiptText}
          title="No receipts yet"
          detail="Your first gift or sponsorship will generate a statement here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byYear.map((y) => (
            <Card key={y.year} className="flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-[22px]">{y.year}</h2>
                <span className="grid size-9 place-items-center rounded-[10px] bg-tint text-brand-500">
                  <FileText className="size-4" />
                </span>
              </div>
              <p className="mt-2 font-serif text-[26px] leading-none">{money(y.total)}</p>
              <p className="mt-1.5 text-[12.5px] text-muted">
                {y.lines.length} line item{y.lines.length === 1 ? '' : 's'} · issued{' '}
                {y.year === new Date().getFullYear()
                  ? `provisional, final Jan ${y.year + 1}`
                  : fmtDate(new Date(y.year + 1, 0, 15), 'MMM d, yyyy')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setOpenYear(y.year)}
              >
                <Download />
                View statement
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open != null}
        onClose={() => setOpenYear(null)}
        title={`${open?.year} contribution statement`}
        description="PDF preview — use Print to save a copy."
        className="max-w-3xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenYear(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Download />
              Print / save as PDF
            </Button>
          </>
        }
      >
        {open ? (
          <TaxReceiptPreview
            donorName={user.name}
            donorAddress={
              user.address ? `${user.address}, ${user.city}, ${user.state} ${user.zip}` : undefined
            }
            receiptNo={`STMT-${open.year}-${user.id.toUpperCase()}`}
            year={open.year}
            lines={open.lines}
          />
        ) : null}
      </Dialog>
    </>
  )
}
