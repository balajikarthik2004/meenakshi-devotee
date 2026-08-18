import { Link, useNavigate } from 'react-router-dom'
import { Copy, Flame, Pause, Play, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/layouts'
import { MyPujaTimeline } from '@/components/devotee/MyPujaTimeline'
import { StatusPill } from '@/components/shared/badges'
import { EmptyState, LoadingSkeleton } from '@/components/shared/states'
import { DeityArt } from '@/components/shared/DeityArt'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { getMyBookings, getUpcomingOccurrences, setBookingStatus } from '@/lib/data/api'
import { PUJA_BY_ID, STANDARD_ADDONS } from '@/lib/data/mock'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { fmtDate, money, titleCase } from '@/lib/utils'

export default function MyPujas() {
  const user = useAuthStore((s) => s.user)!
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data, loading, refresh } = useAsync(
    async () => Promise.all([getMyBookings(user.id), getUpcomingOccurrences(user.id, 120)]),
    [user.id],
  )

  if (loading || !data) {
    return (
      <>
        <PageHeader title="My pujas" subtitle="Loading your sponsorships…" />
        <LoadingSkeleton variant="table" rows={4} />
      </>
    )
  }

  const [bookings, occurrences] = data
  const live = bookings.filter((b) => b.status === 'active' || b.status === 'paused')
  const past = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled')

  const act = async (id: string, status: 'active' | 'paused' | 'cancelled', label: string) => {
    await setBookingStatus(id, status)
    toast(label)
    refresh()
  }

  return (
    <>
      <PageHeader
        title="My pujas"
        subtitle={`${live.length} live sponsorship${live.length === 1 ? '' : 's'} · ${past.length} in your history`}
        actions={
          <Link to="/puja" className={buttonVariants({ size: 'sm' })}>
            <Flame />
            Sponsor another
          </Link>
        }
      />

      {live.length === 0 ? (
        <EmptyState
          Icon={Flame}
          title="No live sponsorships"
          detail="When you sponsor a puja, its next three occurrences will appear here."
          action={
            <Link to="/puja/yearly" className={buttonVariants({ size: 'sm' })}>
              Browse yearly pujas
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {live.map((b) => {
            const puja = PUJA_BY_ID.get(b.pujaCatalogId)
            const mine = occurrences.filter((o) => o.bookingId === b.id)
            return (
              <Card key={b.id} className="overflow-hidden">
                <div className="grid gap-0 sm:grid-cols-[132px_1fr]">
                  <DeityArt deity={puja?.deity ?? 'Meenakshi'} className="hidden sm:block" />
                  <div className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-[19px] leading-tight">{puja?.name}</h2>
                        <StatusPill status={b.status} />
                      </div>
                      <p className="mt-1 text-[13px] text-muted">
                        {titleCase(b.cadence)} · {puja?.deity} sannidhi · {fmtDate(b.startDate)} –{' '}
                        {fmtDate(b.endDate)}
                      </p>

                      <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
                        <div>
                          <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                            Sankalpam
                          </dt>
                          <dd className="mt-0.5">{b.sankalpamNames.join(', ')}</dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                            Add-ons
                          </dt>
                          <dd className="mt-0.5">
                            {b.addOns.length
                              ? b.addOns
                                  .map((a) => STANDARD_ADDONS.find((x) => x.id === a)?.label)
                                  .filter(Boolean)
                                  .join(', ')
                              : 'None'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                            Sponsored
                          </dt>
                          <dd className="mt-0.5 font-medium">{money(b.amount)}</dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                            Booking
                          </dt>
                          <dd className="mt-0.5 font-mono text-[12px]">{b.id}</dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {b.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => act(b.id, 'paused', 'Sponsorship paused')}
                          >
                            <Pause />
                            Pause
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => act(b.id, 'active', 'Sponsorship resumed')}
                          >
                            <Play />
                            Resume
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/puja/book/${b.pujaCatalogId}`)}
                        >
                          <Copy />
                          Duplicate
                        </Button>
                        <Button
                          variant="plain"
                          size="sm"
                          onClick={() => act(b.id, 'cancelled', 'Sponsorship cancelled')}
                        >
                          <X />
                          Cancel
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-[10px] border border-line bg-tint/40 p-4">
                      <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                        Next occurrences
                      </p>
                      <MyPujaTimeline occurrences={mine} />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {past.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-[20px]">History</h2>
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-card">
            {past.map((b) => {
              const puja = PUJA_BY_ID.get(b.pujaCatalogId)
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{puja?.name}</p>
                    <p className="text-[12.5px] text-muted">
                      {titleCase(b.cadence)} · {fmtDate(b.startDate)} – {fmtDate(b.endDate)}
                    </p>
                  </div>
                  <span className="text-[13px] tabular-nums text-muted">{money(b.amount)}</span>
                  <StatusPill status={b.status} />
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </>
  )
}
