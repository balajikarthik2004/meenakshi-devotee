import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Logo } from '@/components/shared/Logo'
import { DeityArt } from '@/components/shared/DeityArt'
import { GOTHRAS, NAKSHATRAS, TEMPLE } from '@/lib/data/mock'
import { useAuthStore } from '@/lib/store/auth'

export default function SignUp() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'Pearland',
    nakshatra: '',
    gothra: '',
  })

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await signIn(form.email || form.phone)
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
            Nothing is validated in this prototype — fill in as much or as little as you like.
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="su-name" className="sm:col-span-2">
              <Input
                id="su-name"
                value={form.name}
                onChange={set('name')}
                placeholder="Anand Krishnan"
              />
            </Field>
            <Field label="Email" htmlFor="su-email">
              <Input
                id="su-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
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
