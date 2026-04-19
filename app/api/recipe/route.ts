import { ApiError } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipesCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GEMINI_MODEL_RESPONSE_HEADER, generateRecipe, ingredientsHash } from "@/lib/gemini";
import { computeBuyLocal } from "@/lib/recipe-buy-local";
import { loadProfile, profilePromptContext, profileHash } from "@/lib/profile";
import type { Recipe } from "@/lib/gemini";

export async function GET(request: NextRequest) {
  const ingredients = (request.nextUrl.searchParams.get("ingredients") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "No ingredients provided" }, { status: 400 });
  }

  const profile = loadProfile();
  const pHash = profileHash(profile);
  const hash = ingredientsHash(ingredients) + (pHash ? `:${pHash}` : "");
  const bust = request.nextUrl.searchParams.get("bust") === "1";

  try {
    let recipe: Recipe | undefined;

    if (!bust) {
      const cached = db.select().from(recipesCache).where(eq(recipesCache.ingredientsHash, hash)).get();
      if (cached) recipe = JSON.parse(cached.recipeJson) as Recipe;
    }

    if (!recipe) {
      recipe = await generateRecipe(ingredients, profilePromptContext(profile));
      db.insert(recipesCache)
        .values({ ingredientsHash: hash, recipeJson: JSON.stringify(recipe) })
        .onConflictDoUpdate({ target: recipesCache.ingredientsHash, set: { recipeJson: JSON.stringify(recipe) } })
        .run();
    }

    const savedItems: string[] = recipe.saves ?? ingredients.slice(0, 3);
    const buyLocal = computeBuyLocal(savedItems);

    const headers =
      recipe.geminiModel != null
        ? { [GEMINI_MODEL_RESPONSE_HEADER]: recipe.geminiModel }
        : undefined;
    return NextResponse.json({ ...recipe, buyLocal }, headers ? { headers } : undefined);
  } catch (e) {
    const message =
      e instanceof ApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Recipe generation failed";
    const status = e instanceof ApiError && e.status ? e.status : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
