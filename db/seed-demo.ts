// Demo pantry seeder. Run with: `npm run db:seed:demo`
// Wipes pantry_items + impact_events, inserts a realistic spread of items with
// staggered expiries, pre-caches the recipe for dying items, and pre-generates
// a Fridgey roast — so the demo is instant end-to-end.

import { db } from "@/lib/db";
import { pantryItems, impactEvents, recipesCache } from "@/db/schema";
import { GoogleGenAI } from "@google/genai";
import { generateRecipe, ingredientsHash } from "@/lib/gemini";
import { DEFAULT_PROFILE, profileHash, profilePromptContext } from "@/lib/profile";

const day = 86_400_000;
const now = Date.now();
const inDays = (n: number) => new Date(now + n * day);

type DemoItem = {
  name: string;
  category: string;
  qty: number;
  unit: string;
  storageLocation: "fridge" | "freezer" | "pantry";
  expiryDate: Date;
  isLocal?: boolean;
};

// Mix: a few EXPIRED, several DYING (≤3d), a chunk fresh, a few long-shelf.
const demoItems: DemoItem[] = [
  // Expired (urgency theatre)
  { name: "Spinach", category: "leafy_greens", qty: 1, unit: "each", storageLocation: "fridge", expiryDate: inDays(-2) },

  // Dying (≤3 days) — the headline of the demo
  { name: "Strawberries", category: "berries", qty: 1, unit: "lb", storageLocation: "fridge", expiryDate: inDays(1) },
  { name: "Whole Milk", category: "dairy_milk", qty: 1, unit: "each", storageLocation: "fridge", expiryDate: inDays(2), isLocal: true },
  { name: "Ground Beef", category: "meat_ground", qty: 1, unit: "lb", storageLocation: "fridge", expiryDate: inDays(1) },
  { name: "Roma Tomatoes", category: "tomato", qty: 4, unit: "each", storageLocation: "fridge", expiryDate: inDays(3), isLocal: true },
  { name: "Hatch Green Chile", category: "chile_green", qty: 6, unit: "each", storageLocation: "fridge", expiryDate: inDays(3), isLocal: true },

  // Fresh (1–2 weeks)
  { name: "Eggs", category: "eggs", qty: 12, unit: "each", storageLocation: "fridge", expiryDate: inDays(14), isLocal: true },
  { name: "Cheddar", category: "dairy_cheese_hard", qty: 8, unit: "oz", storageLocation: "fridge", expiryDate: inDays(21) },
  { name: "Carrots", category: "carrot", qty: 1, unit: "lb", storageLocation: "fridge", expiryDate: inDays(10) },
  { name: "Bell Peppers", category: "bell_pepper", qty: 3, unit: "each", storageLocation: "fridge", expiryDate: inDays(7) },
  { name: "Bueno Flour Tortillas", category: "tortillas", qty: 1, unit: "each", storageLocation: "fridge", expiryDate: inDays(10), isLocal: true },

  // Long shelf (pantry staples)
  { name: "Bolita Beans", category: "beans_dry", qty: 1, unit: "lb", storageLocation: "pantry", expiryDate: inDays(365), isLocal: true },
  { name: "White Rice", category: "rice_dry", qty: 2, unit: "lb", storageLocation: "pantry", expiryDate: inDays(540) },
  { name: "Olive Oil", category: "oil_olive", qty: 1, unit: "each", storageLocation: "pantry", expiryDate: inDays(400) },
  { name: "Black Beans (canned)", category: "beans_canned", qty: 2, unit: "each", storageLocation: "pantry", expiryDate: inDays(800) },
];

async function main() {
  console.log("Wiping pantry_items and impact_events…");
  await db.delete(pantryItems);
  await db.delete(impactEvents);

  console.log(`Inserting ${demoItems.length} demo pantry items…`);
  await db.insert(pantryItems).values(
    demoItems.map((i) => ({
      name: i.name,
      category: i.category,
      qty: i.qty,
      unit: i.unit,
      storageLocation: i.storageLocation,
      expiryDate: i.expiryDate,
      isLocal: i.isLocal ?? false,
    }))
  );

  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — skipping recipe + roast cache warm-up.");
    console.log("Demo pantry ready (no cache).");
    return;
  }

  // --- Pre-cache recipe for dying / expired items ---
  const dyingItems = demoItems.filter((i) => {
    const days = Math.floor((i.expiryDate.getTime() - now) / day);
    return days <= 3;
  });
  const dyingNames = dyingItems.map((i) => i.name);

  console.log(`Pre-caching recipe for: ${dyingNames.join(", ")}`);
  const profile = DEFAULT_PROFILE;
  const pHash = profileHash(profile);
  const recipeHash = ingredientsHash(dyingNames) + (pHash ? `:${pHash}` : "");

  try {
    const recipe = await generateRecipe(dyingNames, profilePromptContext(profile));
    db.insert(recipesCache)
      .values({ ingredientsHash: recipeHash, recipeJson: JSON.stringify(recipe) })
      .onConflictDoUpdate({ target: recipesCache.ingredientsHash, set: { recipeJson: JSON.stringify(recipe) } })
      .run();
    console.log(`Recipe cached: "${recipe.title}"`);
  } catch (err) {
    console.error("Recipe cache warm-up failed:", err);
  }

  // --- Pre-generate Fridgey roast and cache it ---
  console.log("Generating Fridgey roast…");
  const pantryContext = demoItems
    .slice()
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    .map((item) => {
      const days = Math.floor((item.expiryDate.getTime() - now) / day);
      const status =
        days < 0 ? "EXPIRED" : days <= 3 ? `DYING (${days}d left)` : `${days}d left`;
      return `- ${item.name}: ${item.qty} ${item.unit}, ${item.storageLocation}, ${status}`;
    })
    .join("\n");

  const systemPrompt = `You are Fridgey — a self-aware refrigerator with a dry, slightly cold wit. You've been watching everything inside you for days and you have opinions. You know every item in the fridge and pantry, their expiry status, and you're mildly (but affectionately) judgmental when things are about to go bad.

Personality: sardonic but warm. Like a fridge that's seen too much but still wants to help. Never mean — just honest. You can make the occasional cold/chill/ice pun but don't overdo it.

Keep replies SHORT — 2–3 sentences max unless giving a recipe. When giving a recipe: dish name, numbered steps (max 8 words each), then "Saves: [items]".

Always prioritize DYING items (≤3 days) when suggesting what to cook. If something expired, you can gently roast the user about it.
${profilePromptContext(profile)}
Current contents:
${pantryContext}`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: "Roast my pantry." }] }],
      config: { systemInstruction: systemPrompt },
    });
    const roast = response.text ?? "I've seen better fridges. Honestly.";
    db.insert(recipesCache)
      .values({ ingredientsHash: "__fridgey_roast__", recipeJson: JSON.stringify({ reply: roast }) })
      .onConflictDoUpdate({
        target: recipesCache.ingredientsHash,
        set: { recipeJson: JSON.stringify({ reply: roast }) },
      })
      .run();
    console.log(`Fridgey roast cached: "${roast.slice(0, 80)}…"`);
  } catch (err) {
    console.error("Fridgey roast generation failed:", err);
  }

  console.log("Demo seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
