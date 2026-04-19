// Single Gemini client + three task-specific functions.
// Uses @google/genai (the current SDK; @google/generative-ai is deprecated).
// Model: gemini-3.1-flash-lite-preview — low-cost multimodal model with higher rate limits.

import { GoogleGenAI, Type } from "@google/genai";

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
  pantry: PantrySnapshot[],
  profileContext = ""
): Promise<WeeklyPlan> {
  const ai = client();

  const prompt = `You are planning a week of meals (Monday = day 0, Sunday = day 6).
${profileContext}
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
  saves: string[]; // subset of input ingredients actually used
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
  },
  required: ["title", "ingredients", "steps", "timeMinutes", "saves"],
};

export async function generateRecipe(ingredients: string[], profileContext = ""): Promise<Recipe> {
  const ai = client();

  const prompt = `Give me one simple home-cook recipe that uses these pantry ingredients plus common staples (salt, pepper, oil, basic spices):
${ingredients.join(", ")}
${profileContext}
Use AS MANY of the listed pantry ingredients as reasonably possible — they're going bad. In the "saves" field, return the exact subset of the input list that the recipe actually consumes (names must match the input strings exactly).

Keep it achievable in under 45 minutes for a weeknight dinner. Respect any dietary restrictions or allergies listed in the user profile above. Return strict JSON.`;

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
