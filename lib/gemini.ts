// Single Gemini client + three task-specific functions.
// Uses @google/genai (the current SDK; @google/generative-ai is deprecated).
// Model: gemini-3.1-flash-lite-preview — low-cost multimodal model with higher rate limits.

import { ApiError, GoogleGenAI, Type } from "@google/genai";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableGeminiError(e: unknown): boolean {
  if (e instanceof ApiError) {
    if (e.status === 503 || e.status === 429) return true;
    const msg = e.message.toLowerCase();
    if (msg.includes("unavailable") || msg.includes("high demand")) return true;
  }
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 500 }: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt < maxAttempts - 1 && isRetryableGeminiError(e)) {
        await sleep(baseDelayMs * 2 ** attempt);
        continue;
      }
      throw e;
    }
  }
  throw new Error("withRetry: unexpected fall-through");
}

const MODEL = "gemini-3.1-flash-lite-preview";

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

  return withRetry(async () => {
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
  }, { maxAttempts: 3, baseDelayMs: 400 });
}

// ---------- 2. Weekly plan: calorie target + pantry → B/L/D for N days ----------

export type PantrySnapshot = {
  name: string;
  category: string;
  qty: number;
  unit: string;
  expiryDate: string; // ISO date
};

export type DayMeal = {
  mealType: "breakfast" | "lunch" | "dinner";
  mealName: string;
  estimatedCalories: number;
  usesFromPantry: { name: string; qty: number; unit: string }[];
  needsToBuy: { name: string; qty: number; unit: string }[];
};

export type WeeklyPlan = {
  days: {
    dayIndex: number; // 0 = Monday … n-1
    meals: DayMeal[];
  }[];
  shoppingList: { name: string; qty: number; unit: string }[];
};

const ingredientItems = {
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
          meals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                mealType: { type: Type.STRING, description: "breakfast, lunch, or dinner" },
                mealName: { type: Type.STRING },
                estimatedCalories: { type: Type.INTEGER },
                usesFromPantry: ingredientItems,
                needsToBuy: ingredientItems,
              },
              required: ["mealType", "mealName", "estimatedCalories", "usesFromPantry", "needsToBuy"],
            },
          },
        },
        required: ["dayIndex", "meals"],
      },
    },
    shoppingList: ingredientItems,
  },
  required: ["days", "shoppingList"],
};

export async function generateWeeklyPlan(
  numDays: number,
  calorieTarget: number,
  pantry: PantrySnapshot[],
  mealIdeas?: string[],
  profileContext = ""
): Promise<WeeklyPlan> {
  const ai = client();

  const ideasSection = mealIdeas && mealIdeas.length > 0
    ? `USER PREFERENCES FOR THIS PLAN (treat as style/constraint hints, not literal meal names unless phrased that way):\n${mealIdeas.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
    : "Generate appropriate meals from scratch based on the pantry and calorie target.";

  const pantrySection = pantry.length > 0
    ? pantry.map((p) => `- ${p.name} [${p.category}], ${p.qty} ${p.unit}, expires ${p.expiryDate}`).join("\n")
    : "No pantry items — all ingredients need to be purchased.";

  const prompt = `You are a meal planner. Plan ${numDays} days of meals (day 0 = Monday, day ${numDays - 1} = the last day).
${profileContext}
TARGET: ~${calorieTarget} calories per day total across breakfast + lunch + dinner.

${ideasSection}

CURRENT PANTRY (with expiry dates):
${pantrySection}

RULES:
1. STRICTLY respect any dietary restrictions and allergies in the USER PROFILE above — every meal must comply. No exceptions.
2. Each day must have exactly 3 meals: breakfast, lunch, dinner.
3. Target ~${calorieTarget} cal/day total (spread sensibly: breakfast ~25%, lunch ~35%, dinner ~40%).
4. Schedule meals that use expiring pantry items on EARLIER days.
5. For each meal, list usesFromPantry and needsToBuy ingredients.
6. PANTRY MATCHING — be aggressive. If the user has "tomatoes" and the recipe calls for "roma tomatoes", treat it as a pantry match, not a purchase. Match across variants, plural/singular, and generic↔specific naming. Never list basic staples (salt, pepper, cooking oil, common dried spices, flour, sugar, water) in needsToBuy if any form of them appears in the pantry.
7. QUANTITY MATH — for any ingredient partially covered by pantry stock, SUBTRACT the pantry quantity from the recipe need. Only put the remaining shortfall in needsToBuy. If the pantry has enough, the item goes in usesFromPantry only, with zero in needsToBuy.
8. Aggregate all needsToBuy across all meals into one shoppingList (deduplicated by name, qty summed per unit).
9. estimatedCalories is per meal, not per day.

Return strict JSON matching the schema.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: planSchema,
      },
    });

    return JSON.parse(response.text ?? "{}") as WeeklyPlan;
  }, { maxAttempts: 3, baseDelayMs: 500 });
}

