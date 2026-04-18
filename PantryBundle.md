# pantry.ai — Data + AI Layer Bundle

## For Claude Code

This bundle is the **data + AI layer** for **pantry.ai**, a Next.js 15 + TypeScript + Drizzle (SQLite) + shadcn/ui app built for the DesertDev 2026 hackathon (theme: Food & Agriculture). Team of 3, ~36 hours.

**Product:** user snaps a photo of their pantry/fridge → Gemini vision identifies items → app tracks expiry dates → surfaces four features:
1. **Expiry dashboard** sorted by urgency
2. **Recipes** for expiring items
3. **Donation matching** to ABQ food banks (Roadrunner, Storehouse, Joy Junction, etc.)
4. **Weekly plan**: user inputs planned meals → LLM sequences them to use expiring pantry items first → generates a shopping list with **local NM producer alternatives** flagged (ties to the judges' "98% of ABQ food is out-of-state" problem statement)

**What this bundle provides:** the Drizzle schema (6 tables), seed JSON for shelf-life / local swaps / donation orgs, the seed runner, and the Gemini wrapper with three functions (`identifyPantryItems`, `generateWeeklyPlan`, `generateRecipe`). API routes and UI pages are **not** included — build those on top per CLAUDE.md's guidelines (simplicity first, surgical changes, goal-driven).

Drop each section into the file path noted in its header.

---

## Assumptions

1. SDK: `@google/genai` v1.x (the new unified one). If you've already `npm install`ed `@google/generative-ai`, swap it — that one is deprecated.
2. Model: `gemini-2.5-flash` — `gemini-2.0-flash` is legacy-access-only as of March 2026.
3. Single hardcoded user → no `users` table, no FKs on user_id.
4. No `photos` table → photo path stored as nullable `source_photo_path` on `pantry_items`.
5. Dates stored as Unix timestamps (Drizzle `integer` + `mode: 'timestamp'`).
6. Seed data is a working starter — **verify/expand `local_swaps.json` before demo.**

---

## File tree

```
db/schema.ts
db/seed.ts
db/seed/shelf_life.json
db/seed/local_swaps.json
db/seed/donation_orgs.json
lib/gemini.ts
```

---

## Install

```bash
npm install @google/genai
```

## Environment

Create `.env.local` in the repo root:

```
GEMINI_API_KEY=<get from https://aistudio.google.com/app/apikey>
```

## DB + seed workflow

```bash
# One-time, after pulling these files:
npm run db:generate        # creates migration from db/schema.ts
npm run db:migrate         # applies to sqlite.db
npx tsx db/seed.ts         # populates lookup tables
```

Add to `package.json` scripts:

```json
"db:seed": "tsx db/seed.ts"
```

---

## `db/schema.ts`

```ts
import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Pantry items — the core table.
// expiry_date is computed at insert time: printed_date if the vision model
// read one, else date_added + shelf_life lookup (category, storage_location).
export const pantryItems = sqliteTable("pantry_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g. "leafy_greens", "dairy_milk"
  qty: real("qty").notNull().default(1),
  unit: text("unit").notNull().default("each"), // "each" | "oz" | "lb" | "g"
  storageLocation: text("storage_location").notNull(), // "fridge" | "freezer" | "pantry"
  dateAdded: integer("date_added", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  expiryDate: integer("expiry_date", { mode: "timestamp" }).notNull(),
  sourcePhotoPath: text("source_photo_path"), // nullable — null for manual entry
  isLocal: integer("is_local", { mode: "boolean" }).notNull().default(false),
});

// Shelf-life lookup. Seeded once from FoodKeeper-style data.
// Keyed by (category, storage_location). Days = default shelf life from
// date_added when no printed date is available.
export const shelfLife = sqliteTable("shelf_life", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  storageLocation: text("storage_location").notNull(),
  days: integer("days").notNull(),
});

// Local NM producer/alternative for a generic grocery item.
// genericName matches against pantry item names (case-insensitive contains).
export const localSwaps = sqliteTable("local_swaps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  genericName: text("generic_name").notNull(), // "bread", "tomatoes", "milk"
  localProducer: text("local_producer").notNull(),
  product: text("product").notNull(),
  whereToBuy: text("where_to_buy").notNull(),
  notes: text("notes"),
});

// ABQ-area food banks / shelters that accept donations.
// Simple boolean flags let us filter items to appropriate orgs.
export const donationOrgs = sqliteTable("donation_orgs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  hours: text("hours"),
  acceptsPerishable: integer("accepts_perishable", { mode: "boolean" })
    .notNull()
    .default(false),
  acceptsOpened: integer("accepts_opened", { mode: "boolean" })
    .notNull()
    .default(false),
  notes: text("notes"),
});

// Persisted weekly plan. One row per (week_start, day) meal slot.
// ingredientsJson is the LLM's plan output: what's used from pantry vs bought.
export const mealsPlanned = sqliteTable("meals_planned", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekStart: integer("week_start", { mode: "timestamp" }).notNull(),
  dayIndex: integer("day_index").notNull(), // 0 = Monday ... 6 = Sunday
  mealName: text("meal_name").notNull(),
  servings: integer("servings").notNull().default(2),
  ingredientsJson: text("ingredients_json"), // {uses_from_pantry:[], needs_to_buy:[]}
});

// Recipe cache. Keyed by a hash of the sorted ingredient list.
// Saves API calls on repeat demos and keeps the pitch snappy.
export const recipesCache = sqliteTable("recipes_cache", {
  ingredientsHash: text("ingredients_hash").primaryKey(),
  recipeJson: text("recipe_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

---

## `db/seed.ts`

```ts
// Seed runner. Run with: `npx tsx db/seed.ts`
// Idempotent: clears the three lookup tables first, then inserts.
// Does NOT touch pantry_items, meals_planned, or recipes_cache.

import { db } from "@/lib/db";
import { shelfLife, localSwaps, donationOrgs } from "@/db/schema";
import shelfLifeData from "./seed/shelf_life.json";
import localSwapsData from "./seed/local_swaps.json";
import donationOrgsData from "./seed/donation_orgs.json";

async function main() {
  console.log("Clearing lookup tables…");
  await db.delete(shelfLife);
  await db.delete(localSwaps);
  await db.delete(donationOrgs);

  console.log(`Inserting ${shelfLifeData.length} shelf_life rows…`);
  await db.insert(shelfLife).values(shelfLifeData);

  console.log(`Inserting ${localSwapsData.length} local_swaps rows…`);
  await db.insert(localSwaps).values(localSwapsData);

  console.log(`Inserting ${donationOrgsData.length} donation_orgs rows…`);
  await db.insert(donationOrgs).values(donationOrgsData);

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## `db/seed/shelf_life.json`

```json
[
  { "category": "leafy_greens", "storageLocation": "fridge", "days": 5 },
  { "category": "leafy_greens", "storageLocation": "freezer", "days": 240 },

  { "category": "berries", "storageLocation": "fridge", "days": 5 },
  { "category": "berries", "storageLocation": "freezer", "days": 300 },

  { "category": "apple", "storageLocation": "fridge", "days": 42 },
  { "category": "apple", "storageLocation": "pantry", "days": 7 },

  { "category": "banana", "storageLocation": "pantry", "days": 5 },
  { "category": "citrus", "storageLocation": "fridge", "days": 21 },
  { "category": "citrus", "storageLocation": "pantry", "days": 10 },

  { "category": "tomato", "storageLocation": "pantry", "days": 5 },
  { "category": "tomato", "storageLocation": "fridge", "days": 10 },

  { "category": "avocado", "storageLocation": "fridge", "days": 5 },
  { "category": "avocado", "storageLocation": "pantry", "days": 3 },

  { "category": "onion", "storageLocation": "pantry", "days": 60 },
  { "category": "potato", "storageLocation": "pantry", "days": 60 },
  { "category": "garlic", "storageLocation": "pantry", "days": 90 },
  { "category": "carrot", "storageLocation": "fridge", "days": 30 },
  { "category": "bell_pepper", "storageLocation": "fridge", "days": 10 },
  { "category": "cucumber", "storageLocation": "fridge", "days": 7 },
  { "category": "broccoli", "storageLocation": "fridge", "days": 5 },
  { "category": "mushroom", "storageLocation": "fridge", "days": 7 },
  { "category": "chile_green", "storageLocation": "fridge", "days": 10 },
  { "category": "chile_green", "storageLocation": "freezer", "days": 365 },

  { "category": "dairy_milk", "storageLocation": "fridge", "days": 7 },
  { "category": "dairy_yogurt", "storageLocation": "fridge", "days": 14 },
  { "category": "dairy_cheese_hard", "storageLocation": "fridge", "days": 42 },
  { "category": "dairy_cheese_soft", "storageLocation": "fridge", "days": 7 },
  { "category": "dairy_butter", "storageLocation": "fridge", "days": 90 },
  { "category": "eggs", "storageLocation": "fridge", "days": 35 },

  { "category": "meat_raw_chicken", "storageLocation": "fridge", "days": 2 },
  { "category": "meat_raw_chicken", "storageLocation": "freezer", "days": 270 },
  { "category": "meat_raw_beef", "storageLocation": "fridge", "days": 3 },
  { "category": "meat_raw_beef", "storageLocation": "freezer", "days": 365 },
  { "category": "meat_ground", "storageLocation": "fridge", "days": 2 },
  { "category": "meat_ground", "storageLocation": "freezer", "days": 120 },
  { "category": "meat_deli", "storageLocation": "fridge", "days": 5 },
  { "category": "fish_raw", "storageLocation": "fridge", "days": 2 },
  { "category": "fish_raw", "storageLocation": "freezer", "days": 180 },

  { "category": "bread", "storageLocation": "pantry", "days": 5 },
  { "category": "bread", "storageLocation": "freezer", "days": 90 },
  { "category": "tortillas", "storageLocation": "fridge", "days": 14 },
  { "category": "tortillas", "storageLocation": "pantry", "days": 7 },

  { "category": "rice_dry", "storageLocation": "pantry", "days": 730 },
  { "category": "rice_cooked", "storageLocation": "fridge", "days": 5 },
  { "category": "pasta_dry", "storageLocation": "pantry", "days": 730 },
  { "category": "pasta_cooked", "storageLocation": "fridge", "days": 5 },
  { "category": "beans_dry", "storageLocation": "pantry", "days": 730 },
  { "category": "beans_canned", "storageLocation": "pantry", "days": 1095 },

  { "category": "canned_vegetable", "storageLocation": "pantry", "days": 1095 },
  { "category": "canned_fruit", "storageLocation": "pantry", "days": 730 },
  { "category": "canned_soup", "storageLocation": "pantry", "days": 730 },
  { "category": "cereal", "storageLocation": "pantry", "days": 365 },
  { "category": "flour", "storageLocation": "pantry", "days": 365 },
  { "category": "sugar", "storageLocation": "pantry", "days": 730 },
  { "category": "oil_olive", "storageLocation": "pantry", "days": 730 },

  { "category": "leftovers", "storageLocation": "fridge", "days": 4 },
  { "category": "unknown", "storageLocation": "fridge", "days": 7 },
  { "category": "unknown", "storageLocation": "pantry", "days": 30 },
  { "category": "unknown", "storageLocation": "freezer", "days": 90 }
]
```

---

## `db/seed/local_swaps.json`

**Verify these producers before demo.** Confident: La Montañita Co-op, Skarsgard Farms, Los Poblanos, Bueno Foods, Valencia Flour Mill. Others are plausible NM producers but should be confirmed.

```json
[
  {
    "genericName": "bread",
    "localProducer": "Sage Bakehouse",
    "product": "Artisan sourdough & rustic loaves",
    "whereToBuy": "La Montañita Co-op, Sage Bakehouse (ABQ)",
    "notes": "Family-run ABQ bakery"
  },
  {
    "genericName": "tortillas",
    "localProducer": "Bueno Foods",
    "product": "Flour & corn tortillas",
    "whereToBuy": "Most ABQ grocers",
    "notes": "Made in Albuquerque since 1951"
  },
  {
    "genericName": "chile_green",
    "localProducer": "Hatch / Lemitar growers",
    "product": "Fresh & roasted NM green chile",
    "whereToBuy": "Downtown Growers' Market, Rail Yards Market (seasonal)",
    "notes": "Keep stat in mind: 98% of ABQ food is out-of-state — chile is the exception"
  },
  {
    "genericName": "tomato",
    "localProducer": "Skarsgard Farms",
    "product": "Heirloom tomatoes (seasonal)",
    "whereToBuy": "Skarsgard Farms CSA, La Montañita Co-op",
    "notes": "ABQ-based CSA, home delivery available"
  },
  {
    "genericName": "lettuce",
    "localProducer": "Skarsgard Farms",
    "product": "Mixed greens",
    "whereToBuy": "Skarsgard Farms CSA, farmers markets",
    "notes": ""
  },
  {
    "genericName": "leafy_greens",
    "localProducer": "Skarsgard Farms",
    "product": "Spinach, kale, chard",
    "whereToBuy": "Skarsgard Farms CSA",
    "notes": ""
  },
  {
    "genericName": "eggs",
    "localProducer": "Pollo Real",
    "product": "Pasture-raised eggs",
    "whereToBuy": "La Montañita Co-op, farmers markets",
    "notes": "NM-raised"
  },
  {
    "genericName": "dairy_milk",
    "localProducer": "Rasband Dairy",
    "product": "Local milk (glass bottles)",
    "whereToBuy": "La Montañita Co-op",
    "notes": ""
  },
  {
    "genericName": "dairy_cheese_hard",
    "localProducer": "Old Windmill Dairy",
    "product": "Aged goat cheeses",
    "whereToBuy": "La Montañita Co-op, farmers markets",
    "notes": "Estancia, NM"
  },
  {
    "genericName": "dairy_cheese_soft",
    "localProducer": "Old Windmill Dairy",
    "product": "Fresh goat chèvre",
    "whereToBuy": "La Montañita Co-op",
    "notes": ""
  },
  {
    "genericName": "honey",
    "localProducer": "Los Poblanos",
    "product": "NM wildflower honey",
    "whereToBuy": "Los Poblanos Farm Shop, La Montañita Co-op",
    "notes": "Los Ranchos de Albuquerque"
  },
  {
    "genericName": "beans_dry",
    "localProducer": "NM heirloom growers",
    "product": "Bolita & Anasazi beans",
    "whereToBuy": "Downtown Growers' Market, La Montañita Co-op",
    "notes": "Traditional Rio Grande varieties"
  },
  {
    "genericName": "apple",
    "localProducer": "Dixon / Velarde orchards",
    "product": "NM apples (seasonal)",
    "whereToBuy": "Farmers markets (fall)",
    "notes": "Northern NM orchards"
  },
  {
    "genericName": "meat_raw_beef",
    "localProducer": "NM ranchers via Talus Wind",
    "product": "Grass-fed beef",
    "whereToBuy": "La Montañita Co-op",
    "notes": ""
  },
  {
    "genericName": "lavender",
    "localProducer": "Los Poblanos",
    "product": "Culinary lavender",
    "whereToBuy": "Los Poblanos Farm Shop",
    "notes": ""
  },
  {
    "genericName": "flour",
    "localProducer": "Valencia Flour Mill",
    "product": "Stone-ground NM flour",
    "whereToBuy": "La Montañita Co-op",
    "notes": "Jarales, NM"
  }
]
```

---

## `db/seed/donation_orgs.json`

```json
[
  {
    "name": "Roadrunner Food Bank",
    "address": "5840 Office Blvd NE, Albuquerque, NM 87109",
    "phone": "(505) 247-2052",
    "hours": "Mon–Fri 8am–4pm",
    "acceptsPerishable": true,
    "acceptsOpened": false,
    "notes": "Largest food bank in NM. Distributes to 450+ partner agencies. Unopened, in-date shelf-stable items preferred; perishable donations coordinated in advance."
  },
  {
    "name": "The Storehouse New Mexico",
    "address": "106 Broadway Blvd SE, Albuquerque, NM 87102",
    "phone": "(505) 842-6491",
    "hours": "Mon, Wed, Fri 9am–2pm",
    "acceptsPerishable": true,
    "acceptsOpened": false,
    "notes": "Downtown food pantry. Accepts unopened groceries and fresh produce."
  },
  {
    "name": "Joy Junction",
    "address": "4500 2nd St SW, Albuquerque, NM 87105",
    "phone": "(505) 877-6967",
    "hours": "Daily, call ahead for food donations",
    "acceptsPerishable": true,
    "acceptsOpened": false,
    "notes": "Homeless shelter. Prepared food donations welcome — call first."
  },
  {
    "name": "Good Shepherd Center",
    "address": "601 Gold Ave SW, Albuquerque, NM 87102",
    "phone": "(505) 243-2527",
    "hours": "Mon–Sat, varies",
    "acceptsPerishable": false,
    "acceptsOpened": false,
    "notes": "Shelter + meal program. Non-perishable donations preferred."
  },
  {
    "name": "Compost ABQ (fallback)",
    "address": "Various drop-off sites, Albuquerque",
    "phone": null,
    "hours": "Varies",
    "acceptsPerishable": true,
    "acceptsOpened": true,
    "notes": "If food is past donation use, compost at Soilutions or municipal green-bin program. Keeps organics out of landfill."
  }
]
```

---

## `lib/gemini.ts`

```ts
// Single Gemini client + three task-specific functions.
// Uses @google/genai (the current SDK; @google/generative-ai is deprecated).
// Model: gemini-2.5-flash — fast, multimodal, cheap, supports responseSchema.

import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-2.5-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey });
}

// ---------- 1. Vision: pantry photo → structured items ----------

export type IdentifiedItem = {
  name: string;
  category: string;
  qty: number;
  unit: string;
  printedDate: string | null; // ISO date if OCR'd a "best by" / "use by", else null
};

const identifySchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: {
            type: Type.STRING,
            description:
              "One of: leafy_greens, berries, apple, banana, citrus, tomato, avocado, onion, potato, garlic, carrot, bell_pepper, cucumber, broccoli, mushroom, chile_green, dairy_milk, dairy_yogurt, dairy_cheese_hard, dairy_cheese_soft, dairy_butter, eggs, meat_raw_chicken, meat_raw_beef, meat_ground, meat_deli, fish_raw, bread, tortillas, rice_dry, rice_cooked, pasta_dry, pasta_cooked, beans_dry, beans_canned, canned_vegetable, canned_fruit, canned_soup, cereal, flour, sugar, oil_olive, leftovers, unknown",
          },
          qty: { type: Type.NUMBER },
          unit: { type: Type.STRING, description: "each, oz, lb, g, or ml" },
          printedDate: {
            type: Type.STRING,
            nullable: true,
            description: "ISO date (YYYY-MM-DD) if a best-by / use-by date is visible, else null",
          },
        },
        required: ["name", "category", "qty", "unit"],
      },
    },
  },
  required: ["items"],
};

export async function identifyPantryItems(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<IdentifiedItem[]> {
  const ai = client();

  const prompt = `Identify every food item visible in this photo of a pantry, fridge, or groceries.
For each item, return name, category (from the allowed list), quantity, unit, and printedDate if a best-by / use-by / sell-by date is clearly visible.
If uncertain about category, use "unknown". If quantity is unclear, use 1 "each".
Ignore non-food items.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: identifySchema,
    },
  });

  const parsed = JSON.parse(response.text ?? '{"items":[]}');
  return parsed.items as IdentifiedItem[];
}

