/**
 * The single seam between the UI and the data.
 *
 * Everything below reads and writes in-memory mock arrays. Swap the bodies for `fetch`
 * calls and the whole app moves to a real backend without touching a single screen.
 */
import type {
  Booking,
  Donation,
  DonorContact,
  FacilityBooking,
  FamilyTree,
  ISODate,
  Membership,
  MembershipTier,
  Money,
  Project,
  PujaCatalogItem,
  PujaOccurrence,
  PujaPnLRow,
  PujaType,
  RecurringRule,
  Temple,
  TempleEvent,
  TransparencySnapshot,
  User,
  UUID,
} from './types'
import {
  BOOKINGS,
  DONATIONS,
  EVENTS,
  FACILITY_BOOKINGS,
  FAMILY_TREES,
  MEMBERSHIPS,
  OCCURRENCES,
  PROJECTS,
  PUJA_CATALOG,
  OCCURRENCES_PER_YEAR,
  PUJA_UNIT_COST,
  RECURRING_RULES,
  TEMPLE,
  TRANSPARENCY,
  USERS,
} from './mock'
import { LOCAL_KEYS, readLocal, writeLocal } from './local'
import { useAuthStore } from '@/lib/store/auth'
import { useProfileSignal } from '@/lib/store/profile'
import { contactMatches, normEmail, normPhone } from '@/lib/donor'
import type { DonorIdentity } from '@/lib/donor'
import { initialsOf } from '@/lib/utils'

export const simulateLatency = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 150))

const clone = <T>(x: T): T => structuredClone(x)

/* ------------------------------------------------------------------ identity */

export async function getCurrentUser(): Promise<User | null> {
  await simulateLatency()
  return useAuthStore.getState().user
}

export async function getTemple(): Promise<Temple> {
  await simulateLatency()
  return TEMPLE
}

export async function getDevoteeById(id: UUID): Promise<User | null> {
  await simulateLatency()
  return USERS.find((u) => u.id === id) ?? null
}

export async function listDevotees(query?: {
  search?: string
  tier?: MembershipTier
  city?: string
}): Promise<User[]> {
  await simulateLatency()
  const q = query?.search?.trim().toLowerCase()
  return USERS.filter((u) => u.role === 'devotee')
    .filter((u) => (q ? [u.name, u.email, u.phone].some((f) => f.toLowerCase().includes(q)) : true))
    .filter((u) => (query?.city ? u.city === query.city : true))
    .filter((u) => {
      if (!query?.tier) return true
      const m = MEMBERSHIPS.find((x) => x.userId === u.id && x.status === 'active')
      return m?.tier === query.tier
    })
}

/**
 * Turns a set of contact details into a devotee record.
 *
 * The guest flow needs this to mean something: a visitor who gave as a guest and then
 * accepts "create my account" must end up on their *own* record, not resolved onto a
 * seeded one. An email or phone the temple already knows returns the existing devotee
 * instead of opening a duplicate — the same rule `findDonorByContact` reports at the
 * gate. Gifts they made as a guest still surface, because `listDonationsFor` matches on
 * contact as well as on id.
 */
export async function registerDevotee(input: {
  firstName: string
  lastName: string
  email: string
  phone: string
  city?: string
  nakshatra?: string
  gothra?: string
}): Promise<User> {
  await simulateLatency()

  const existing = USERS.find(
    (u) => u.role === 'devotee' && contactMatches(u, { email: input.email, phone: input.phone }),
  )
  if (existing) return existing

  const name = `${input.firstName} ${input.lastName}`.trim()
  const user: User = {
    id: `usr_${String(USERS.length + 1).padStart(4, '0')}`,
    role: 'devotee',
    name,
    email: input.email.trim(),
    phone: input.phone.trim(),
    city: input.city?.trim() || undefined,
    country: 'US',
    nakshatra: input.nakshatra || undefined,
    gothra: input.gothra || undefined,
    createdAt: new Date().toISOString(),
    avatarInitials: initialsOf(name),
  }
  USERS.push(user)
  return user
}

