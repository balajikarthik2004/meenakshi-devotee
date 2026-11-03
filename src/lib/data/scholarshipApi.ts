/**
 * Community scholarships.
 *
 * The temple makes two kinds of award and only one of them is served here. The three
 * school awards — Pearland High, Glenda Dawson, Robert Turner — are chosen by those
 * schools' own counsellors through the Pearland ISD scholarship packet, and nothing in
 * this file touches them.
 *
 * Shaped like `api.ts`, byte-identical in the admin console.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4002/api'

export class ScholarshipApiError extends Error {
  status: number
  code?: string
  issues?: { path: string; message: string }[]

  constructor(
    message: string,
    status: number,
    code?: string,
    issues?: { path: string; message: string }[],
  ) {
    super(message)
    this.name = 'ScholarshipApiError'
    this.status = status
    this.code = code
    this.issues = issues
  }
}

export const isOffline = (e: unknown) => e instanceof ScholarshipApiError && e.status === 0

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
  } catch {
    throw new ScholarshipApiError('The scholarship service is not responding.', 0, 'offline')
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
      /* a non-JSON body says no more than the status already did */
    }
    throw new ScholarshipApiError(message, res.status, code, issues)
  }

  return (await res.json()) as T
}

/* ------------------------------------------------------------------- types */

export interface ScholarshipProgramme {
  id: string
  year: number
  name: string
  description: string
  opensAt: string
  closesAt: string
  expectedAwards: number
  defaultAward?: number
  minGpa: number
  gpaScale: number
  weights: { gpa: number; rank: number; tests: number; service: number }
  serviceHoursForFull: number
  requireMemberReference: boolean
  /** True until the temple office confirms these against current policy. */
  provisional: boolean
  window: { open: boolean; reason: 'open' | 'not-yet' | 'closed'; daysLeft: number }
}

export interface ScholarshipFactor {
  key: 'gpa' | 'rank' | 'tests' | 'service'
  label: string
  score: number
  weight: number
  detail: string
  /** The student gave nothing to score. Excluded, not counted as nought. */
  missing: boolean
}

export interface ScholarshipScore {
  total: number
  factors: ScholarshipFactor[]
  missing: string[]
  meetsMinimum: boolean
  minimumNote?: string
}

export type ScholarshipStatus = 'submitted' | 'under-review' | 'awarded' | 'declined'

export interface ScoredApplication {
  id: string
  reference: string
  programmeId: string
  year: number
  studentName: string
  studentEmail: string
  studentPhone?: string
  dob?: string
  school: string
  graduationYear: number
  gpa: number
  classRank?: number
  classSize?: number
  satTotal?: number
  actComposite?: number
  college?: string
  intendedMajor?: string
  serviceHours: number
  serviceSummary: string
  templeInvolvement?: string
  statement: string
  memberReference?: {
    memberNumber: string
    name?: string
    verified: boolean
    note?: string
  }
  signature: string
  status: ScholarshipStatus
  submittedAt: string
  reviewedAt?: string
  reviewedByName?: string
  decisionReason?: string
  awardAmount?: number
  committeeNotes?: string
  history: { at: string; actorName: string; action: string; note?: string }[]
  score: ScholarshipScore
}

export interface ScholarshipSubmitResult {
  application: ScoredApplication
  notified: {
    student: boolean
    office: boolean
    officeAddress: string
    studentPreview?: string
    officePreview?: string
  }
}

export interface ScholarshipStats {
  year: number | null
  expectedAwards: number
  closesAt: string | null
  daysLeft: number
  open: boolean
  applications: number
  submitted: number
  underReview: number
  awarded: number
  declined: number
  totalAwarded: number
}

/* -------------------------------------------------------------------- calls */

export const getProgramme = () => request<ScholarshipProgramme>('/scholarship/programme')

export const submitScholarship = (input: {
  studentName: string
  studentEmail: string
  studentPhone?: string
  dob?: string
  school: string
  graduationYear: number
  gpa: number
  classRank?: number
  classSize?: number
  satTotal?: number
  actComposite?: number
  college?: string
  intendedMajor?: string
  serviceHours: number
  serviceSummary: string
  templeInvolvement?: string
  statement: string
  memberNumber?: string
  signature: string
}) =>
  request<ScholarshipSubmitResult>('/scholarship/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  })

export const listScholarshipApplications = (query?: { status?: string; email?: string }) => {
  const p = new URLSearchParams()
  if (query?.status && query.status !== 'all') p.set('status', query.status)
  if (query?.email) p.set('email', query.email)
  const qs = p.toString()
  return request<ScoredApplication[]>(`/scholarship/applications${qs ? `?${qs}` : ''}`)
}

export const getScholarshipApplication = (id: string) =>
  request<ScoredApplication>(`/scholarship/applications/${id}`)

export const pickUpScholarship = (id: string, actorName: string) =>
  request<ScoredApplication>(`/scholarship/applications/${id}/pick-up`, {
    method: 'POST',
    body: JSON.stringify({ actorName }),
  })

export const noteScholarship = (id: string, actorName: string, note: string) =>
  request<ScoredApplication>(`/scholarship/applications/${id}/note`, {
    method: 'POST',
    body: JSON.stringify({ actorName, note }),
  })

export const awardScholarship = (
  id: string,
  actorName: string,
  amount: number,
  note?: string,
) =>
  request<{ application: ScoredApplication; notified: boolean; previewUrl?: string }>(
    `/scholarship/applications/${id}/award`,
    { method: 'POST', body: JSON.stringify({ actorName, amount, note }) },
  )

export const declineScholarship = (id: string, actorName: string, reason: string) =>
  request<{ application: ScoredApplication; notified: boolean; previewUrl?: string }>(
    `/scholarship/applications/${id}/decline`,
    { method: 'POST', body: JSON.stringify({ actorName, reason }) },
  )

export const getScholarshipStats = () => request<ScholarshipStats>('/scholarship/stats')
