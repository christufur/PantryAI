# pantry.ai

**DesertDev 2026 Hackathon — Food & Agriculture track.**

Snap a photo of your fridge → Gemini vision identifies every item → the app tracks expiry → surfaces recipes that save what's about to die, a weekly meal planner, food bank donation matching, and a "Ask the Fridge" chat interface.

---

## Features

- **Vision scanning** — photo upload or barcode scan identifies pantry items with category, quantity, and printed expiry dates via Gemini multimodal AI
- **Pantry tracker** — three view modes (List · Column · Shelves), sorted dying-first, with local NM producer swap suggestions
- **Kitchen Wall** (`/wall`) — glanceable fridge-door mode: tonight's recipe, items dying within 3 days, editable 7-day meal grid
- **Weekly planner** — Gemini generates breakfast/lunch/dinner for N days targeting your calorie goal, prioritising expiring items
- **Interactive week grid** — mark meals complete, remove meals, add meals per day — all reflected live
- **Shopping list** — consolidated buy list for the active plan, with local Albuquerque/NM producer alternatives
- **Recipe engine** — single-call recipe generation from whatever's dying; results cached in SQLite
- **Donation matcher** — maps expiring perishables to ABQ-area food banks and pantries via a local dataset
- **Ask the Fridge** — chat with Gemini about what to cook given your current pantry state
- **User profile** — dietary restrictions and calorie target injected into all AI prompts
- **PWA-ready** — installable on iOS/Android with a service worker, custom icons, and mobile bottom nav

---

## Quick start

**Prerequisites:** Node 20+, npm

```bash
git clone https://github.com/christufur/DesertDevHackathon.git
cd DesertDevHackathon
npm install
```

### 1. Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
GEMINI_API_KEY=your_key_here
USDA_LOCALFOOD_API_KEY=your_key_here
```

- **Gemini key** — free at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), no billing required
- **USDA Local Food key** — free at [api.nal.usda.gov](https://api.nal.usda.gov) (used for nearby local food outlet lookup)

### 2. Database (run once)

```bash
npm run db:generate   # generate SQL migrations from schema
npm run db:migrate    # create sqlite.db and apply migrations
npm run db:seed       # seed lookup tables (shelf life, local NM producers, donation orgs)
```

### 3. Run

```bash
npm run dev           # http://localhost:3000
npm run dev:https     # HTTPS (self-signed) — required for iOS camera / barcode over LAN
```

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Pantry dashboard — List / Column / Shelves view, photo upload, barcode scan |
| `/wall` | Kitchen Wall — tonight's recipe + dying items + editable 7-day week grid |
| `/plan/new` | Generate a new weekly meal plan |
| `/plan/[id]/shopping` | Shopping list for a specific plan |
| `/recipe` | Recipe for a set of ingredients (`?ingredients=a,b,c`) |
| `/donate` | Match expiring items to local food banks |
| `/chat` | "Ask the Fridge" — Gemini chat with pantry context |
| `/settings` | User profile (calorie target, dietary restrictions) |

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15, App Router, TypeScript |
| UI | shadcn/ui, Tailwind v4 |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| AI | Gemini (`gemini-3.1-flash-lite-preview`, `@google/genai`) |
| Barcode | `@zxing/browser` + `@zxing/library` |
| Fonts | Source Serif 4, JetBrains Mono, Inter (Google Fonts) |

---

## Key scripts

```bash
npm run dev              # dev server at localhost:3000
npm run dev:https        # HTTPS dev server (for camera on LAN devices)
npm run build            # production build
npm run lint             # ESLint

npm run db:generate      # regen migrations after schema changes
npm run db:migrate       # apply migrations to sqlite.db
npm run db:seed          # seed lookup tables
npm run db:studio        # open Drizzle Studio (visual DB browser)
npm run db:clear-pantry  # wipe all pantry_items (stop dev server first)

npm run icons:pwa        # regenerate PWA icons from public/icons/icon.svg
```

---

## Project structure

```
app/
  page.tsx                  # Pantry home — list/column/shelves + photo upload
  layout.tsx                # Root layout — top nav, masthead, mobile bottom nav
  wall/
    page.tsx                # Kitchen Wall (server component)
    WeekGrid.tsx            # Interactive 7-day grid (client component)
  plan/
    new/page.tsx            # Plan generator form + API call
    [planId]/shopping/      # Shopping list for a plan
  recipe/page.tsx           # Recipe display
  donate/page.tsx           # Donation matcher
  chat/page.tsx             # Chat interface
  settings/page.tsx         # User profile
  api/
    photo/route.ts          # POST image → Gemini vision → insert pantry items
    plan/route.ts           # POST → generateWeeklyPlan → local swaps enrichment
    meal/route.ts           # POST add meal to plan
    meal/[mealId]/route.ts  # DELETE a meal from plan
    recipe/route.ts         # GET cached recipe / generate fresh
    donate/route.ts         # GET donation org matches
    chat/route.ts           # POST Gemini chat with pantry context
    profile/route.ts        # GET/POST user profile
components/
  PantryViewSwitcher.tsx    # LIST / COLUMN / SHELVES toggle
  PhotoUploadDialog.tsx     # Photo upload + Gemini reveal
  BarcodeScanner.tsx        # @zxing camera barcode scanner
  WeeklyPlanForm.tsx        # Meal planner form
  ChatInterface.tsx         # Chat bubbles
  MobileBottomNav.tsx       # Mobile bottom tab bar
db/
  schema.ts                 # Drizzle table definitions
  seed.ts                   # Lookup table seeder
  seed/                     # JSON seed data (shelf life, local producers, donation orgs)
lib/
  db.ts                     # Single SQLite db instance
  gemini.ts                 # identifyPantryItems · generateWeeklyPlan · generateRecipe
  usda.ts                   # USDA local food outlet API wrapper
  profile.ts                # loadProfile / profilePromptContext
```

---

## Project notes

- [Hackathon handoff](docs/hackathon-notes/handoff.md)
- [Data and AI layer bundle](docs/hackathon-notes/PantryBundle.md)
- [Circular dependency assessment](docs/hackathon-notes/ASSESSMENT.md)
- [WSL2 port-proxy guide](docs/development/wsl-port-proxy.md)

---

## Demo tips

Pre-warm the cache before going on stage — live Gemini on conference Wi-Fi is slow:

```bash
# Cache a recipe
curl "http://localhost:3000/api/recipe?ingredients=spinach,tomato,eggs"

# Open /wall once — it auto-generates and caches tonight's recipe
open http://localhost:3000/wall
```

---

## Team

christufur · cmeraz · Rupak Dey — DesertDev 2026