export async function updateDevotee(id: UUID, patch: Partial<User>): Promise<User> {
  await simulateLatency()
  const u = USERS.find((x) => x.id === id)
  if (!u) throw new Error(`No such devotee: ${id}`)
  Object.assign(u, patch)
  if (useAuthStore.getState().user?.id === id) useAuthStore.getState().setUser({ ...u })
  return u
}

/**
 * Family trees the devotee has edited, replayed over the seed on first import so a
 * saved tree survives a reload. Seeded trees stay untouched until they are edited.
 */
function hydrateFamilyTrees() {
  for (const saved of readLocal<FamilyTree[]>(LOCAL_KEYS.familyTrees, [])) {
    const i = FAMILY_TREES.findIndex((f) => f.primaryUserId === saved.primaryUserId)
    if (i >= 0) FAMILY_TREES[i] = saved
    else FAMILY_TREES.push(saved)
  }
}
hydrateFamilyTrees()

export async function getFamilyTree(userId: UUID): Promise<FamilyTree | null> {
  await simulateLatency()
  return FAMILY_TREES.find((f) => f.primaryUserId === userId) ?? null
}

export async function saveFamilyTree(tree: FamilyTree): Promise<FamilyTree> {
  await simulateLatency()
  // Match on the devotee, not the tree id — the profile page mints `fam_<userId>`
  // when a devotee has no seeded tree, which would otherwise append a second tree
  // for the same person the first time they add a relative.
  const i = FAMILY_TREES.findIndex((f) => f.primaryUserId === tree.primaryUserId)
  if (i >= 0) FAMILY_TREES[i] = tree
  else FAMILY_TREES.push(tree)

  // Persist only the edited trees, not the whole seeded set.
  const edited = readLocal<FamilyTree[]>(LOCAL_KEYS.familyTrees, []).filter(
    (f) => f.primaryUserId !== tree.primaryUserId,
  )
  writeLocal(LOCAL_KEYS.familyTrees, [...edited, tree])

  // Tell anything deriving state from the tree — the completion ring, for one — that
  // its copy is now stale.
  useProfileSignal.getState().bumpFamily()

  return tree
}

/* ---------------------------------------------------------------- catalogue */

export async function getPujaCatalog(type?: PujaType): Promise<PujaCatalogItem[]> {
  await simulateLatency()
  return PUJA_CATALOG.filter((p) => (type ? p.type === type : true))
}

export async function getPujaById(id: UUID): Promise<PujaCatalogItem | null> {
  await simulateLatency()
  return PUJA_CATALOG.find((p) => p.id === id) ?? null
}

export async function savePujaCatalogItem(item: PujaCatalogItem): Promise<PujaCatalogItem> {
  await simulateLatency()
  const i = PUJA_CATALOG.findIndex((p) => p.id === item.id)
  if (i >= 0) PUJA_CATALOG[i] = item
  else PUJA_CATALOG.push(item)
  return item
}

export async function deletePujaCatalogItem(id: UUID): Promise<void> {
  await simulateLatency()
  const i = PUJA_CATALOG.findIndex((p) => p.id === id)
  if (i >= 0) PUJA_CATALOG.splice(i, 1)
}

/* ----------------------------------------------------------------- bookings */

