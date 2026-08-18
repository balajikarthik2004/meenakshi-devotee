import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, Loader2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { Chips } from '@/components/ui/tabs'
import { Logo } from '@/components/shared/Logo'
import { DeityArt } from '@/components/shared/DeityArt'
import { useAuthStore } from '@/lib/store/auth'
import { DEVOTEES, TEMPLE } from '@/lib/data/mock'

const COUNTRY_CODES = ['+1', '+91', '+44', '+61']

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)

  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState(DEVOTEES[0]!.email)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('+1')
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await signIn(mode === 'email' ? email : `${code}${phone}`)
    setBusy(false)
    navigate(from, { replace: true })
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left — temple imagery and welcome copy */}
      <aside className="relative hidden overflow-hidden lg:block">
        <DeityArt
          deity="Meenakshi"
          className="absolute inset-0 h-full w-full"
          label="Temple welcome"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/80 via-brand-900/55 to-brand-900/90" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-2.5 text-white">
            <Logo size={38} />
            <span className="font-serif text-[17px] text-saffron-100">{TEMPLE.name}</span>
          </Link>
          <div className="max-w-md space-y-3">
            <h2 className="font-serif text-[36px] leading-[1.12] text-saffron-100">
              Welcome back to your temple.
            </h2>
            <p className="text-[15px] leading-relaxed text-white/80">
              Sign in to sponsor a puja in your family’s name, follow your spiritual calendar, and
              see exactly where every dollar you give is spent.
            </p>
          </div>
          <p className="text-[12.5px] text-white/60">
            {TEMPLE.address}, {TEMPLE.city}, {TEMPLE.state} · {TEMPLE.phone}
          </p>
        </div>
      </aside>

      {/* Right — the form */}
      <main className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            Back to the temple site
          </Link>

          <div className="mb-6 lg:hidden">
            <Logo size={40} />
          </div>

          <h1 className="font-serif text-[28px] leading-tight">Sign in</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Any email or phone number works in this prototype.
          </p>

          <Chips
            className="mt-6"
            value={mode}
            onChange={(k) => {
              setMode(k as 'email' | 'phone')
              setOtpSent(false)
            }}
            items={[
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
            ]}
          />

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === 'email' ? (
              <>
                <Field label="Email address" htmlFor="si-email">
                  <Input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Password" htmlFor="si-pass" hint="not checked">
                  <Input
                    id="si-pass"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Mobile number" htmlFor="si-phone">
                  <div className="flex gap-2">
                    <Select
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      aria-label="Country code"
                      className="w-[92px] shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                    <Input
                      id="si-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="281 555 0148"
                    />
                  </div>
                </Field>

                {otpSent ? (
                  <Field label="Verification code" htmlFor="si-otp" hint="any 6 digits">
                    <Input
                      id="si-otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="••••••"
                      className="tracking-[0.4em]"
                    />
                  </Field>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setOtpSent(true)}
                    disabled={!phone}
                  >
                    <Smartphone />
                    Send OTP
                  </Button>
                )}
              </>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {busy ? 'Signing you in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-[13px] text-muted">
            New here?{' '}
            <Link to="/signup" className="font-medium text-brand-500 hover:underline">
              Create a devotee account →
            </Link>
          </p>

          <div className="mt-8 rounded-[10px] border border-line bg-tint/50 p-3.5 text-[12.5px] leading-relaxed text-muted">
            <p className="font-medium text-ink">Prototype note</p>
            <p>
              No credentials are verified. Submitting signs you in as{' '}
              <span className="font-medium text-ink">{DEVOTEES[0]!.name}</span> unless the email or
              phone matches another seeded devotee.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
