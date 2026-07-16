# Handoff — pantry.ai (DesertDev Hackathon)

## Stack

- **Next.js 16** (App Router) + TypeScript + **SQLite** via **Drizzle** + **better-sqlite3**
- UI: Tailwind 4, shadcn/Base UI, inline styles on several marketing-style screens
- AI: Google Gemini (`lib/gemini.ts`) for recipe/plan generation; vision for pantry photo ingest

## Run

```bash
npm install
npm run db:migrate    # if schema changed: db:generate then migrate
npm run dev           # http://0.0.0.0:3000 — see ../../CLAUDE.md for WSL/phone/HTTPS
npm run build && npm start
```

Detail (WSL, LAN, HTTPS camera): [CLAUDE.md](../../CLAUDE.md)

## Data

- Schema: `db/schema.ts` · DB file: `sqlite.db` · Access: `lib/db.ts`
- Migrations: `db/migrations/` · Utility: `npm run db:clear-pantry`

## Main routes (mental model)


| Area                | Path                  | Notes                                                                             |
| ------------------- | --------------------- | --------------------------------------------------------------------------------- |
| Pantry              | `/`                   | Kitchen board + photo snap                                                        |
| Wall / plan surface | `/wall`               | Week grid, tonight, dying list; **mobile PLAN tab points here**                   |
| New plan wizard     | `/plan/new`           | POST `/api/plan` then navigates to `/wall`                                        |
| Shopping            | `/plan/[id]/shopping` |                                                                                   |
| Redirects           | `/plan`, `/plan/[id]` | **Middleware** → `/wall` (avoids RSC redirect + dev `Performance.measure` glitch) |


## PWA

- Manifest: `app/manifest.ts` (`display_override` fullscreen → standalone) · Icons: `public/icons/*` · SW: `public/sw.js`
- **Prod:** `beforeInteractive` registers SW + `RegisterServiceWorker`; `**PwaInstallBanner`** uses `beforeinstallprompt` → user should tap **Install**, not menu “Add to Home screen” (shortcut often keeps Chrome UI).
- Dev: optional `NEXT_PUBLIC_PWA_DEV=1` + `npm run dev:https` for SW on LAN

## Mobile shell

- Bottom nav + slim header: `**max-width: 1280px`** in `app/layout.tsx`
- **Android:** tab bar syncs to `**visualViewport`** in `MobileBottomNav` (keyboard / viewport quirks)
- Week grid scroll is wrapped in `WeekGrid` so wide grids don’t widen `body`

## Tooling gotchas

- `**drizzle.config.ts`** is excluded from app `tsc` in `tsconfig.json` (pinned **drizzle-kit 0.18** types don’t match `defineConfig` in that file); CLI still uses the config for migrations.

## Branches / remote

- Work has been merged to `**main`**; feature work was on `**tones`** — confirm `git status` / remote before shipping.

