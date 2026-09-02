/**
 * One notion of "who is giving", whether or not they have an account.
 *
 * The giving screens used to read `useAuthStore(s => s.user)!` and were therefore only
 * reachable behind `RequireAuth`. A visitor who clicks Donate on the public site has no
 * user object, but they do have a name, an email and a phone — enough to take a gift,
 * issue a receipt and recognise them next time. `DonorIdentity` is the shape both
 * cases collapse to, so `/donate` and `/my/donations` no longer care which one they got.
 */
import type { DonorContact, User, UUID } from '@/lib/data/types'
import { useAuthStore } from '@/lib/store/auth'
import { useGuestDonorStore } from '@/lib/store/guest'
import { initialsOf } from '@/lib/utils'

export interface DonorIdentity {
  /** Set only for a signed-in devotee; null for a guest. */
  userId: UUID | null
  /** The contact details, however they were obtained. */
  contact: DonorContact
  /** `"Firstname Lastname"`, ready for a receipt or a greeting. */
  name: string
  initials: string
  /** One line of address, or undefined — a guest is never asked for one. */
  address?: string
  isGuest: boolean
}

/* ------------------------------------------------------------- normalisation */

/** Case- and whitespace-insensitive email key. */
export const normEmail = (email: string) => email.trim().toLowerCase()

/**
 * Phone reduced to its last ten digits.
 *
 * A devotee types `(281) 555-0148` at the gate and `+1 281 555 0148` six months later.
 * Both have to resolve to the same donor, so formatting, spaces and the country code
 * are all discarded before comparison.
 */
export const normPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

/** A phone shorter than this cannot identify anybody, so it never matches. */
const MIN_PHONE_DIGITS = 10

/**
 * Whether two sets of contact details describe the same person.
 *
 * Either identifier is sufficient — a devotee who changed email keeps their phone, and
 * one who changed phone keeps their email. Blank fields never match blank fields.
 */
export function contactMatches(
  a: { email?: string; phone?: string } | null | undefined,
  b: { email?: string; phone?: string } | null | undefined,
): boolean {
  if (!a || !b) return false

  const aEmail = normEmail(a.email ?? '')
  const bEmail = normEmail(b.email ?? '')
  if (aEmail && aEmail === bEmail) return true

  const aPhone = normPhone(a.phone ?? '')
  const bPhone = normPhone(b.phone ?? '')
  return aPhone.length >= MIN_PHONE_DIGITS && aPhone === bPhone
}

/* -------------------------------------------------------------- conversions */

export const donorFullName = (c: DonorContact) => `${c.firstName} ${c.lastName}`.trim()

/**
 * Splits a seeded `User.name` into the two fields the gate collects. Everything after
 * the first space is the surname, so "Santhosh Kumar Iyer" keeps "Kumar Iyer" together
 * rather than silently dropping a name.
 */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

export function contactFromUser(user: User): DonorContact {
  return { ...splitName(user.name), email: user.email, phone: user.phone }
}

export function identityFromUser(user: User): DonorIdentity {
  return {
    userId: user.id,
    contact: contactFromUser(user),
    name: user.name,
    initials: user.avatarInitials,
    address: user.address
      ? `${user.address}, ${user.city}, ${user.state} ${user.zip}`
      : undefined,
    isGuest: false,
  }
}

export function identityFromContact(contact: DonorContact): DonorIdentity {
  const name = donorFullName(contact)
  return { userId: null, contact, name, initials: initialsOf(name), isGuest: true }
}

/**
 * A sign-up link carrying the details the gate already collected.
 *
 * The whole argument for creating an account is that it costs nothing on top of what
 * they have already typed, so `SignUp` reads these back out of the query string.
 */
export function signUpHrefFor(contact: DonorContact) {
  const params = new URLSearchParams({
    first: contact.firstName,
    last: contact.lastName,
    email: contact.email,
    phone: contact.phone,
  })
  return `/signup?${params.toString()}`
}

/* --------------------------------------------------------------------- hook */

/**
 * The signed-in devotee if there is one, else the guest who has already given their
 * details, else null — which is the cue for the gate to ask for them.
 *
 * An account always wins over a stored guest contact: someone who signs in mid-visit
 * should have the gift land on their real record, not on a shadow copy of it.
 */
export function useDonorIdentity(): DonorIdentity | null {
  const user = useAuthStore((s) => s.user)
  const guest = useGuestDonorStore((s) => s.contact)
  if (user) return identityFromUser(user)
  if (guest) return identityFromContact(guest)
  return null
}
