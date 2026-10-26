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
  FacilityBookingStatus,
  FacilitySlotKey,
  FacilityVenue,
  FamilyTree,
  ISODate,
  KitchenOrder,
  ClassEnrolment,
  Membership,
  SchoolClass,
  SchoolTerm,
  MenuItem,
  MembershipTier,
  Money,
  OrderLine,
  OrderStatus,
  Pledge,
  PledgeInstallment,
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
  FACILITY_VENUES,
  FAMILY_TREES,
  KITCHEN_ORDERS,
  CLASS_ENROLMENTS,
  MEMBERSHIPS,
  SCHOOL_CLASSES,
  SCHOOL_TERM,
  MENU,
  tokenFor,
  OCCURRENCES,
  PLEDGES,
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
import { priceBooking, slotAvailability } from '@/lib/facility'
import { enrolVerdict, holdsSeat, initialStatus } from '@/lib/school'
import {
  estimateMinutes,
  isActive,
  isItemServed,
  kitchenStatusAt,
  linesSubtotal,
} from '@/lib/kitchen'
import { useAuthStore } from '@/lib/store/auth'
import { useProfileSignal } from '@/lib/store/profile'
import { contactMatches, normEmail, normPhone } from '@/lib/donor'
import type { DonorIdentity } from '@/lib/donor'
import { initialsOf } from '@/lib/utils'
import { buildSchedule, derivePledgeStatus } from '@/lib/pledge'

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

/**
 * Moves the meters a gift is supposed to move.
 *
 * A gift to a festival or a capital project is not only a row in the ledger — it is
 * the number on the page the devotee was looking at when they decided to give, and a
 * meter that still reads the same figure a moment later reads as a bug. Both targets
 * are handled in one place because the two call sites that need it (a new gift, and a
 * locally-saved gift replayed after a reload) must agree, and because a third kind of
 * earmark will want exactly the same treatment.
 */
function applyDonationToFunds(d: Donation) {
  if (d.eventId) {
    const event = EVENTS.find((e) => e.id === d.eventId)
    if (event) event.collectedAmount += d.amount
  }
  if (d.projectId) {
    const project = PROJECTS.find((p) => p.id === d.projectId)
    if (project) project.raisedAmount += d.amount
  }
}

