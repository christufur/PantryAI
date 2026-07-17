# pantry.ai

**AI-powered pantry tracker that fights food waste — built for the DesertDev 2026 Hackathon (Food & Agriculture track).**

Snap a photo of your fridge. Gemini vision identifies every item, estimates expiry, and the app turns that inventory into recipes, a calorie-aware weekly meal plan, local New Mexico producer swaps, food-bank donation matches, and a running impact score (money saved, lbs diverted, CO₂e avoided).

Built as a full-stack Next.js product in a 36-hour hackathon by a team of three — then cleaned up for portfolio and production-minded demo use.

---

## Why it exists

Most grocery food waste happens at home: people forget what they bought, miss use-by dates, and throw away food that could have been cooked or donated. In Albuquerque, roughly **98% of food is shipped in from out of state**, so every wasted item carries extra cost and carbon.

pantry.ai closes that loop:

1. **Know what you have** (vision + barcode ingest)
2. **Use it before it dies** (expiry-first UI, AI recipes & meal plans)
3. **Buy local when you must shop** (NM producer swaps + USDA outlets)
4. **Donate what you won’t cook** (ABQ food banks)
5. **See the impact** (rescued items → dollars, pounds, CO₂e, water)

---

## Features

| Area | What it does |
|------|----------------|
| **Vision ingest** | Upload a fridge/pantry photo → Gemini multimodal extracts name, category, qty, and printed “best by” dates when visible |
| **Barcode ingest** | Camera scan via ZXing → Open Food Facts product lookup → shelf-life estimate → pantry insert |
| **Expiry-first pantry** | Sorted dying-first; List · Column · Shelves views; edit qty/location; cook or donate flows |
| **Kitchen Wall** (`/wall`) | Fridge-door mode: tonight’s meal, items expiring ≤3 days, editable 7-day grid |
| **Weekly planner** | Gemini plans breakfast/lunch/dinner for N days against a calorie target; prioritizes expiring pantry stock; profile constraints injected into every prompt |
| **Shopping list** | Aggregated buy list for a plan, reconciled against pantry quantities, with local NM alternatives |
| **Recipe engine** | Ingredient picker → one-shot recipe generation; SQLite cache by ingredient hash for snappy demos |
| **Ask the Fridge** | Gemini chat (“Fridgey”) grounded in live pantry state and dietary profile |
| **Donation matching** | Expiring perishables matched to Albuquerque-area food banks / pantries |
| **Impact dashboard** | Lifetime rescues with estimated $ saved, lbs diverted, CO₂e, and water |
| **User profile** | Dietary restrictions, allergies, nutrition goals, household size, skill — applied across plan, recipe, and chat |
| **PWA** | Installable on iOS/Android (manifest, service worker, install banner, mobile bottom nav) |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), custom editorial layout |
| Database | **SQLite** + **Drizzle ORM** + better-sqlite3 |
| AI | Google **Gemini** (`@google/genai`) — vision, structured JSON plans/recipes, chat |
| Product data | **Open Food Facts** (barcodes), FoodKeeper-style shelf-life seed data |
| Local food | Seeded NM producer swaps + optional **USDA Local Food Portal** API |
| Barcode | `@zxing/browser` + `@zxing/library` |
| Deploy shape | Server Components + Route Handlers; single-process SQLite app |

### Engineering highlights (interview-friendly)

- **Structured LLM outputs** — Gemini `responseSchema` for vision items, weekly plans, and recipes (parseable JSON, not free text)
- **Expiry computation** — printed date from vision when available; otherwise category + storage location → shelf-life lookup
- **Plan / pantry math** — server-side reconciliation so shopping lists subtract what you already own
- **Resilience** — retries + model fallbacks for 429/503 from Gemini; recipe cache for demo reliability
- **Mobile-first shell** — visualViewport-aware bottom nav, middleware redirects to avoid flaky RSC client navigations, PWA install path for Android/iOS
- **Regional product focus** — Albuquerque food banks + New Mexico producers baked into the domain model, not bolted-on copy

---

## Quick start

**Prerequisites:** Node 20+, npm

```bash
git clone https://github.com/christufur/PantryAI.git
cd PantryAI
npm install
```

### 1. Environment

```bash
cp .env.example .env.local
```

Set at least:

```
GEMINI_API_KEY=your_key_here
```