// ---------- 2. Weekly plan: user meals + pantry → sequenced week + shopping list ----------

export type PantrySnapshot = {
  name: string;
  category: string;
  qty: number;
  unit: string;
  expiryDate: string; // ISO date
};

export type PlannedMealInput = {
  mealName: string;
  servings: number;
};

export type WeeklyPlan = {
  days: {
    dayIndex: number; // 0 = Monday … 6 = Sunday
    mealName: string;
    usesFromPantry: { name: string; qty: number; unit: string }[];
    needsToBuy: { name: string; qty: number; unit: string }[];
  }[];
  shoppingList: { name: string; qty: number; unit: string }[];
};

const planSchema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayIndex: { type: Type.INTEGER },
          mealName: { type: Type.STRING },
          usesFromPantry: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                qty: { type: Type.NUMBER },
                unit: { type: Type.STRING },
              },
              required: ["name", "qty", "unit"],
            },
          },
          needsToBuy: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                qty: { type: Type.NUMBER },
                unit: { type: Type.STRING },
              },
              required: ["name", "qty", "unit"],
            },
          },
        },
        required: ["dayIndex", "mealName", "usesFromPantry", "needsToBuy"],
      },
    },
    shoppingList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          qty: { type: Type.NUMBER },
          unit: { type: Type.STRING },
        },
        required: ["name", "qty", "unit"],
      },
    },
  },
  required: ["days", "shoppingList"],
};