function hydrateGuestDonations() {
  const saved = readLocal<Donation[]>(LOCAL_KEYS.guestDonations, [])
  for (const d of saved) {
    if (DONATIONS.some((x) => x.id === d.id)) continue
    DONATIONS.unshift(d)
    // Replayed inside the dedupe guard, so a gift that is in two stores at once —
    // a guest's pledge payment is in both — moves its meter exactly once.
    applyDonationToFunds(d)
  }
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
  return USERS.find((u) => u.role === 'devotee' && contactMatches(u, { email, phone })) ?? null
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

  // An earmarked gift is money raised *for that thing*, so it moves the festival's
  // break-even meter or the project's funding bar as well as landing in the ledger.
  applyDonationToFunds(donation)

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
    (d) => (account && d.userId === account.id) || contactMatches(d.donor, contact),
  )
  return {
    count: mine.length,
    total: mine.reduce((s, d) => s + d.amount, 0),
    lastGiftAt:
      mine
        .map((d) => d.createdAt)
        .sort()
        .at(-1) ?? null,
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

/* ------------------------------------------------------------------ pledges */

/**
 * Pledges, and the instalments settled against them.
 *
 * Two different things need to survive a reload here, so they are stored apart.
 * `created` holds whole pledges this browser made, which have no seeded original to
 * fall back to. `changed` holds only the mutable parts of a seeded pledge, replayed
 * over the seed — storing the whole record would let a stale copy silently override a
 * later change to the seed itself. `donations` carries the ledger entries that
 * settling an instalment minted, because an instalment that stays paid across a
 * reload while the gift it refers to disappears is a record that contradicts itself.
 */
interface SavedPledges {
  created: Pledge[]
  changed: Record<
    UUID,
    { status: Pledge['status']; cancelledAt?: ISODate; installments: PledgeInstallment[] }
  >
  donations: Donation[]
}

const emptySavedPledges = (): SavedPledges => ({ created: [], changed: {}, donations: [] })

function readSavedPledges() {
  return readLocal<SavedPledges>(LOCAL_KEYS.pledges, emptySavedPledges())
}

function persistPledges(mutate: (s: SavedPledges) => void) {
  const saved = readSavedPledges()
  mutate(saved)
  writeLocal(LOCAL_KEYS.pledges, saved)
}

function hydratePledges() {
  const saved = readSavedPledges()

  for (const p of saved.created) if (!PLEDGES.some((x) => x.id === p.id)) PLEDGES.unshift(p)

  for (const [id, change] of Object.entries(saved.changed)) {
    const p = PLEDGES.find((x) => x.id === id)
    if (!p) continue
    p.status = change.status
    p.cancelledAt = change.cancelledAt
    p.installments = change.installments
  }

  for (const d of saved.donations) if (!DONATIONS.some((x) => x.id === d.id)) DONATIONS.unshift(d)

  PLEDGES.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  DONATIONS.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
hydratePledges()

/** Writes whichever half of the store this pledge belongs in. */
function savePledge(p: Pledge) {
  persistPledges((s) => {
    const i = s.created.findIndex((x) => x.id === p.id)
    if (i >= 0) s.created[i] = clone(p)
    else
      s.changed[p.id] = {
        status: p.status,
        cancelledAt: p.cancelledAt,
        installments: clone(p.installments),
      }
  })
}

export async function listPledges(userId?: UUID): Promise<Pledge[]> {
  await simulateLatency()
  return PLEDGES.filter((p) => (userId ? p.userId === userId : true))
}

export async function getPledge(id: UUID): Promise<Pledge | null> {
  await simulateLatency()
  return PLEDGES.find((p) => p.id === id) ?? null
}

/**
 * Every pledge belonging to whoever is asking — by account where there is one, and by
 * contact details either way, exactly as `listDonationsFor` does. A guest who promised
 * a gift before creating an account finds the promise waiting once they do.
 */
export async function listPledgesFor(identity: DonorIdentity): Promise<Pledge[]> {
  await simulateLatency()
  return PLEDGES.filter(
    (p) =>
      (identity.userId !== null && p.userId === identity.userId) ||
      contactMatches(p.donor, identity.contact),
  ).sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/**
 * Records a promise. Nothing is charged, and no receipt is issued — that is the whole
 * distinction between this and `createDonation`, and it is why the two are separate
 * calls rather than one call with a flag.
 */
export async function createPledge(
  input: Omit<Pledge, 'id' | 'createdAt' | 'installments' | 'status'> & { count: number },
): Promise<Pledge> {
  await simulateLatency()
  const { count, ...rest } = input
  const id = `pld_${String(PLEDGES.length + 1).padStart(4, '0')}`

  const pledge: Pledge = {
    ...rest,
    id,
    installments: buildSchedule(id, {
      startDate: rest.startDate,
      amount: rest.amount,
      cadence: rest.cadence,
      count,
    }),
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  }

  PLEDGES.unshift(pledge)
  persistPledges((s) => s.created.unshift(clone(pledge)))
  return pledge
}

/**
 * The one place a promise turns into money.
 *
 * Settling mints a real `Donation` — which is what earns the tax receipt, what moves
 * the YTD figure and what appears in the ledger — and points it back at the instalment
 * through `pledgeId`. The pledge's own status is then re-derived rather than set by
 * hand, so the badge can never disagree with the rows underneath it.
 */
export async function settlePledgeInstallment(
  pledgeId: UUID,
  installmentId: UUID,
  input?: { method?: Donation['paymentMethod'] },
): Promise<{ pledge: Pledge; donation: Donation } | null> {
  const pledge = PLEDGES.find((p) => p.id === pledgeId)
  const installment = pledge?.installments.find((i) => i.id === installmentId)
  if (!pledge || !installment || installment.status !== 'due') return null

  const donation = await createDonation({
    userId: pledge.userId,
    donor: pledge.donor,
    category: pledge.category,
    projectId: pledge.projectId,
    amount: installment.amount,
    isRecurring: false,
    paymentMethod: input?.method ?? pledge.intendedMethod,
    dedicatedTo: pledge.dedicatedTo,
    pledgeId: pledge.id,
  })

  installment.status = 'paid'
  installment.donationId = donation.id
  installment.paidAt = donation.createdAt
  pledge.status = derivePledgeStatus(pledge)

  savePledge(pledge)
  persistPledges((s) => s.donations.unshift(clone(donation)))

  return { pledge, donation }
}

/** Withdraws the rest of a promise. Instalments already paid stay paid — they are gifts. */
export async function cancelPledge(id: UUID): Promise<Pledge | null> {
  await simulateLatency()
  const pledge = PLEDGES.find((p) => p.id === id)
  if (!pledge || pledge.status === 'cancelled') return null
  pledge.status = 'cancelled'
  pledge.cancelledAt = new Date().toISOString()
  savePledge(pledge)
  return pledge
}

/* ------------------------------------------------------------------ kitchen */

/**
 * Orders placed and advanced in this browser.
 *
 * The seeded rail is rebuilt from the clock on every load, so it cannot carry a
 * ticket somebody actually placed. An order is the one record in this module a
 * devotee will come back for — they are standing in the cafeteria holding a token —
 * so created orders are stored whole, and the status changes a kitchen makes to a
 * seeded ticket are stored as a patch replayed over it.
 */
interface SavedOrders {
  created: KitchenOrder[]
  changed: Record<
    UUID,
    Pick<
      KitchenOrder,
      'status' | 'acceptedAt' | 'readyAt' | 'collectedAt' | 'cancelledAt' | 'cancelReason'
    >
  >
}

const emptySavedOrders = (): SavedOrders => ({ created: [], changed: {} })

function persistOrders(mutate: (s: SavedOrders) => void) {
  const saved = readLocal<SavedOrders>(LOCAL_KEYS.kitchen, emptySavedOrders())
  mutate(saved)
  writeLocal(LOCAL_KEYS.kitchen, saved)
}

function hydrateOrders() {
  const saved = readLocal<SavedOrders>(LOCAL_KEYS.kitchen, emptySavedOrders())

  for (const o of saved.created) {
    if (!KITCHEN_ORDERS.some((x) => x.id === o.id)) KITCHEN_ORDERS.push(o)
  }
  for (const [id, patch] of Object.entries(saved.changed)) {
    const o = KITCHEN_ORDERS.find((x) => x.id === id)
    if (o) Object.assign(o, patch)
  }
  KITCHEN_ORDERS.sort((a, b) => a.placedAt.localeCompare(b.placedAt))
}
hydrateOrders()

/** Writes whichever half of the store this ticket belongs in. */
function saveOrder(o: KitchenOrder) {
  persistOrders((s) => {
    const i = s.created.findIndex((x) => x.id === o.id)
    if (i >= 0) s.created[i] = clone(o)
    else
      s.changed[o.id] = {
        status: o.status,
        acceptedAt: o.acceptedAt,
        readyAt: o.readyAt,
        collectedAt: o.collectedAt,
        cancelledAt: o.cancelledAt,
        cancelReason: o.cancelReason,
      }
  })
}

export async function listMenu(): Promise<MenuItem[]> {
  await simulateLatency()
  return clone(MENU)
}

/**
 * What the kitchen will actually cook right now.
 *
 * Returns nothing at all when the kitchen is shut, rather than a greyed-out board:
 * the page above it says when the next service opens, which is the only useful thing
 * to say to somebody who cannot order.
 */
export async function listServableMenu(at: Date = new Date()): Promise<MenuItem[]> {
  await simulateLatency()
  const status = kitchenStatusAt(at)
  if (!status.current) return []
  return clone(MENU.filter((m) => isItemServed(m, status.current!.meal, at.getDay())))
}

export async function listOrders(filter?: {
  status?: OrderStatus
  /** Only what is still in front of the pass. */
  activeOnly?: boolean
}): Promise<KitchenOrder[]> {
  await simulateLatency()
  return clone(
    KITCHEN_ORDERS.filter((o) => (filter?.status ? o.status === filter.status : true))
      .filter((o) => (filter?.activeOnly ? isActive(o.status) : true))
      .sort((a, b) => a.placedAt.localeCompare(b.placedAt)),
  )
}

export async function getOrder(id: UUID): Promise<KitchenOrder | null> {
  await simulateLatency()
  return clone(KITCHEN_ORDERS.find((o) => o.id === id) ?? null)
}

/** One step of the rail: placed → preparing → ready → collected. */
export async function advanceOrder(
  id: UUID,
  to: OrderStatus,
  reason?: string,
): Promise<KitchenOrder | null> {
  await simulateLatency()
  const o = KITCHEN_ORDERS.find((x) => x.id === id)
  if (!o || o.status === to) return null

  const stamp = new Date().toISOString()
  o.status = to
  if (to === 'preparing') o.acceptedAt = stamp
  if (to === 'ready') {
    o.acceptedAt ??= stamp
    o.readyAt = stamp
  }
  if (to === 'collected') {
    o.acceptedAt ??= stamp
    o.readyAt ??= stamp
    o.collectedAt = stamp
  }
  if (to === 'cancelled') {
    o.cancelledAt = stamp
    o.cancelReason = reason?.trim() || undefined
  }

  saveOrder(o)
  return clone(o)
}

/**
 * Places an order with the kitchen.
 *
 * Refuses outside the service window rather than queuing it for later. A temple
 * kitchen is not a restaurant with a night shift: an order taken at ten at night is
 * an order nobody cooks, and a devotee who gets a token and arrives to a dark hatch
 * has been actively misled. The same rule gates the checkout button, but the button
 * is a courtesy and this is the guarantee — a page left open across the cut-off must
 * not be able to post one through.
 */
export async function placeOrder(input: {
  userId: UUID | null
  donor?: DonorContact
  contactName: string
  contactPhone: string
  lines: OrderLine[]
  donationAmount?: number
  paymentMethod: KitchenOrder['paymentMethod']
  note?: string
}): Promise<{ ok: true; order: KitchenOrder } | { ok: false; reason: string }> {
  await simulateLatency()

  const now = new Date()
  const status = kitchenStatusAt(now)
  if (!status.ordering || !status.current) {
    return {
      ok: false,
      reason:
        status.reason === 'last-orders-passed'
          ? 'Online orders for this service have closed. You can still order at the counter.'
          : 'The temple kitchen is not open for orders at the moment.',
    }
  }
  if (input.lines.length === 0) return { ok: false, reason: 'Your tray is empty.' }

  // Re-checked against the board rather than trusted from the page: a tab left open
  // across the end of a service would otherwise order breakfast at lunchtime.
  const unavailable = input.lines.find((l) => {
    const item = MENU.find((m) => m.id === l.itemId)
    return !item || !isItemServed(item, status.current!.meal, now.getDay())
  })
  if (unavailable) {
    return { ok: false, reason: `${unavailable.name} is not being cooked at this service.` }
  }

  // Hydration has already merged any orders this browser made back into the array,
  // so its length is the sequence. Adding a separate seed offset counted them twice
  // and jumped the counter — the token after A-08 was A-17.
  const n = KITCHEN_ORDERS.length + 1
  const subtotal = linesSubtotal(input.lines)
  const donationAmount = Math.max(0, input.donationAmount ?? 0)
  const queueAhead = KITCHEN_ORDERS.filter((o) => isActive(o.status)).length

  const order: KitchenOrder = {
    id: `ord_${String(n).padStart(4, '0')}`,
    token: tokenFor(n),
    userId: input.userId,
    donor: input.donor,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    meal: status.current.meal,
    lines: input.lines,
    subtotal,
    donationAmount,
    total: subtotal + donationAmount,
    status: 'placed',
    paymentMethod: input.paymentMethod,
    promisedMinutes: estimateMinutes(input.lines, MENU, queueAhead),
    note: input.note?.trim() || undefined,
    placedAt: new Date().toISOString(),
  }

  KITCHEN_ORDERS.push(order)
  persistOrders((s) => s.created.push(clone(order)))

  // A round-up at the counter is a gift to the annadanam fund and belongs in the
  // ledger as one — not buried inside a food sale the accounts desk cannot see.
  if (donationAmount > 0) {
    await createDonation({
      userId: input.userId,
      donor: input.donor,
      category: 'annadanam',
      amount: donationAmount,
      isRecurring: false,
      paymentMethod: input.paymentMethod === 'card' ? 'card' : 'cash',
      dedicatedTo: `Cafeteria round-up — order ${order.token}`,
    })
  }

  return { ok: true, order }
}

/** Every order belonging to whoever is asking — account or contact, as giving does. */
export async function listOrdersFor(identity: DonorIdentity): Promise<KitchenOrder[]> {
  await simulateLatency()
  return clone(
    KITCHEN_ORDERS.filter(
      (o) =>
        (identity.userId !== null && o.userId === identity.userId) ||
        contactMatches(o.donor, identity.contact),
    ).sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
  )
}

/** A devotee calling off their own order, before the kitchen has started it. */
export async function cancelMyOrder(id: UUID): Promise<KitchenOrder | null> {
  const o = KITCHEN_ORDERS.find((x) => x.id === id)
  // Once a pan is on the heat the food exists, and cancelling it wastes it.
  if (!o || o.status !== 'placed') return null
  return advanceOrder(id, 'cancelled', 'Cancelled by the devotee')
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

/* ------------------------------------------------------------------- school */

/**
 * Enrolments made in this browser, and the office decisions taken on them.
 *
 * Created rows are stored whole — a family that registered has no seeded original
 * to fall back on, and a lost registration is the one record they will ring about.
 * Status changes on seeded rows are stored as a patch replayed over the seed, the
 * shape `hydrateApprovals` uses. Seat counts are recomputed on load rather than
 * stored, so a class's `enrolled` figure and the rows behind it cannot drift.
 */
interface SavedEnrolments {
  created: ClassEnrolment[]
  changed: Record<
    UUID,
    Pick<ClassEnrolment, 'status' | 'paidAt' | 'withdrawnAt' | 'waitlistPosition'>
  >
}

const emptySavedEnrolments = (): SavedEnrolments => ({ created: [], changed: {} })

function persistEnrolments(mutate: (s: SavedEnrolments) => void) {
  const saved = readLocal<SavedEnrolments>(LOCAL_KEYS.school, emptySavedEnrolments())
  mutate(saved)
  writeLocal(LOCAL_KEYS.school, saved)
}

function hydrateEnrolments() {
  const saved = readLocal<SavedEnrolments>(LOCAL_KEYS.school, emptySavedEnrolments())

  for (const e of saved.created) {
    if (!CLASS_ENROLMENTS.some((x) => x.id === e.id)) {
      CLASS_ENROLMENTS.unshift(e)
      // A replayed enrolment takes its seat back, exactly as it did when made.
      if (holdsSeat(e.status)) {
        const cls = SCHOOL_CLASSES.find((c) => c.id === e.classId)
        if (cls) cls.enrolled += 1
      }
    }
  }

  for (const [id, patch] of Object.entries(saved.changed)) {
    const e = CLASS_ENROLMENTS.find((x) => x.id === id)
    if (!e) continue
    const heldBefore = holdsSeat(e.status)
    Object.assign(e, patch)
    const heldAfter = holdsSeat(e.status)
    if (heldBefore !== heldAfter) {
      const cls = SCHOOL_CLASSES.find((c) => c.id === e.classId)
      if (cls) cls.enrolled = Math.max(0, cls.enrolled + (heldAfter ? 1 : -1))
    }
  }

  CLASS_ENROLMENTS.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
hydrateEnrolments()

function saveEnrolment(e: ClassEnrolment) {
  persistEnrolments((s) => {
    const i = s.created.findIndex((x) => x.id === e.id)
    if (i >= 0) s.created[i] = clone(e)
    else
      s.changed[e.id] = {
        status: e.status,
        paidAt: e.paidAt,
        withdrawnAt: e.withdrawnAt,
        waitlistPosition: e.waitlistPosition,
      }
  })
}

export async function getSchoolTerm(): Promise<SchoolTerm> {
  await simulateLatency()
  return clone(SCHOOL_TERM)
}

export async function listClasses(category?: SchoolClass['category']): Promise<SchoolClass[]> {
  await simulateLatency()
  return clone(SCHOOL_CLASSES.filter((c) => (category ? c.category === category : true)))
}

export async function getClassBySlug(slug: string): Promise<SchoolClass | null> {
  await simulateLatency()
  return clone(SCHOOL_CLASSES.find((c) => c.slug === slug) ?? null)
}

export async function listEnrolments(filter?: {
  classId?: UUID
  status?: ClassEnrolment['status']
}): Promise<ClassEnrolment[]> {
  await simulateLatency()
  return clone(
    CLASS_ENROLMENTS.filter((e) => (filter?.classId ? e.classId === filter.classId : true))
      .filter((e) => (filter?.status ? e.status === filter.status : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
}

/**
 * Moves an enrolment to a new status, keeping the class's seat count honest.
 *
 * The seat count is adjusted here and nowhere else. A withdrawal frees a place, a
 * confirmed payment does not take a second one, and promoting someone off the
 * waiting list takes the place their withdrawal freed — all of which only works
 * because one function owns the arithmetic.
 */
export async function setEnrolmentStatus(
  id: UUID,
  status: ClassEnrolment['status'],
): Promise<ClassEnrolment | null> {
  await simulateLatency()
  const e = CLASS_ENROLMENTS.find((x) => x.id === id)
  if (!e || e.status === status) return null

  const heldBefore = holdsSeat(e.status)
  e.status = status
  const heldAfter = holdsSeat(status)

  const stamp = new Date().toISOString()
  if (status === 'enrolled') {
    e.paidAt ??= stamp
    e.waitlistPosition = undefined
  }
  if (status === 'withdrawn') e.withdrawnAt = stamp

  if (heldBefore !== heldAfter) {
    const cls = SCHOOL_CLASSES.find((c) => c.id === e.classId)
    if (cls) cls.enrolled = Math.max(0, cls.enrolled + (heldAfter ? 1 : -1))
  }

  saveEnrolment(e)
  return clone(e)
}

/**
 * Registers a student for a class.
 *
 * The three rules that decide this live in `@/lib/school` and are re-checked here
 * rather than trusted from the page: a form left open while a class filled up, or
 * while the registration window closed, must not be able to post a place through.
 *
 * A full class produces a place on the waiting list rather than a refusal, because
 * that is what the school would do at the desk.
 */
export async function enrolInClass(input: {
  classId: UUID
  userId: UUID | null
  donor?: DonorContact
  studentName: string
  studentAge: number
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  paymentMethod: ClassEnrolment['paymentMethod']
  notes?: string
}): Promise<{ ok: true; enrolment: ClassEnrolment } | { ok: false; reason: string }> {
  await simulateLatency()

  const cls = SCHOOL_CLASSES.find((c) => c.id === input.classId)
  if (!cls) return { ok: false, reason: 'That class is no longer listed.' }

  const verdict = enrolVerdict(cls, SCHOOL_TERM, input.studentAge)
  if (!verdict.canBook) return { ok: false, reason: verdict.reason }

  if (!input.studentName.trim()) return { ok: false, reason: 'Tell us the student’s name.' }
  if (input.guardianPhone.trim().length < 7) {
    return { ok: false, reason: 'We need a phone number for the parent or guardian.' }
  }

  const status = initialStatus(verdict.outcome, cls.fee, input.paymentMethod)
  const n = CLASS_ENROLMENTS.length + 1

  const enrolment: ClassEnrolment = {
    id: `enr_${String(n).padStart(4, '0')}`,
    termId: SCHOOL_TERM.id,
    classId: cls.id,
    userId: input.userId,
    donor: input.donor,
    studentName: input.studentName.trim(),
    studentAge: input.studentAge,
    guardianName: input.guardianName.trim(),
    guardianPhone: input.guardianPhone.trim(),
    guardianEmail: input.guardianEmail.trim(),
    status,
    fee: cls.fee,
    paymentMethod: input.paymentMethod,
    paidAt: status === 'enrolled' && cls.fee > 0 ? new Date().toISOString() : undefined,
    waitlistPosition:
      status === 'waitlisted'
        ? CLASS_ENROLMENTS.filter((e) => e.classId === cls.id && e.status === 'waitlisted').length + 1
        : undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }

  CLASS_ENROLMENTS.unshift(enrolment)
  if (holdsSeat(status)) cls.enrolled += 1

  persistEnrolments((s) => s.created.unshift(clone(enrolment)))
  return { ok: true, enrolment }
}

/** Every enrolment belonging to whoever is asking — account or contact, as giving does. */
export async function listEnrolmentsFor(identity: DonorIdentity): Promise<ClassEnrolment[]> {
  await simulateLatency()
  return clone(
    CLASS_ENROLMENTS.filter(
      (e) =>
        (identity.userId !== null && e.userId === identity.userId) ||
        contactMatches(e.donor, identity.contact),
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
}

/** A family withdrawing their own student. Frees the seat for the waiting list. */
export async function withdrawEnrolment(id: UUID): Promise<ClassEnrolment | null> {
  const e = CLASS_ENROLMENTS.find((x) => x.id === id)
  if (!e || e.status === 'withdrawn' || e.status === 'completed') return null
  return setEnrolmentStatus(id, 'withdrawn')
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

/**
 * The hall register.
 *
 * Created rows are stored whole and office decisions as a patch, the same shape
 * `hydrateEnrolments` uses — a request the devotee made has no seeded original to
 * replay over, while a seeded booking the office confirmed only needs its changed
 * fields kept.
 */
interface SavedFacility {
  created: FacilityBooking[]
  changed: Record<
    UUID,
    Partial<
      Pick<
        FacilityBooking,
        'status' | 'officeNote' | 'declineReason' | 'depositPaidAt' | 'decidedAt'
      >
    >
  >
}

const emptySavedFacility = (): SavedFacility => ({ created: [], changed: {} })

function persistFacility(mutate: (s: SavedFacility) => void) {
  const saved = readLocal<SavedFacility>(LOCAL_KEYS.facility, emptySavedFacility())
  mutate(saved)
  writeLocal(LOCAL_KEYS.facility, saved)
}

function hydrateFacility() {
  const saved = readLocal<SavedFacility>(LOCAL_KEYS.facility, emptySavedFacility())

  for (const b of saved.created) {
    if (!FACILITY_BOOKINGS.some((x) => x.id === b.id)) FACILITY_BOOKINGS.push(b)
  }
  for (const [bid, patch] of Object.entries(saved.changed)) {
    const b = FACILITY_BOOKINGS.find((x) => x.id === bid)
    if (b) Object.assign(b, patch)
  }

  FACILITY_BOOKINGS.sort((a, b) => a.date.localeCompare(b.date))
}
hydrateFacility()

function saveFacilityBooking(b: FacilityBooking) {
  persistFacility((s) => {
    const i = s.created.findIndex((x) => x.id === b.id)
    if (i >= 0) s.created[i] = clone(b)
    else
      s.changed[b.id] = {
        status: b.status,
        officeNote: b.officeNote,
        declineReason: b.declineReason,
        depositPaidAt: b.depositPaidAt,
        decidedAt: b.decidedAt,
      }
  })
}

export async function listVenues(includeInactive = false): Promise<FacilityVenue[]> {
  await simulateLatency()
  return clone(FACILITY_VENUES.filter((v) => includeInactive || v.active))
}

export async function getVenueBySlug(slug: string): Promise<FacilityVenue | null> {
  await simulateLatency()
  return clone(FACILITY_VENUES.find((v) => v.slug === slug) ?? null)
}

export async function listFacilityBookings(filter?: {
  venueId?: UUID
  status?: FacilityBookingStatus
  userId?: UUID
}): Promise<FacilityBooking[]> {
  await simulateLatency()
  return clone(
    FACILITY_BOOKINGS.filter((b) => (filter?.venueId ? b.venueId === filter.venueId : true))
      .filter((b) => (filter?.status ? b.status === filter.status : true))
      .filter((b) => (filter?.userId ? b.userId === filter.userId : true))
      .sort((a, b) => a.date.localeCompare(b.date)),
  )
}

/** A devotee's own requests, newest event first — the order they ask about them in. */
export async function getMyFacilityBookings(userId: UUID): Promise<FacilityBooking[]> {
  await simulateLatency()
  return clone(
    FACILITY_BOOKINGS.filter((b) => b.userId === userId).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  )
}

export class FacilityUnavailableError extends Error {
  readonly reason: string
  constructor(reason: string) {
    super(reason)
    this.name = 'FacilityUnavailableError'
    this.reason = reason
  }
}

/**
 * Takes a slot, or refuses.
 *
 * The availability check is re-run here against the live register rather than
 * trusting what the form was showing. A devotee can sit on the booking page for ten
 * minutes while somebody else takes the date, and the client-side calendar that said
 * "free" when it rendered is exactly the stale fact this guard exists to catch.
 */
export async function createFacilityBooking(input: {
  userId: UUID
  venueId: UUID
  date: ISODate
  slot: FacilitySlotKey
  eventType: FacilityBooking['eventType']
  expectedGuests: number
  items: FacilityBooking['items']
  discountPct: number
  contactPhone: string
  notes?: string
}): Promise<FacilityBooking> {
  await simulateLatency()

  const venue = FACILITY_VENUES.find((v) => v.id === input.venueId)
  if (!venue) throw new FacilityUnavailableError('That venue no longer exists.')

  const state = slotAvailability({
    venue,
    day: input.date,
    slot: input.slot,
    bookings: FACILITY_BOOKINGS,
    now: new Date(),
  })
  if (state.state === 'taken') {
    throw new FacilityUnavailableError(
      `${venue.name} was taken for that slot while you were booking.`,
    )
  }
  if (state.state === 'closed') throw new FacilityUnavailableError(state.reason)

  const price = priceBooking({
    venue,
    slot: input.slot,
    items: input.items,
    discountPct: input.discountPct,
  })

  const seq = FACILITY_BOOKINGS.length + 1
  const booking: FacilityBooking = {
    id: `fac_${String(seq).padStart(4, '0')}_${Date.now().toString(36)}`,
    reference: `HALL-${2600 + seq}`,
    userId: input.userId,
    venueId: input.venueId,
    date: input.date,
    slot: input.slot,
    eventType: input.eventType,
    expectedGuests: input.expectedGuests,
    items: input.items,
    hireCharge: price.hireCharge,
    addOnsTotal: price.addOnsTotal,
    discountPct: price.discountPct,
    total: price.total,
    deposit: price.deposit,
    status: 'pending',
    contactPhone: input.contactPhone,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  }

  FACILITY_BOOKINGS.push(booking)
  FACILITY_BOOKINGS.sort((a, b) => a.date.localeCompare(b.date))
  persistFacility((s) => s.created.push(clone(booking)))
  return clone(booking)
}

/**
 * Moves a booking to a new status.
 *
 * Confirming re-checks the slot against every *other* holder, because a date can
 * collect two pending requests and the office must not be able to confirm both.
 */
export async function setFacilityBookingStatus(
  id: UUID,
  status: FacilityBookingStatus,
  opts?: { declineReason?: string; officeNote?: string },
): Promise<FacilityBooking> {
  await simulateLatency()
  const booking = FACILITY_BOOKINGS.find((x) => x.id === id)
  if (!booking) throw new Error(`No facility booking ${id}`)

  if (status === 'confirmed') {
    const venue = FACILITY_VENUES.find((v) => v.id === booking.venueId)
    if (venue) {
      const state = slotAvailability({
        venue,
        day: booking.date,
        slot: booking.slot,
        bookings: FACILITY_BOOKINGS,
        now: new Date(),
        ignoreBookingId: booking.id,
      })
      if (state.state === 'taken') {
        throw new FacilityUnavailableError(
          `${venue.name} is already confirmed for that slot (${state.by.reference}).`,
        )
      }
    }
  }

  booking.status = status
  booking.decidedAt = new Date().toISOString()
  if (opts?.declineReason !== undefined) booking.declineReason = opts.declineReason
  if (opts?.officeNote !== undefined) booking.officeNote = opts.officeNote
  saveFacilityBooking(booking)
  return clone(booking)
}

/** Records the refundable deposit as received. */
export async function recordFacilityDeposit(id: UUID): Promise<FacilityBooking> {
  await simulateLatency()
  const booking = FACILITY_BOOKINGS.find((x) => x.id === id)
  if (!booking) throw new Error(`No facility booking ${id}`)
  booking.depositPaidAt = new Date().toISOString()
  saveFacilityBooking(booking)
  return clone(booking)
}

/* ----------------------------------------------------------------- projects */

export async function listProjects(status?: Project['status']): Promise<Project[]> {
  await simulateLatency()
  return clone(PROJECTS.filter((p) => (status ? p.status === status : true)))
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  await simulateLatency()
  return clone(PROJECTS.find((p) => p.slug === slug) ?? null)
}

export async function getProjectById(id: UUID): Promise<Project | null> {
  await simulateLatency()
  return clone(PROJECTS.find((p) => p.id === id) ?? null)
}

/**
 * Gifts earmarked for one project, newest first.
 *
 * Presented as *recent contributions* and never as the project's total, because it is
 * not one: `raisedAmount` is the audited figure the construction budget head carries,
 * and it includes years of giving that predate this ledger. A list captioned as a
 * total that quietly was not one would be the single most misleading thing on an
 * otherwise honest page.
 */
export async function listProjectDonations(projectId: UUID, limit = 25): Promise<Donation[]> {
  await simulateLatency()
  return DONATIONS.filter((d) => d.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

/* ------------------------------------------------------------- transparency */

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