| Variable | Required? | Where |
|----------|-----------|--------|
| `GEMINI_API_KEY` | Yes (for AI features) | [Google AI Studio](https://aistudio.google.com/app/apikey) — free tier is enough |
| `USDA_LOCALFOOD_API_KEY` | Optional | [USDA Local Food Portal](https://www.usdalocalfoodportal.com/) — nearby outlets |
| `DEMO_PHOTO_MOCK=true` | Optional | Skip live vision; use `data/demo-photo-identified.json` (useful offline / demo Wi‑Fi) |
| `NEXT_PUBLIC_PWA_DEV=1` | Optional | Register the service worker during local HTTPS testing |

### 2. Database (once)

```bash
npm run db:generate   # SQL migrations from schema
npm run db:migrate    # create/apply against sqlite.db
npm run db:seed       # shelf life, local NM producers, donation orgs
```

Optional demo pantry:

```bash
npm run db:seed:demo
```

### 3. Run

```bash
npm run dev           # http://localhost:3000
npm run dev:https     # HTTPS (self-signed) — needed for iPhone camera / barcode over LAN
```

---

## App map

| Route | Purpose |
|-------|---------|
| `/` | Pantry home — kitchen board, photo upload, barcode, list/column/shelves |
| `/wall` | Kitchen Wall — tonight + dying list + week grid (primary PLAN surface) |
| `/plan/new` | Multi-step weekly plan wizard → Gemini generation |
| `/plan/[id]/shopping` | Shopping list for a plan |
| `/recipe` | Ingredient picker |
| `/recipe/dish` | Generated recipe view (`?ingredients=…` rewrites here) |
| `/impact` | Lifetime food-rescue impact stats |
| `/chat` | “Ask the Fridge” — pantry-aware Gemini chat |
| `/settings` | Profile + notification entry points |

`/plan` and `/plan/:id` redirect to `/wall` (middleware) so plan editing lives in one place.

### API surface (selected)

| Endpoint | Role |
|----------|------|
| `POST /api/photo` | Image → Gemini vision → insert pantry items |
| `POST /api/barcode` | Barcode → Open Food Facts → insert item |
| `POST /api/plan` | Generate + persist weekly meal plan |
| `GET/DELETE /api/plan/[planId]` | Load or clear a plan |
| `POST /api/plan/[planId]/fill` | Fill empty days on an existing plan |
| `POST/DELETE /api/meal` | Add / remove individual meals |
| `GET /api/recipe` | Cached or fresh recipe generation |
| `POST /api/chat` | Fridgey chat with pantry + profile context |
| `GET /api/donate` | Match item(s) to local donation orgs |
| `GET/POST /api/profile` | Load / save user preferences |
| `GET /api/impact` | Impact totals |
| `POST /api/items/cook` | Mark items cooked (impact events) |
| `PATCH/DELETE /api/items/[id]` | Edit or remove a pantry row |

---

## Project structure

```
app/                    # App Router pages + API route handlers
  api/                  # photo, barcode, plan, meal, recipe, chat, donate, impact, …
  wall/                 # Kitchen Wall + interactive week grid
  plan/                 # New-plan wizard, shopping list
  recipe/               # Picker + dish view
  impact/ chat/ settings/
components/             # Client UI (pantry board, scanners, chat, PWA, modals)
  ui/                   # shadcn primitives
db/
  schema.ts             # Drizzle tables (pantry, plans, cache, impact, profile, …)
  migrations/           # Generated SQL
  seed/                 # shelf_life, local_swaps, donation_orgs JSON
lib/
  gemini.ts             # identify · plan · fill-days · recipe + retries/fallbacks
  openfoodfacts.ts      # Barcode product lookup
  impact.ts             # Rescue → $ / lbs / CO₂e / water
  profile.ts shopping.ts recipe-buy-local.ts usda.ts
docs/
  hackathon-notes/      # Historical handoff + original data/AI bundle
  development/          # WSL2 / LAN port-proxy notes
```

---

## Scripts

```bash
npm run dev              # Dev server (0.0.0.0:3000)
npm run dev:https        # HTTPS for camera on LAN devices
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint

npm run db:generate      # Migrations from schema changes
npm run db:migrate       # Apply migrations
npm run db:seed          # Lookup tables
npm run db:seed:demo     # Demo pantry contents
npm run db:studio        # Drizzle Studio
npm run db:clear-pantry  # Wipe pantry_items (stop dev server first)

npm run icons:pwa        # Regenerate PWA PNGs from public/icons/icon.svg
```

WSL2 users exposing the app to a phone: see [docs/development/wsl-port-proxy.md](docs/development/wsl-port-proxy.md) and `CLAUDE.md` (mirrored networking / HTTPS notes).

---

## Architecture snapshot

```
Photo / barcode
      │
      ▼
┌─────────────────┐     shelf_life      ┌──────────────────┐
│  Ingest APIs    │────────────────────►│  pantry_items    │
│  + Gemini vision│                     │  (SQLite)        │
└─────────────────┘                     └────────┬─────────┘
                                                 │
          ┌──────────────────────────────────────┼────────────────────────┐
          ▼                                      ▼                        ▼
   Recipes + cache                    Weekly plan + meals           Impact events
   (Gemini + hash)                    (Gemini + shopping)           (cook / donate)
          │                                      │                        │
          └──────────────────► Profile context ──┘                        │
                               (dietary / allergies)                      ▼
                                                                   Impact dashboard
```

Data model highlights (`db/schema.ts`): `pantry_items`, `shelf_life`, `local_swaps`, `donation_orgs`, `meals_planned`, `user_profile`, `impact_events`, `recipes_cache`.

---

## Team

Built at **DesertDev 2026** (Food & Agriculture) by:

**Antonio** · **cmeraz** · **Rupak Dey**

---

## License / status

Hackathon portfolio project. Not a commercial product. API keys stay in `.env.local` (never commit secrets).
