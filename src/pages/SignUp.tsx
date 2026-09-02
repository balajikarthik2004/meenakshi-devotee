import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/input'
import { Logo } from '@/components/shared/Logo'
import { DeityArt } from '@/components/shared/DeityArt'
import { GOTHRAS, NAKSHATRAS, TEMPLE } from '@/lib/data/mock'
import { registerDevotee } from '@/lib/data/api'
import { useAuthStore } from '@/lib/store/auth'
import { useGuestDonorStore } from '@/lib/store/guest'

export default function SignUp() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)
  const clearContact = useGuestDonorStore((s) => s.clearContact)
  const [busy, setBusy] = useState(false)

  /* A donor arriving from the giving flow has already typed all four of these. Asking
     again is the quickest way to lose the account they were about to create. */
  const fromDonation = params.has('email') || params.has('phone')
  const [form, setForm] = useState({
    firstName: params.get('first') ?? '',
    lastName: params.get('last') ?? '',
    email: params.get('email') ?? '',
    phone: params.get('phone') ?? '',
    city: 'Pearland',
    nakshatra: '',
    gothra: '',
  })

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const user = await registerDevotee(form)
    setUser(user)
    // The guest contact has served its purpose — the record it stood in for now exists,
    // and leaving it behind would keep `useDonorIdentity` juggling two identities.
    clearContact()
    setBusy(false)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        <DeityArt
          deity="Ganesha"
          className="absolute inset-0 h-full w-full"
          label="Temple welcome"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/80 via-brand-900/55 to-brand-900/90" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={38} />
            <span className="font-serif text-[17px] text-saffron-100">{TEMPLE.name}</span>
          </Link>
          <div className="max-w-md space-y-3">
            <h2 className="font-serif text-[36px] leading-[1.12] text-saffron-100">
              Join the temple family.
            </h2>
            <p className="text-[15px] leading-relaxed text-white/80">
              One account keeps your nakshatra, gothra and family names ready — so sponsoring a puja
              takes under a minute, every time.
            </p>
          </div>
          <p className="text-[12.5px] text-white/60">
            Serving the Houston metro since 1982 · A 501(c)(3) non-profit
          </p>
        </div>
      </aside>

      <main className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            Back to the temple site
          </Link>

          <h1 className="font-serif text-[28px] leading-tight">Create a devotee account</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Nothing is validated here — fill in as much or as little as you like.
          </p>

          {fromDonation ? (
            <Card className="mt-5 border-leaf-500/25 bg-leaf-500/[0.06] p-3.5 text-[13px] leading-relaxed text-ink">
              We have carried over the details from your donation. Finish here and every gift made
              with this email or mobile — including that one — moves onto your devotee record.
            </Card>
          ) : null}

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="su-first">
              <Input
                id="su-first"
                autoComplete="given-name"
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="Santhosh"
              />
            </Field>
            <Field label="Last name" htmlFor="su-last">
              <Input
                id="su-last"
                autoComplete="family-name"
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Kumar"
              />
            </Field>
            <Field label="Email" htmlFor="su-email">
              <Input
                id="su-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@gmail.com"
              />
            </Field>
            <Field label="Mobile" htmlFor="su-phone" hint="identity anchor">
              <Input
                id="su-phone"
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="(281) 555-0148"
              />
            </Field>
            <Field label="City" htmlFor="su-city">
              <Input id="su-city" value={form.city} onChange={set('city')} />
            </Field>
            <Field label="Nakshatra" htmlFor="su-nak">
              <Select id="su-nak" value={form.nakshatra} onChange={set('nakshatra')}>
                <option value="">Not sure yet</option>
                {NAKSHATRAS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Gothra" htmlFor="su-got" className="sm:col-span-2">
              <Select id="su-got" value={form.gothra} onChange={set('gothra')}>
                <option value="">Not sure yet</option>
                {GOTHRAS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Field>

            <Button type="submit" size="lg" className="sm:col-span-2" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <UserPlus />}
              {busy ? 'Creating your account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-[13px] text-muted">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-brand-500 hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
