# Sri Meenakshi Temple — Devotee App (Prototype)

Prototype for Sri Meenakshi Devasthanam, Pearland TX.

## Local dev

```bash
npm install && npm run dev
```

## Build

```bash
npm run build
```

## Stack

Vite · React · TypeScript · Tailwind v4 · shadcn/ui · react-router · zustand

## Data

All local mock. See `src/lib/data/mock/`. Swap `src/lib/data/api.ts` to go real.

Every figure is generated deterministically from a seeded PRNG, so a rebuild always
produces identical data. Puja sponsorships plus donations reconcile to exactly
**$723,000** — the number the transparency strip publishes.

## Sign in

Any email or phone works. Submitting signs you in as the first seeded devotee unless
the input matches another one.

## Routes worth seeing

| Route | What it shows |
|---|---|
| `/` | Rotating festival hero, public transparency strip, quick actions |
| `/puja/book/:pujaId` | The four-step sponsorship wizard |
| `/donate` | Fund picker, presets, recurring toggle, 501(c)(3) receipt preview |
| `/calendar` | Month grid with "only my pujas" filter and day drawer |
| `/dev` | Component gallery for every shared primitive |

## Deploy

Vercel — framework preset "Vite", auto from `main`. `vercel.json` adds the SPA rewrite
react-router needs.