// ---------- 2b. Fill specific day(s): pantry + calorie target → meals for given dayIndices ----------

const fillDaysSchema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayIndex: { type: Type.INTEGER },
          meals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                mealType: { type: Type.STRING, description: "breakfast, lunch, or dinner" },
                mealName: { type: Type.STRING },
                estimatedCalories: { type: Type.INTEGER },
                usesFromPantry: ingredientItems,
                needsToBuy: ingredientItems,
              },
              required: ["mealType", "mealName", "estimatedCalories", "usesFromPantry", "needsToBuy"],
            },
          },
        },
        required: ["dayIndex", "meals"],
      },
    },
  },
  required: ["days"],
};

export async function generateMealsForDays(
  dayIndices: number[],
  calorieTarget: number,
  pantry: PantrySnapshot[],
  existingMealNames: string[] = [],
  profileContext = ""
): Promise<{ dayIndex: number; meals: DayMeal[] }[]> {
  const ai = client();

  const pantrySection = pantry.length > 0
    ? pantry.map((p) => `- ${p.name} [${p.category}], ${p.qty} ${p.unit}, expires ${p.expiryDate}`).join("\n")
    : "No pantry items — all ingredients need to be purchased.";

  const avoidSection = existingMealNames.length > 0
    ? `ALREADY-PLANNED MEALS THIS WEEK (don't repeat these exactly):\n${existingMealNames.map((m) => `- ${m}`).join("\n")}`
    : "";

  const dayList = dayIndices.map((i) => `day ${i}`).join(", ");

  const prompt = `You are a meal planner. Plan breakfast, lunch, and dinner for ONLY these specific days: ${dayList} (day 0 = Monday ... day 6 = Sunday).
${profileContext}
TARGET: ~${calorieTarget} calories per day total across breakfast + lunch + dinner.

${avoidSection}

CURRENT PANTRY (with expiry dates):
${pantrySection}

RULES:
1. STRICTLY respect dietary restrictions and allergies in the USER PROFILE above.
2. Return exactly one entry per requested dayIndex (${dayIndices.join(", ")}). No other dayIndices.
3. Each day has 3 meals: breakfast, lunch, dinner.
4. Target ~${calorieTarget} cal/day total (breakfast ~25%, lunch ~35%, dinner ~40%).
5. PANTRY MATCHING: match variants and plurals aggressively. Never list basic staples as needsToBuy if present.
6. QUANTITY MATH: subtract pantry qty from recipe qty before putting anything in needsToBuy.
7. estimatedCalories is per meal.

Return strict JSON matching the schema.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: fillDaysSchema,
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as { days: { dayIndex: number; meals: DayMeal[] }[] };
    return parsed.days ?? [];
  }, { maxAttempts: 3, baseDelayMs: 400 });
}

// ---------- 3. Recipe for a single item / ingredient set ----------

export type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
  timeMinutes: number;
  saves: string[]; // subset of input ingredients actually used
  caloriesMin?: number; // rough per-serving estimate
  caloriesMax?: number;
};

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    steps: { type: Type.ARRAY, items: { type: Type.STRING } },
    timeMinutes: { type: Type.INTEGER },
    saves: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Subset of the input pantry ingredients that this recipe actually consumes. Names must match the input list exactly.",
    },
    caloriesMin: {
      type: Type.INTEGER,
      description: "Low end of estimated calories per serving (rough estimate, ±30%).",
    },
    caloriesMax: {
      type: Type.INTEGER,
      description: "High end of estimated calories per serving (rough estimate, ±30%).",
    },
  },
  required: ["title", "ingredients", "steps", "timeMinutes", "saves"],
};

export async function generateRecipe(ingredients: string[], profileContext = ""): Promise<Recipe> {
  const ai = client();

  const prompt = `Give me one simple home-cook recipe that uses these pantry ingredients plus common staples (salt, pepper, oil, basic spices):
${ingredients.join(", ")}
${profileContext}
Use AS MANY of the listed pantry ingredients as reasonably possible — they're going bad. In the "saves" field, return the exact subset of the input list that the recipe actually consumes (names must match the input strings exactly).

Keep it achievable in under 45 minutes for a weeknight dinner. Respect any dietary restrictions or allergies listed in the user profile above.
Also estimate a rough per-serving calorie range (caloriesMin / caloriesMax). These are approximations — give a realistic spread of ~100–150 cal to signal the uncertainty. Return strict JSON.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      },
    });

    return JSON.parse(response.text ?? "{}") as Recipe;
  }, { maxAttempts: 5, baseDelayMs: 600 });
}

// Stable hash for the recipe cache key. Sort so {tomato,basil} == {basil,tomato}.
export function ingredientsHash(ingredients: string[]): string {
  return ingredients
    .map((s) => s.toLowerCase().trim())
    .sort()
    .join("|");
}
