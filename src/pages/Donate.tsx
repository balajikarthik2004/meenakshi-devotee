import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HandCoins, Loader2 } from 'lucide-react'
import type { Cadence, Donation, DonationCategory } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { AmountPresets } from '@/components/shared/AmountPresets'
import { PaymentMethodPicker } from '@/components/shared/PaymentMethodPicker'
import { MockSuccessScreen } from '@/components/shared/MockSuccessScreen'
import { TaxReceiptPreview } from '@/components/shared/TaxReceiptPreview'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Radio } from '@/components/ui/input'
import { DONATION_CATEGORIES } from '@/lib/data/mock'
import { createDonation } from '@/lib/data/api'
import { useAuthStore } from '@/lib/store/auth'
import { cn, money, titleCase } from '@/lib/utils'

const CADENCES: Cadence[] = ['monthly', 'quarterly', 'yearly']

export default function Donate() {
  const user = useAuthStore((s) => s.user)!
  const [params] = useSearchParams()

  const [category, setCategory] = useState<DonationCategory>(
    (params.get('category') as DonationCategory) ?? 'general-hundi',
  )
  const [amount, setAmount] = useState(Number(params.get('amount')) || 108)
  const [recurring, setRecurring] = useState(false)
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [dedication, setDedication] = useState(params.get('dedicate') ?? '')
  const [method, setMethod] = useState<Donation['paymentMethod']>('card')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Donation | null>(null)

  const give = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 800))
    const d = await createDonation({
      userId: user.id,
      category,
      amount,
      isRecurring: recurring,
      recurringCadence: recurring ? cadence : undefined,
      paymentMethod: method,
      dedicatedTo: dedication.trim() || undefined,
    })
    setBusy(false)
    setDone(d)
  }

  if (done) {
    return (
      <MockSuccessScreen
        title="Thank you for your offering"
        subtitle={`${money(done.amount)} to the ${titleCase(done.category)} fund${
          done.isRecurring ? `, repeating ${done.recurringCadence}` : ''
        }.`}
        referenceLabel="Donation"
        reference={done.id}
        rows={[
          { label: 'Fund', value: titleCase(done.category) },
          { label: 'Amount', value: money(done.amount) },
          {
            label: 'Frequency',
            value: done.isRecurring
              ? `Recurring · ${titleCase(done.recurringCadence!)}`
              : 'One-time',
          },
          { label: 'Method', value: titleCase(done.paymentMethod) },
          ...(done.dedicatedTo ? [{ label: 'Dedicated to', value: done.dedicatedTo }] : []),
        ]}
        emailSubject={`Your ${money(done.amount)} gift to Sri Meenakshi Devasthanam`}
        emailBody={
          <>
            <p>Dear {user.name},</p>
            <p className="mt-2">
              Thank you for your gift of <strong>{money(done.amount)}</strong> to the{' '}
              {titleCase(done.category)} fund. Your official contribution statement is attached
              below and will also appear in your {new Date().getFullYear()} annual summary.
            </p>
            {done.dedicatedTo ? (
              <p className="mt-2">
                This gift was dedicated: <em>{done.dedicatedTo}</em>.
              </p>
            ) : null}
          </>
        }
        extra={
          <TaxReceiptPreview
            donorName={user.name}
            donorAddress={
              user.address ? `${user.address}, ${user.city}, ${user.state} ${user.zip}` : undefined
            }
            receiptNo={done.taxReceiptId ?? done.id}
            lines={[
              {
                date: done.createdAt,
                description: `${titleCase(done.category)} donation${
                  done.dedicatedTo ? ` — ${done.dedicatedTo}` : ''
                }`,
                amount: done.amount,
              },
            ]}
          />
        }
        actions={
          <>
            <Link to="/dashboard" className={buttonVariants({ variant: 'ghost' })}>
              Back to dashboard
            </Link>
            <Link to="/my/donations" className={buttonVariants({})}>
              My donations
            </Link>
          </>
        }
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Make a donation"
        subtitle="Choose where your gift goes. Every fund is reported separately in the annual statement."
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-serif text-[18px]">Where would you like to give?</h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {DONATION_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={category === c.key}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    'rounded-[10px] border p-3.5 text-left transition-colors active:scale-[.99]',
                    category === c.key
                      ? 'border-brand-500 bg-brand-500/[0.06] ring-2 ring-brand-500/20'
                      : 'border-line bg-card hover:border-brand-300',
                  )}
                >
                  <span className="block text-[14px] font-medium text-ink">{c.label}</span>
                  <span className="block text-[12.5px] text-muted">{c.blurb}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-serif text-[18px]">How much?</h2>
            <AmountPresets value={amount} onChange={setAmount} />

            <div className="border-t border-line pt-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                Frequency
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                  <Radio name="freq" checked={!recurring} onChange={() => setRecurring(false)} />
                  One-time gift
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                  <Radio name="freq" checked={recurring} onChange={() => setRecurring(true)} />
                  Recurring gift
                </label>
              </div>

              {recurring ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {CADENCES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={cadence === c}
                      onClick={() => setCadence(c)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                        cadence === c
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-line bg-card text-ink hover:border-brand-300',
                      )}
                    >
                      {titleCase(c)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Field
              label="Dedicate this donation to…"
              hint="optional"
              htmlFor="dn-ded"
              className="border-t border-line pt-4"
            >
              <Input
                id="dn-ded"
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                placeholder="In memory of my father"
              />
            </Field>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="font-serif text-[18px]">Payment method</h2>
            <PaymentMethodPicker
              value={method}
              onChange={setMethod}
              allow={['card', 'ach', 'zelle', 'check']}
            />
          </Card>
        </div>

        <Card className="sticky top-6 p-5">
          <h3 className="font-serif text-[18px]">Your gift</h3>
          <dl className="mt-3 space-y-2.5 text-[13.5px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Fund</dt>
              <dd className="font-medium">{titleCase(category)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Frequency</dt>
              <dd className="font-medium">
                {recurring ? `Recurring · ${titleCase(cadence)}` : 'One-time'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Method</dt>
              <dd className="font-medium">{titleCase(method)}</dd>
            </div>
            {dedication ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Dedication</dt>
                <dd className="max-w-[55%] text-right font-medium">{dedication}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <span className="text-[13.5px] font-medium">Total today</span>
            <span className="font-serif text-[26px] tabular-nums">{money(amount)}</span>
          </div>

          <Button size="lg" className="mt-4 w-full" onClick={give} disabled={busy || amount < 1}>
            {busy ? <Loader2 className="animate-spin" /> : <HandCoins />}
            {busy ? 'Processing…' : `Give ${money(amount)}`}
          </Button>

          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
            A 501(c)(3) tax receipt is issued immediately. No goods or services are provided in
            exchange for your contribution.
          </p>
        </Card>
      </div>
    </>
  )
}
