import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipesCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_GREETING =
  "Fridgey online. I've been watching your food. Some of it needs attention. What do you want to know?";

export async function GET() {
  try {
    const cached = db
      .select()
      .from(recipesCache)
      .where(eq(recipesCache.ingredientsHash, "__fridgey_roast__"))
      .get();
    if (cached) {
      const { reply } = JSON.parse(cached.recipeJson) as { reply: string };
      if (reply) return NextResponse.json({ reply });
    }
  } catch {}
  return NextResponse.json({ reply: DEFAULT_GREETING });
}
