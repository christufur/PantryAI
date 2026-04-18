import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipesCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateRecipe, ingredientsHash } from "@/lib/gemini";

export async function GET(request: NextRequest) {
  const ingredients = (request.nextUrl.searchParams.get("ingredients") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "No ingredients provided" }, { status: 400 });
  }

  const hash = ingredientsHash(ingredients);
  const cached = db.select().from(recipesCache).where(eq(recipesCache.ingredientsHash, hash)).get();

  if (cached) {
    return NextResponse.json(JSON.parse(cached.recipeJson));
  }

  const recipe = await generateRecipe(ingredients);

  db.insert(recipesCache)
    .values({
      ingredientsHash: hash,
      recipeJson: JSON.stringify(recipe),
    })
    .run();

  return NextResponse.json(recipe);
}
