import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealsPlanned } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { planId, dayIndex, mealType, mealName } = await req.json();

  // Grab weekStart from an existing row in the same plan
  const existing = db
    .select({ weekStart: mealsPlanned.weekStart })
    .from(mealsPlanned)
    .where(eq(mealsPlanned.planId, planId))
    .limit(1)
    .get();

  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  db.insert(mealsPlanned).values({
    planId,
    weekStart: existing.weekStart,
    dayIndex,
    mealType,
    mealName,
    servings: 2,
  }).run();

  return NextResponse.json({ ok: true });
}