export async function getMyBookings(userId: UUID): Promise<Booking[]> {
  await simulateLatency()
  return BOOKINGS.filter((b) => b.userId === userId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export async function listBookings(filter?: {
  status?: Booking['status']
  pujaCatalogId?: UUID
  from?: string
  to?: string
}): Promise<Booking[]> {
  await simulateLatency()
  return BOOKINGS.filter((b) => (filter?.status ? b.status === filter.status : true))
    .filter((b) => (filter?.pujaCatalogId ? b.pujaCatalogId === filter.pujaCatalogId : true))
    .filter((b) => (filter?.from ? b.startDate >= filter.from : true))
    .filter((b) => (filter?.to ? b.startDate <= filter.to : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getUpcomingOccurrences(userId?: UUID, days = 30): Promise<PujaOccurrence[]> {
  await simulateLatency()
  const now = Date.now()
  const until = now + days * 86400000
  const mine = userId ? new Set(BOOKINGS.filter((b) => b.userId === userId).map((b) => b.id)) : null
  return OCCURRENCES.filter((o) => {
    const t = new Date(o.scheduledAt).getTime()
    return t >= now && t <= until && (!mine || mine.has(o.bookingId))
  })
}

export async function getOccurrencesOn(date: Date, userId?: UUID): Promise<PujaOccurrence[]> {
  await simulateLatency()
  const key = date.toDateString()
  const mine = userId ? new Set(BOOKINGS.filter((b) => b.userId === userId).map((b) => b.id)) : null
  return OCCURRENCES.filter(
    (o) => new Date(o.scheduledAt).toDateString() === key && (!mine || mine.has(o.bookingId)),
  )
}

export async function setOccurrenceStatus(
  id: UUID,
  status: PujaOccurrence['status'],
): Promise<PujaOccurrence | null> {
  await simulateLatency()
  const o = OCCURRENCES.find((x) => x.id === id)
  if (!o) return null
  o.status = status
  o.fulfilledAt = status === 'completed' ? new Date().toISOString() : undefined
  return o
}

export async function createBooking(
  input: Omit<Booking, 'id' | 'createdAt' | 'status' | 'endDate'>,
): Promise<Booking> {
  await simulateLatency()
  const start = new Date(input.startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + (input.cadence === 'one-time' ? 1 : 365))
  const booking: Booking = {
    ...input,
    id: `bkg_${String(BOOKINGS.length + 1).padStart(4, '0')}`,
    endDate: end.toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  BOOKINGS.unshift(booking)
  return booking
}

export async function setBookingStatus(
  id: UUID,
  status: Booking['status'],
): Promise<Booking | null> {
  await simulateLatency()
  const b = BOOKINGS.find((x) => x.id === id)
  if (!b) return null
  b.status = status
  return b
}

/* ---------------------------------------------------------------- donations */

/**
 * Guest gifts replayed over the seed on first import.
 *
 * `DONATIONS` is an in-memory array that resets on reload — harmless for seeded records
 * nobody can lose, but a gift a visitor made ten minutes ago is the one record they will
 * come looking for. Mirrored into localStorage on write and read back here, so
 * `listDonationsFor` can still find it on their next visit.
 */
function hydrateGuestDonations() {
  const saved = readLocal<Donation[]>(LOCAL_KEYS.guestDonations, [])
  for (const d of saved) if (!DONATIONS.some((x) => x.id === d.id)) DONATIONS.unshift(d)
  DONATIONS.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
hydrateGuestDonations()

export async function listDonations(userId?: UUID): Promise<Donation[]> {
  await simulateLatency()
  return DONATIONS.filter((d) => (userId ? d.userId === userId : true))
}

/**
 * Every gift belonging to whoever is giving — by account where there is one, and by
 * contact details either way.
 *
 * The contact pass is what makes the guest flow worth anything: it reunites a visitor
 * with gifts made before they had an account, and it means a devotee who signs up after
 * giving as a guest finds that gift waiting in their statement rather than orphaned.
 */
export async function listDonationsFor(identity: DonorIdentity): Promise<Donation[]> {
  await simulateLatency()
  return DONATIONS.filter(
    (d) =>
      (identity.userId !== null && d.userId === identity.userId) ||
      contactMatches(d.donor, identity.contact),
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * The devotee account behind an email or phone, if the temple already has one.
 *
 * The gate calls this to offer "you already have an account — sign in instead" rather
 * than quietly opening a second, contactless record for somebody who is already a
 * devotee. It reports only that a match exists; it never signs anybody in.
 */
export async function findDonorByContact(contact: {
  email?: string
  phone?: string
}): Promise<User | null> {
  await simulateLatency()
  const email = normEmail(contact.email ?? '')
  const phone = normPhone(contact.phone ?? '')
  if (!email && phone.length < 10) return null
  return (
    USERS.find((u) => u.role === 'devotee' && contactMatches(u, { email, phone })) ?? null
  )
}

export async function createDonation(
  input: Omit<Donation, 'id' | 'createdAt' | 'taxReceiptId'>,
): Promise<Donation> {
  await simulateLatency()
  const n = DONATIONS.length + 1
  const donation: Donation = {
    ...input,
    id: `don_${String(n).padStart(4, '0')}`,
    taxReceiptId: `rcpt_${String(n).padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
  }
  DONATIONS.unshift(donation)

  // A guest gift has no seeded record to fall back on — see `hydrateGuestDonations`.
  if (!donation.userId && donation.donor) {
    writeLocal(LOCAL_KEYS.guestDonations, [
      donation,
      ...readLocal<Donation[]>(LOCAL_KEYS.guestDonations, []),
    ])
  }

  // An event sponsorship is money raised *for that festival*, so it moves the festival's
  // break-even meter as well as landing in the ledger. Without this the devotee sponsors
  // the flowers and the event page still reads the same figure it did a moment ago.
  if (donation.eventId) {
    const event = EVENTS.find((e) => e.id === donation.eventId)
    if (event) event.collectedAmount += donation.amount
  }

  return donation
}

/**
 * What a returning visitor has given before, keyed only on contact details.
 *
 * Shown at the gate the moment they finish typing their email or phone, so the
 * recognition is visible *before* they commit to a second gift.
 */
export async function getGivingSummaryForContact(contact: DonorContact): Promise<{
  count: number
  total: Money
  lastGiftAt: ISODate | null
}> {
  await simulateLatency()
  const account = USERS.find((u) => u.role === 'devotee' && contactMatches(u, contact))
  const mine = DONATIONS.filter(
    (d) =>
      (account && d.userId === account.id) || contactMatches(d.donor, contact),
  )
  return {
    count: mine.length,
    total: mine.reduce((s, d) => s + d.amount, 0),
    lastGiftAt: mine.map((d) => d.createdAt).sort().at(-1) ?? null,
  }
}

export async function issueTaxReceipts(ids: UUID[]): Promise<number> {
  await simulateLatency()
  let n = 0
  for (const id of ids) {
    const d = DONATIONS.find((x) => x.id === id)
    if (d && !d.taxReceiptId) {
      d.taxReceiptId = `rcpt_${d.id.replace('don_', '')}`
      n++
    }
  }
  return n
}

/** Per-donor totals for a calendar year — the tax-receipt bulk tool reads this. */
export async function getYearlyContributions(
  year: number,
): Promise<Array<{ user: User; donations: Money; sponsorships: Money; total: Money }>> {
  await simulateLatency()
  return USERS.filter((u) => u.role === 'devotee')
    .map((user) => {
      const donations = DONATIONS.filter(
        (d) => d.userId === user.id && new Date(d.createdAt).getFullYear() === year,
      ).reduce((s, d) => s + d.amount, 0)
      const sponsorships = BOOKINGS.filter(
        (b) =>
          b.userId === user.id &&
          b.status !== 'cancelled' &&
          new Date(b.createdAt).getFullYear() === year,
      ).reduce((s, b) => s + b.amount, 0)
      return { user, donations, sponsorships, total: donations + sponsorships }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
}

/* -------------------------------------------------------------- memberships */

export async function getMembership(userId: UUID): Promise<Membership | null> {
  await simulateLatency()
  return (
    MEMBERSHIPS.filter((m) => m.userId === userId).sort((a, b) =>
      b.endDate.localeCompare(a.endDate),
    )[0] ?? null
  )
}

export async function listMemberships(): Promise<Membership[]> {
  await simulateLatency()
  return [...MEMBERSHIPS].sort((a, b) => a.endDate.localeCompare(b.endDate))
}

export async function createMembership(
  input: Omit<Membership, 'id' | 'status'>,
): Promise<Membership> {
  await simulateLatency()
  const m: Membership = {
    ...input,
    id: `mem_${String(MEMBERSHIPS.length + 1).padStart(4, '0')}`,
    status: 'active',
  }
  MEMBERSHIPS.push(m)
  const u = USERS.find((x) => x.id === input.userId)
  if (u) u.membershipId = m.id
  return m
}

/* ------------------------------------------------------------------- events */

export async function listEvents(
  status?: 'upcoming' | 'ongoing' | 'completed',
): Promise<TempleEvent[]> {
  await simulateLatency()
  return EVENTS.filter((e) => (status ? e.status === status : true)).sort((a, b) =>
    a.date.localeCompare(b.date),
  )
}

export async function getEventBySlug(slug: string): Promise<TempleEvent | null> {
  await simulateLatency()
  return EVENTS.find((e) => e.slug === slug) ?? null
}

export async function getEventById(id: UUID): Promise<TempleEvent | null> {
  await simulateLatency()
  return EVENTS.find((e) => e.id === id) ?? null
}

export async function saveEvent(event: TempleEvent): Promise<TempleEvent> {
  await simulateLatency()
  const i = EVENTS.findIndex((e) => e.id === event.id)
  if (i >= 0) EVENTS[i] = event
  else EVENTS.push(event)
  EVENTS.sort((a, b) => a.date.localeCompare(b.date))
  return event
}

export async function deleteEvent(id: UUID): Promise<void> {
  await simulateLatency()
  const i = EVENTS.findIndex((e) => e.id === id)
  if (i >= 0) EVENTS.splice(i, 1)
}

export async function rsvpToEvent(id: UUID, seats: number): Promise<TempleEvent | null> {
  await simulateLatency()
  const e = EVENTS.find((x) => x.id === id)
  if (!e) return null
  e.rsvpCount += seats
  if (e.ticketPrice) e.collectedAmount += e.ticketPrice * seats
  return e
}

/* ----------------------------------------------------------------- facility */

export async function listFacilityBookings(): Promise<FacilityBooking[]> {
  await simulateLatency()
  return [...FACILITY_BOOKINGS]
}

export async function createFacilityBooking(
  input: Omit<FacilityBooking, 'id' | 'status'>,
): Promise<FacilityBooking> {
  await simulateLatency()
  const fb: FacilityBooking = {
    ...input,
    id: `fac_${String(FACILITY_BOOKINGS.length + 1).padStart(4, '0')}`,
    status: 'pending',
  }
  FACILITY_BOOKINGS.push(fb)
  return fb
}

export async function setFacilityBookingStatus(
  id: UUID,
  status: FacilityBooking['status'],
): Promise<void> {
  await simulateLatency()
  const fb = FACILITY_BOOKINGS.find((x) => x.id === id)
  if (fb) fb.status = status
}

/* ------------------------------------------------------------- transparency */

export async function listProjects(): Promise<Project[]> {
  await simulateLatency()
  return clone(PROJECTS)
}

export async function getTransparencySnapshot(): Promise<TransparencySnapshot> {
  await simulateLatency()
  return TRANSPARENCY
}

export async function getPujaPnL(): Promise<PujaPnLRow[]> {
  await simulateLatency()
  return PUJA_CATALOG.map((puja) => {
    const bookings = BOOKINGS.filter((b) => b.pujaCatalogId === puja.id && b.status !== 'cancelled')
    const collected = bookings.reduce((s, b) => s + b.amount, 0)
    // Revenue here is a full year of sponsorship, so cost has to be a full year too.
    // Counting occurrences from the 30-day materialisation window against annual
    // revenue is what made every puja look like it ran at a catastrophic loss.
    const unitCost = PUJA_UNIT_COST[puja.id] ?? Math.round(puja.basePrice * 0.5)
    const cost = bookings.reduce((s, b) => s + OCCURRENCES_PER_YEAR[b.cadence] * unitCost, 0)
    const net = collected - cost
    return {
      puja,
      sponsors: bookings.length,
      collected,
      cost,
      net,
      progressPct: collected === 0 ? 0 : Math.round((net / collected) * 100),
    }
  }).sort((a, b) => b.collected - a.collected)
}

/* ----------------------------------------------------------------- calendar */

export async function listRecurringRules(): Promise<RecurringRule[]> {
  await simulateLatency()
  return [...RECURRING_RULES]
}

export async function saveRecurringRule(rule: RecurringRule): Promise<RecurringRule> {
  await simulateLatency()
  const i = RECURRING_RULES.findIndex((r) => r.id === rule.id)
  if (i >= 0) RECURRING_RULES[i] = rule
  else RECURRING_RULES.push(rule)
  return rule
}

export async function deleteRecurringRule(id: UUID): Promise<void> {
  await simulateLatency()
  const i = RECURRING_RULES.findIndex((r) => r.id === id)
  if (i >= 0) RECURRING_RULES.splice(i, 1)
}

/* -------------------------------------------------------- admin aggregates */

export interface AdminStats {
  donationsMTD: Money
  donationsYTD: Money
  activeBookings: number
  activeMemberships: number
  devoteeCount: number
  newDevoteesThisWeek: number
  todayQueue: number
  overduePrasadam: number
  monthlyTrend: Array<{ month: string; amount: Money }>
  byPujaType: Array<{ type: string; bookings: number }>
}

export async function getAdminStats(): Promise<AdminStats> {
  await simulateLatency()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const donationsYTD = DONATIONS.filter((d) => new Date(d.createdAt).getFullYear() === year).reduce(
    (s, d) => s + d.amount,
    0,
  )
  const donationsMTD = DONATIONS.filter((d) => {
    const dt = new Date(d.createdAt)
    return dt.getFullYear() === year && dt.getMonth() === month
  }).reduce((s, d) => s + d.amount, 0)

  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const amount = DONATIONS.filter((d) => {
      const c = new Date(d.createdAt)
      return c.getFullYear() === dt.getFullYear() && c.getMonth() === dt.getMonth()
    }).reduce((s, d) => s + d.amount, 0)
    return { month: dt.toLocaleString('en-US', { month: 'short' }), amount }
  })

  const typeCounts = new Map<string, number>()
  for (const b of BOOKINGS) {
    if (b.status === 'cancelled') continue
    const puja = PUJA_CATALOG.find((p) => p.id === b.pujaCatalogId)
    if (!puja) continue
    typeCounts.set(puja.type, (typeCounts.get(puja.type) ?? 0) + 1)
  }

  const weekAgo = Date.now() - 7 * 86400000
  const todayKey = now.toDateString()

  return {
    donationsMTD,
    donationsYTD,
    activeBookings: BOOKINGS.filter((b) => b.status === 'active').length,
    activeMemberships: MEMBERSHIPS.filter((m) => m.status === 'active').length,
    devoteeCount: USERS.filter((u) => u.role === 'devotee').length,
    newDevoteesThisWeek: USERS.filter(
      (u) => u.role === 'devotee' && new Date(u.createdAt).getTime() > weekAgo,
    ).length,
    todayQueue: OCCURRENCES.filter(
      (o) => new Date(o.scheduledAt).toDateString() === todayKey && o.status === 'scheduled',
    ).length,
    overduePrasadam: BOOKINGS.filter(
      (b) => b.status === 'active' && b.addOns.includes('prasadam-post'),
    ).length,
    monthlyTrend,
    byPujaType: [...typeCounts.entries()].map(([type, bookings]) => ({ type, bookings })),
  }
}
