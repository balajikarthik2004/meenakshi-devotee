/**
 * Membership applications — the one part of this app that talks to a real backend.
 *
 * Everything else in `api.ts` reads in-memory mocks. This cannot: a membership number
 * is minted on approval and a reference is resolved against the member roll, and
 * neither belongs anywhere the applicant can edit.
 *
 * Shaped like `api.ts` on purpose — exported async functions, plain data, no fetch
 * details leaking upward — so a page cannot tell which kind of call it is making.
 * Kept byte-identical in the admin console.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4002/api'

export class MembershipApiError extends Error {
  status: number
  code?: string
  /** Field-level problems from the server's schema check, when it sent any. */
  issues?: { path: string; message: string }[]

  constructor(
    message: string,
    status: number,
    code?: string,
    issues?: { path: string; message: string }[],
  ) {
    super(message)
    this.name = 'MembershipApiError'
    this.status = status
    this.code = code
    this.issues = issues
  }
}

export const isOffline = (e: unknown) => e instanceof MembershipApiError && e.status === 0

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
  } catch {
    throw new MembershipApiError('The membership service is not responding.', 0, 'offline')
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let code: string | undefined
    let issues: { path: string; message: string }[] | undefined
    try {
      const body = (await res.json()) as {
        error?: string
        code?: string
        issues?: { path: string; message: string }[]
      }
      message = body.error ?? message
      code = body.code
      issues = body.issues
    } catch {
      /* a non-JSON error body says no more than the status already did */
    }
    throw new MembershipApiError(message, res.status, code, issues)
  }

  return (await res.json()) as T
}

/* ------------------------------------------------------------------- types */

export interface MembershipPolicy {
  id: string
  category: string
  label: string
  description: string
  requiredSponsors: number
  annualSponsorLimit: number
  minAge: number
  maxAge?: number
  sponsorMustBeActive: boolean
  /** True until the temple office confirms these against current policy. */
  provisional: boolean
}

export interface Nominee {
  name: string
  relationship: string
  dob?: string
  phone?: string
  email?: string
}

export interface MemberReference {
  memberNumber: string
  name?: string
  /** Whether the number resolved to a member in good standing *at submission*. */
  verified: boolean
  note?: string
}

export type ApplicationStatus = 'submitted' | 'under-review' | 'approved' | 'rejected'

export interface MembershipApplication {
  id: string
  reference: string
  category: string
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  dob?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postcode?: string
  gothram?: string
  nakshatram?: string
  nominees: Nominee[]
  references: MemberReference[]
  note?: string
  signature: string
  status: ApplicationStatus
  submittedAt: string
  reviewedAt?: string
  reviewedByName?: string
  decisionReason?: string
  /** Set only on approval — the membership this application produced. */
  memberNumber?: string
  history: { at: string; actorName: string; action: string; note?: string }[]
}

/** The answer the member-number box prints as it is typed. */
export interface ReferenceCheck {
  ok: boolean
  memberNumber: string
  name?: string
  memberSince?: string
  reason?: 'unknown-member' | 'not-active' | 'duplicate' | 'self'
  message?: string
}

export interface SubmitResult {
  application: MembershipApplication
  notified: {
    applicant: boolean
    office: boolean
    officeAddress: string
    /** Ethereal only, when no real SMTP is configured. */
    applicantPreview?: string
    officePreview?: string
  }
}

export interface MembershipStats {
  members: number
  activeMembers: number
  lapsedMembers: number
  applications: number
  submitted: number
  underReview: number
  approved: number
  rejected: number
}

/* -------------------------------------------------------------------- calls */

export const listPolicies = () => request<MembershipPolicy[]>('/membership/policies')

export const checkReference = (input: {
  memberNumber: string
  category: string
  applicantEmail?: string
  existing?: string[]
}) =>
  request<ReferenceCheck>('/membership/references/check', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const submitApplication = (input: {
  category: string
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  dob?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postcode?: string
  gothram?: string
  nakshatram?: string
  nominees?: Nominee[]
  memberNumbers?: string[]
  note?: string
  signature: string
}) =>
  request<SubmitResult>('/membership/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const listApplications = (query?: { status?: string; email?: string }) => {
  const p = new URLSearchParams()
  if (query?.status && query.status !== 'all') p.set('status', query.status)
  if (query?.email) p.set('email', query.email)
  const qs = p.toString()
  return request<MembershipApplication[]>(`/membership/applications${qs ? `?${qs}` : ''}`)
}

export const getApplication = (id: string) =>
  request<MembershipApplication>(`/membership/applications/${id}`)

export const pickUpApplication = (id: string, actorName: string) =>
  request<MembershipApplication>(`/membership/applications/${id}/pick-up`, {
    method: 'POST',
    body: JSON.stringify({ actorName }),
  })

export const approveApplication = (id: string, actorName: string, note?: string) =>
  request<{
    application: MembershipApplication
    member: { memberNumber: string; name: string }
    notified: boolean
    previewUrl?: string
  }>(`/membership/applications/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ actorName, note }),
  })

export const rejectApplication = (id: string, actorName: string, reason: string) =>
  request<{ application: MembershipApplication; notified: boolean; previewUrl?: string }>(
    `/membership/applications/${id}/reject`,
    { method: 'POST', body: JSON.stringify({ actorName, reason }) },
  )

export const getMembershipStats = () => request<MembershipStats>('/membership/stats')
