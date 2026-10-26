/**
 * Browser-side persistence for the few records a devotee edits about themselves.
 *
 * The mock arrays live in memory and reset on reload. That is fine for seeded data
 * nobody touches, but a family tree the devotee typed in is their own work, and
 * losing it on refresh reads as a bug rather than as a demo limitation. The user
 * object already survives — the auth store is wrapped in zustand's `persist` — so
 * this file covers what that store does not.
 *
 * Every access is wrapped: a private window, cleared site data, a storage quota
 * error or a browser configured to block site data must degrade to the seeded
 * value, never throw into a render.
 */

const NS = 'meenakshi-devotee'

export const LOCAL_KEYS = {
  familyTrees: `${NS}:family-trees`,
  emailPrefs: `${NS}:email-prefs`,
  /**
   * Gifts made by a visitor with no account. A signed-in devotee's donations are
   * seeded and belong to the temple's records, but a guest gift exists only because
   * this browser made it — and the whole point of taking their email and phone is to
   * hand it back to them on a later visit. It has to outlive the tab.
   */
  guestDonations: `${NS}:guest-donations`,
  /**
   * Pledges, and the instalments settled against them.
   *
   * A pledge outlives the session by definition — its whole point is a date months
   * from now — so an in-memory-only promise would be a promise the app forgets before
   * it falls due. Seeded pledges store only their changeable parts, replayed over the
   * seed; a pledge the devotee created is stored whole, since it has no seeded
   * original to fall back to. Same split as `hydrateApprovals` in the admin console.
   */
  pledges: `${NS}:pledges`,
  /**
   * Cafeteria orders this browser placed, and their progress.
   *
   * The seeded rail is rebuilt from the clock on each load, so it cannot hold a real
   * order. A devotee standing at the counter with a token is the last person who
   * should lose their record to a page refresh.
   */
  kitchen: `${NS}:kitchen`,
  /**
   * Class enrolments made here, and the office decisions taken on them.
   *
   * A family that registered for the school year will come back for this record;
   * the seeded register cannot hold it, so created rows are stored whole.
   */
  school: `${NS}:school`,
} as const

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    // Unreadable or malformed — the seed is a better answer than a crash.
    return fallback
  }
}

export function writeLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Quota exceeded or storage denied. The in-memory copy still holds for this
    // session, so the save is not lost until the tab closes.
    return false
  }
}

export function clearLocal(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* nothing to do — the key is already unreachable */
  }
}
