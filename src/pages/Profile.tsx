import { useEffect, useState } from 'react'
import { CreditCard, Info, Languages, Lock, Save } from 'lucide-react'
import type { FamilyMember, User } from '@/lib/data/types'
import { PageHeader } from '@/components/layout/layouts'
import { FamilyTreeEditor } from '@/components/shared/FamilyTreeEditor'
import { LoadingSkeleton } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox, Field, Input, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { GOTHRAS, NAKSHATRAS } from '@/lib/data/mock'
import { getFamilyTree, saveFamilyTree, updateDevotee } from '@/lib/data/api'
import { useAuthStore } from '@/lib/store/auth'
import { useAsync } from '@/lib/hooks'
import { fmtDate } from '@/lib/utils'

const PREFERENCES = [
  { key: 'weekly', label: 'Weekly festival email', detail: 'Every Thursday morning' },
  {
    key: 'reminders',
    label: 'Puja reminders',
    detail: 'An hour before each occurrence in your name',
  },
  {
    key: 'receipts',
    label: 'Instant tax receipts',
    detail: 'Emailed the moment a gift is recorded',
  },
  { key: 'annual', label: 'Annual report', detail: 'The full financial statement each January' },
]

export default function Profile() {
  const authUser = useAuthStore((s) => s.user)!
  const { toast } = useToast()

  const [form, setForm] = useState<User>(authUser)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    weekly: true,
    reminders: true,
    receipts: true,
    annual: false,
  })
  const [saving, setSaving] = useState(false)

  const { data: tree, loading } = useAsync(() => getFamilyTree(authUser.id), [authUser.id])

  useEffect(() => {
    if (tree) setMembers(tree.members)
  }, [tree])

  const set = (k: keyof User) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    await updateDevotee(authUser.id, form)
    await saveFamilyTree({
      id: tree?.id ?? `fam_${authUser.id}`,
      primaryUserId: authUser.id,
      members,
    })
    setSaving(false)
    toast('Profile saved', { detail: 'Your details are updated across the temple records.' })
  }

  return (
    <>
      <PageHeader
        title="Profile & settings"
        subtitle="Keep your nakshatra, gothra and family names current so every sankalpam is correct."
        actions={
          <Button onClick={save} disabled={saving}>
            <Save />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
            </CardHeader>
            <div className="grid gap-4 p-5 pt-0 sm:grid-cols-2">
              <Field label="Full name" htmlFor="pf-name" className="sm:col-span-2">
                <Input id="pf-name" value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Date of birth" htmlFor="pf-dob">
                <Input
                  id="pf-dob"
                  type="date"
                  value={form.dob ? form.dob.slice(0, 10) : ''}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                />
              </Field>
              <Field label="Nakshatra" htmlFor="pf-nak">
                <Select id="pf-nak" value={form.nakshatra ?? ''} onChange={set('nakshatra')}>
                  <option value="">Not set</option>
                  {NAKSHATRAS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Gothra" htmlFor="pf-got" className="sm:col-span-2">
                <Select id="pf-got" value={form.gothra ?? ''} onChange={set('gothra')}>
                  <option value="">Not set</option>
                  {GOTHRAS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <div className="grid gap-4 p-5 pt-0 sm:grid-cols-2">
              <Field label="Email" htmlFor="pf-email">
                <Input id="pf-email" type="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field
                label={
                  <span className="flex items-center gap-1.5">
                    Phone
                    <Lock className="size-3 text-muted" />
                  </span>
                }
                htmlFor="pf-phone"
                hint="read-only"
              >
                <div className="group relative">
                  <Input id="pf-phone" value={form.phone} readOnly disabled />
                  <span className="pointer-events-none absolute -top-1 right-0 hidden -translate-y-full rounded-md bg-ink px-2 py-1 text-[11.5px] text-white group-hover:block">
                    Contact temple admin to change
                  </span>
                </div>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <div className="grid gap-4 p-5 pt-0 sm:grid-cols-2">
              <Field label="Street" htmlFor="pf-addr" className="sm:col-span-2">
                <Input id="pf-addr" value={form.address ?? ''} onChange={set('address')} />
              </Field>
              <Field label="City" htmlFor="pf-city">
                <Input id="pf-city" value={form.city ?? ''} onChange={set('city')} />
              </Field>
              <Field label="State" htmlFor="pf-state">
                <Input id="pf-state" value={form.state ?? ''} onChange={set('state')} />
              </Field>
              <Field label="ZIP" htmlFor="pf-zip">
                <Input id="pf-zip" value={form.zip ?? ''} onChange={set('zip')} />
              </Field>
              <Field label="Country" htmlFor="pf-country">
                <Select
                  id="pf-country"
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value as User['country'] }))
                  }
                >
                  <option value="US">United States</option>
                  <option value="IN">India</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Family tree</CardTitle>
            </CardHeader>
            <div className="p-5 pt-0">
              {loading ? (
                <LoadingSkeleton variant="text" rows={3} />
              ) : (
                <FamilyTreeEditor members={members} onChange={setMembers} />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email preferences</CardTitle>
            </CardHeader>
            <div className="space-y-2 p-5 pt-0">
              {PREFERENCES.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line p-3 transition-colors hover:border-brand-300"
                >
                  <Checkbox
                    checked={prefs[p.key] ?? false}
                    onChange={(e) => setPrefs((s) => ({ ...s, [p.key]: e.target.checked }))}
                  />
                  <span>
                    <span className="block text-[13.5px] font-medium text-ink">{p.label}</span>
                    <span className="block text-[12.5px] text-muted">{p.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment methods</CardTitle>
            </CardHeader>
            <div className="p-5 pt-0">
              <div className="flex items-center gap-3 rounded-[10px] border border-line p-3.5">
                <CreditCard className="size-5 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">Visa ending 4242</p>
                  <p className="text-[12.5px] text-muted">Expires 09/2029 · default</p>
                </div>
                <Badge variant="neutral">Mock</Badge>
              </div>
              <Button variant="ghost" size="sm" className="mt-3" disabled>
                Add a payment method
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language</CardTitle>
            </CardHeader>
            <div className="p-5 pt-0">
              <Field label="Display language" htmlFor="pf-lang">
                <Select id="pf-lang" defaultValue="en">
                  <option value="en">English</option>
                  <option value="ta" disabled>
                    தமிழ் (Tamil) — coming in v2
                  </option>
                </Select>
              </Field>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-muted">
                <Languages className="size-3.5" />
                Tamil localisation is planned for the next release.
              </p>
            </div>
          </Card>
        </div>

        <Card className="sticky top-6 p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-brand-500" />
            <h3 className="font-serif text-[18px]">Why we ask</h3>
          </div>
          <ul className="mt-3 space-y-3.5 text-[13px] leading-relaxed text-muted">
            <li>
              <strong className="block text-ink">Nakshatra & gothra</strong>
              Read aloud in every sankalpam. Getting these right matters more than anything else on
              this page.
            </li>
            <li>
              <strong className="block text-ink">Family tree</strong>
              Saved names become one-tap options in the booking flow, so you never retype them.
            </li>
            <li>
              <strong className="block text-ink">Address</strong>
              Used for prasadam-by-post and for your mailed annual tax statement.
            </li>
            <li>
              <strong className="block text-ink">Phone is locked</strong>
              Your number is the temple’s identity anchor for your household. The office desk can
              change it after verifying you in person.
            </li>
          </ul>
          <div className="mt-4 border-t border-line pt-3 text-[12.5px] text-muted">
            <p>
              Devotee since{' '}
              <span className="font-medium text-ink">
                {fmtDate(authUser.createdAt, 'MMMM yyyy')}
              </span>
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