export async function generateWeeklyPlan(
  meals: PlannedMealInput[],
  pantry: PantrySnapshot[]
): Promise<WeeklyPlan> {
  const ai = client();

  const prompt = `You are planning a week of meals (Monday = day 0, Sunday = day 6).

USER'S PLANNED MEALS:
${meals.map((m, i) => `${i + 1}. ${m.mealName} (${m.servings} servings)`).join("\n")}

CURRENT PANTRY (with expiry dates):
${pantry
  .map((p) => `- ${p.name} [${p.category}], ${p.qty} ${p.unit}, expires ${p.expiryDate}`)
  .join("\n")}

TASK:
1. Assign each meal to a day (0–6). Schedule meals that use expiring pantry items on EARLIER days so those items get used before they go bad.
2. For each meal, list the ingredients used from the pantry (usesFromPantry) and the ingredients that need to be bought (needsToBuy).
3. Aggregate everything not covered by the pantry into a single shoppingList at the bottom.

Return strict JSON matching the schema. Don't invent meals the user didn't ask for.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: planSchema,
    },
  });

  return JSON.parse(response.text ?? "{}") as WeeklyPlan;
}

// ---------- 3. Recipe for a single item / ingredient set ----------

export type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  timeMinutes: number;
};

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    timeMinutes: { type: Type.INTEGER },
  },
  required: ["title", "ingredients", "steps", "timeMinutes"],
};

export async function generateRecipe(ingredients: string[]): Promise<Recipe> {
  const ai = client();

  const prompt = `Give me one simple home-cook recipe that uses these ingredients plus common pantry staples (salt, pepper, oil, basic spices):
${ingredients.join(", ")}

Keep it achievable in under 45 minutes for a weeknight dinner. Return strict JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
    },
  });

  return JSON.parse(response.text ?? "{}") as Recipe;
}

