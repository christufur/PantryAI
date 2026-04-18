# pantry.ai

DesertDev 2026 Hackathon — Food & Agriculture track.

Snap a photo of your fridge → Gemini vision identifies every item → app tracks expiry → surfaces recipes that save what's about to die, a weekly meal planner, food bank donation matching, and a chat interface ("Ask the Fridge").

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

Open `.env.local` and add your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — takes 30 seconds, no billing required.

### 2. Database setup (run once)

```bash
npm run db:generate   # generate SQL migrations from schema
npm run db:migrate    # create sqlite.db and apply migrations
npm run db:seed       # populate lookup tables (shelf life, local NM producers, donation orgs)
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16, App Router, TypeScript |
| UI | shadcn/ui, Tailwind v4 |
| Database | SQLite via Drizzle ORM + better-sqlite3 |
| AI | Gemini 2.5 Flash (`@google/genai`) |

---

## Pages

| Route | What it does |
|-------|-------------|
| `/` | Pantry dashboard — LIST / COLUMN / SHELVES view toggle |
| `/wall` | Glanceable kitchen mode — tonight's recipe + week grid |
| `/plan` | Weekly meal planner with local NM producer swaps |
| `/donate` | Match expiring items to ABQ food banks |
| `/chat` | "Ask the Fridge" — chat interface powered by Gemini |
| `/recipe?ingredients=a,b` | Recipe display with cache |

---

## Key scripts

```bash
npm run dev             # dev server at localhost:3000
npm run build           # production build
npm run lint            # ESLint

npm run db:generate     # regen migrations after schema changes
npm run db:migrate      # apply migrations to sqlite.db
npm run db:seed         # seed lookup tables
npm run db:studio       # open Drizzle Studio (visual DB browser)
```

---

## Project structure

```
app/                    # Next.js App Router pages + API routes
  api/
    photo/route.ts      # POST: image → Gemini vision → insert pantry items
    plan/route.ts       # POST: meals → weekly plan → local swaps attached
    recipe/route.ts     # GET:  cached recipe lookup
    donate/route.ts     # GET:  filter donation orgs by item perishability
    chat/route.ts       # POST: chat with fridge (Gemini + pantry context)
components/
  PantryViewSwitcher.tsx  # LIST / COLUMN / SHELVES toggle (client)
  PhotoUploadDialog.tsx   # Photo upload + receipt reveal (client)
  WeeklyPlanForm.tsx      # Meal planner form (client)
  ChatInterface.tsx       # Chat bubbles (client)
  ExpiryColumn.tsx        # Vertical expiry timeline (client)
db/
  schema.ts             # Drizzle table definitions — edit here to add tables
  seed.ts               # Lookup table seeder
  seed/                 # JSON seed data (shelf life, local swaps, donation orgs)
lib/
  db.ts                 # Single db instance — import { db } from here
  gemini.ts             # Gemini wrapper: identifyPantryItems, generateWeeklyPlan, generateRecipe
```

---

## Adding a table

1. Edit `db/schema.ts`
2. `npm run db:generate`
3. `npm run db:migrate`
4. Import and query via `db` from `lib/db.ts`

---

## Before the demo

Pre-generate every recipe and plan you'll show on stage — cached responses are instant, live Gemini on conference wifi is not:

```bash
# Hit the recipe endpoint for each item you plan to demo
curl "http://localhost:3000/api/recipe?ingredients=spinach,tomato,eggs"
curl "http://localhost:3000/api/recipe?ingredients=avocado"
```

The `/wall` page auto-generates tonight's recipe on load and caches it — open it once before going on stage.

---

## Team

christufur / cmeraz — DesertDev 2026
