# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Public/devotee-facing app for Sri Meenakshi Temple Society, Pearland TX — a companion
to `../meenakshi-admin` (the operations console), sharing the same seed data and
design tokens. Stack: Vite · React 19 · TypeScript · Tailwind v4 · hand-rolled
shadcn-style `components/ui` · react-router-dom v7 · zustand.

## Commands

```bash
npm install && npm run dev   # local dev server
npm run build                # tsc -b && vite build
npm run preview              # preview a production build
npm run lint                 # oxlint
npm run format                # prettier --write .
```

There is no test suite/command in this repo.

Path alias: `@/*` → `./src/*` (set in both `vite.config.ts` and `tsconfig.app.json`).

## Data layer — the one seam that matters

Everything reads and writes in-memory mock data. `src/lib/data/api.ts` is the single
seam between the UI and the data — every screen calls an async function from there,
never the mock arrays directly. Swapping each function body for a real `fetch` call
moves the app to a real backend without touching a single page. Mock seed data lives
in `src/lib/data/mock/` (identical seed to `meenakshi-admin`) and is generated
deterministically from a seeded PRNG, so a rebuild always produces identical data —
sponsorships plus donations reconcile to exactly $723,000, the figure the public
transparency strip publishes. Shapes are in `src/lib/data/types.ts`.

## Identity: signed-in devotee vs. guest donor