// Stable hash for the recipe cache key. Sort so {tomato,basil} == {basil,tomato}.
export function ingredientsHash(ingredients: string[]): string {
  return ingredients
    .map((s) => s.toLowerCase().trim())
    .sort()
    .join("|");
}
```

---

## Usage notes

### `identifyPantryItems(buffer, mimeType)`

Photo → `IdentifiedItem[]`. OCRs printed expiry dates when visible. Falls back to category so the server can look up shelf life.

Server-side usage (in `/api/photo/route.ts`):

```ts
const items = await identifyPantryItems(buffer, file.type);
// for each item: expiry = printedDate ?? (today + shelfLife[category][storage])
```

### `generateWeeklyPlan(meals, pantry)`

User's meals + current pantry → sequenced week + shopping list. The LLM's job is the *sequencing* (expiring stuff first) and the *pantry vs. buy* split. Don't let it invent meals.

**Local swaps are applied in your code, not by the LLM** — after you get the `shoppingList` back, cross-reference each item against the `local_swaps` table (case-insensitive contains match on `genericName`) and attach a `localAlternative` field. Keeps the LLM prompt simple and the swaps deterministic.

### `generateRecipe(ingredients)` + `ingredientsHash(ingredients)`

Cache pattern:

```ts
const hash = ingredientsHash(ingredients);
const cached = await db.select().from(recipesCache).where(eq(recipesCache.ingredientsHash, hash));
if (cached[0]) return JSON.parse(cached[0].recipeJson);
const recipe = await generateRecipe(ingredients);
await db.insert(recipesCache).values({ ingredientsHash: hash, recipeJson: JSON.stringify(recipe) });
return recipe;
```

---

## Demo-day tip

Pre-call every recipe and weekly-plan you'll hit during the pitch the morning of, so they're cached. Cached response = instant. Live API at 3:07 PM Sunday on WESST wifi = roulette.

---

## What's NOT in here (by design)

- API routes (`/api/photo`, `/api/plan`, `/api/recipe`, `/api/donate`)
- UI pages (dashboard, photo upload, weekly plan view)
- `lib/db.ts` — your scaffolding already has it
- Migrations — generated by `npm run db:generate`

Next logical chunks, pick one to build:

1. `/api/photo/route.ts` — file upload → `identifyPantryItems` → expiry lookup → bulk insert
2. `/api/plan/route.ts` — meals in → `generateWeeklyPlan` → attach local swaps → persist
3. `/api/recipe/route.ts` — cached recipe lookup
4. `/api/donate?item_id=X` — server filter against `donation_orgs`
5. Dashboard page + weekly-plan grid UI