Giving does not require an account. `src/lib/donor.ts` defines `DonorIdentity`, the
one shape both a signed-in `User` and an anonymous giver collapse to, via
`useDonorIdentity()`: signed-in user wins if present, else a guest contact persisted
in `src/lib/store/guest.ts` (`useGuestDonorStore`, separate from `useAuthStore` and
deliberately *not* a session — it grants access to nothing beyond this browser's own
giving history), else `null` (the gate's cue to ask). `contactMatches` in the same
file is how a guest's past gifts get reattached to an account they later create —
matching is by normalised email OR normalised last-10-digits phone, either sufficient.
Read this file before touching `/donate`, sign-up, or anything under `/my/*`.

Mock auth itself lives in `src/lib/store/auth.ts` — any email or phone signs you in as
the first seeded devotee unless it matches another one; there is no credential check.

## Pledges: a promise is not a donation

`Pledge` in `types.ts` is deliberately its own record rather than a flag on `Donation`,
on the same "intent vs. what actually happened" principle `meenakshi-admin` applies to
`ApprovalStage` vs `Booking.status`. A pledge is not income: it is absent from the YTD
total the transparency strip publishes, it does not move a festival's `collectedAmount`,
and it carries no `taxReceiptId` — under 501(c)(3) rules a promise is deductible only
once it is paid. The seed enforces this too; `mock/pledges.ts` is forward-only, so the
$723,000 reconciliation is untouched by it.

Money crosses from one to the other at exactly one point: `settlePledgeInstallment` in
`api.ts`, which mints a real `Donation` carrying `pledgeId` back to the instalment it
settled. Nothing else should ever add a pledge figure to a donation figure. All the
arithmetic — outstanding, overdue, next due, status — lives in `src/lib/pledge.ts` and
is derived nowhere else; the file is kept byte-identical in `meenakshi-admin`, because
the devotee reading "$400 outstanding" and the office reading "$500" is the one failure
this feature cannot afford. `derivePledgeStatus` is called after every change rather
than statuses being set by hand.

The event fund takes no pledges, for the same reason it takes no recurring gifts: a
festival is one fixed date.

## Routing

Routes are lazily loaded in `src/App.tsx` so first paint ships only the homepage.
Layout/guard components live in `src/components/layout/layouts.tsx`:
- `PublicLayout` — no auth needed (home, calendar, events, about, `/dev` gallery).
- `MinimalLayout` — sign-in/sign-up.
- `DonorLayout` + `RequireDonor` — `/donate` is open to a guest *or* a signed-in
  devotee; `RequireDonor` accepts either, but routes nested under it that need a
  concrete identity (e.g. `/my/donations`) still require one or the other to exist.
- `AppLayout` + `RequireAuth` — the signed-in devotee app (dashboard, my pujas, my
  donations, my receipts, profile, facility booking).

## Capital projects

`PROJECTS` in `mock/projects.ts` is four projects, and two of its totals are
load-bearing: the raised and spent figures must sum to `PROJECTS_RAISED` /
`PROJECTS_SPENT`, which `misc.ts` imports as the construction head of `TRANSPARENCY`.
The transparency page reports the same money twice, and `TargetBreakdown` shows a
variance row the moment the two disagree — so adding or editing a project means
rebalancing its siblings. The file asserts all of this at import time, loudly.

Each project's `spentAmount` equals the sum of its own `expenses`, which is what lets
`/projects/:slug` print where the money actually went rather than only how much. Two
percentages live on a project and are deliberately different numbers: `progressPct` is
work completed, funding is derived from raised against target. Both are drawn, never
averaged — see `ProjectMoneyFlow`, shared with `meenakshi-admin`.

A gift names its project the way an event gift names its festival: `category: 'project'`
plus `projectId`, on `Donation` and on `Pledge` alike. `applyDonationToFunds` in
`api.ts` is the single place an earmarked gift moves a meter, called both on a new gift
and on one replayed from localStorage after a reload.

## Membership: two prices, one membership

`MembershipTier` is `'normal' | 'senior'` — not a ladder. The benefits are identical
apart from reserved festival seating; the senior rate is simply lower and restricted to
devotees aged `SENIOR_MIN_AGE` (65) and over. That eligibility rule is computed in
`src/lib/membership.ts` and nowhere else, and `eligibilityFor` distinguishes
`too-young` from `no-dob` because the second is fixable on the profile page in thirty
seconds and the UI has to say so. `suggestedTier` decides which card leads the page.
`mock/users.ts` seeds dates of birth from 1944 so a real senior cohort exists.

## The cafeteria

`/kitchen` takes orders only while the kitchen is actually cooking. That rule lives in
`src/lib/kitchen.ts` — `KITCHEN_WINDOWS` is the published timetable and
`kitchenStatusAt` is the only thing allowed to decide — and it is enforced twice on
purpose: the page disables checkout, and `placeOrder` re-checks on submit, because a
tab left open across the end of a service would otherwise send breakfast through at
lunchtime. `serving` and `ordering` are deliberately different booleans; in the last
half hour the counter still serves while the site has stopped taking tickets.

Dishes declare the services they are cooked at (`servedAt`) and any day restriction
(`servedOn`), so the board filters itself rather than offering food nobody is making.
There is no delivery anywhere in the flow: it ends at a token and the counter.

An order's `lines` copy the dish name and price rather than pointing at the menu, so
repricing a dish next month cannot rewrite what somebody paid last week. A round-up
at checkout is booked through `createDonation` as an annadanam gift, so it reaches
the ledger instead of hiding inside a food sale.

Dish photographs live in `public/menu`, keyed to the item `image` field, with
`public/menu/CREDITS.md` recording the licence for each. They were matched by
requiring the dish's own name in the Commons file title and rejecting any title with
a meat word — an unfiltered first pass put a goat-masala photograph against the
spiced buttermilk and a Dutch shopfront against the bonda. One dish has no honest
photograph and deliberately falls back to a typographic tile rather than borrowing a
picture of something else.

The tray is a flex column with its own scroll area and a pinned footer. A tray with
eight dishes, a note, two contact fields and a payment choice is taller than a laptop
viewport, and a sticky card that overflows puts its own Place order button
permanently off screen. On a phone a fixed bottom bar carries the running total and
jumps to the tray, because there the tray sits below twenty-five dishes.

## The capital programme and the sidebar

`/projects` and `/kitchen` are open to guests but reachable from inside the portal, so
they route through `OpenLayout`, which gives a signed-in devotee the app rail and a
guest the public header. Following a sidebar link and watching the sidebar vanish
reads as having been logged out. Pages under it need no width wrapper — the layout
supplies the same container `AppLayout` does.

Project cover art is drawn, not photographed (`ProjectCover`): three of the four
projects do not exist yet, and the image library holds deity portraits, which do not
belong over a solar array.

## The Vedic Heritage School

`/school` is the class catalogue and `/school/:slug` books a place. Three rules decide
every enrolment and they live in `src/lib/school.ts`, byte-identical with the admin
app: the registration window, the student's age against the class band, and the seat
count. `enrolVerdict` returns all three as one answer plus a sentence a page can print,
and `enrolInClass` re-checks it on submit — a form left open while a class filled must
not be able to post a place through.

A full class produces a **waiting place, not a refusal**, because that is what the
school does at the desk. A waiting place takes no seat; `setEnrolmentStatus` owns all
the seat arithmetic so confirming a payment cannot double-count and a withdrawal frees
exactly one.

The school's own instruction is pay-then-register, so `pending-payment` is a normal
state rather than an error: a card settles immediately, a cheque or transfer is
confirmed by the coordinators when it arrives. Prerequisites are **advisory** — the
Purna Vidya levels are progressive but a family joining midway is placed after an
assessment, and the app is not qualified to refuse them.

The student is not the account holder. Every enrolment carries the child's own name and
age alongside the guardian's contact, because age is what decides admission.

Seeded from the school's published page: nine Purna Vidya levels, alternate Sundays
8:45–12:30, Parents' Corner, shloka assembly, chess and seva. The Tamil, Sanskrit and
music classes and **every fee** are placeholders — no fee is published anywhere.

## UI conventions

- `components/ui/` — local shadcn-style primitives. Prefer these over adding a new
  dependency; `/dev` (`DevGallery.tsx`) is a live component gallery for all of them.
- `components/shared/` — pieces shared in spirit with `meenakshi-admin`'s equivalents
  (`Logo`, `TaxReceiptPreview`, payment method / cheque-instructions UI).
- Tailwind v4 is configured CSS-natively via `@theme` in `src/index.css` — there is no
  `tailwind.config.js`. Brand/saffron/gold/ink/muted/line/bg tokens here are the
  source of truth; `meenakshi-admin` copies them and says so in its own CSS comments,
  so a token change belongs here first.
- Printable views (e.g. `TaxReceiptPreview`) use a `.print-area` / `.no-print`
  convention defined in `src/index.css`'s `@media print` block — `window.print()`
  hides everything except the marked node.
- `src/lib/utils.ts` holds shared formatters (`money`, `fmtDate`/`fmtDateTime`,
  `titleCase` — note its `ACRONYMS` set for things like ACH/EIN — `downloadCSV`). Use
  these instead of re-implementing formatting in a page.

## Design assets

`public/deities/` holds temple photography, self-hosted per its `CREDITS.md` as
public-domain/CC placeholders — replace with the Temple Society's own photography
before production. The display face (Marcellus) is self-hosted for LCP reasons; the
homepage hero ships at three widths via `srcset` and is preloaded because it's the LCP
element on first visit — keep both in mind before changing the hero or adding fonts.
