import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealsPlanned, pantryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateMealsForDays, type PantrySnapshot } from "@/lib/gemini";
import { loadProfile, profilePromptContext } from "@/lib/profile";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const id = parseInt(planId, 10);
  const { dayIndices } = (await req.json()) as { dayIndices: number[] };

  if (!Array.isArray(dayIndices) || dayIndices.length === 0) {
    return NextResponse.json({ error: "dayIndices required" }, { status: 400 });
  }

  const existingRows = db.select().from(mealsPlanned).where(eq(mealsPlanned.planId, id)).all();
  if (existingRows.length === 0) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const weekStart = existingRows[0].weekStart;

  // Derive calorie target from an existing fully-planned day (sum of 3 meals).
  const caloriesByDay = new Map<number, number>();
  for (const row of existingRows) {
    if (row.estimatedCalories) {
      caloriesByDay.set(row.dayIndex, (caloriesByDay.get(row.dayIndex) ?? 0) + row.estimatedCalories);
    }
  }
  const dayTotals = [...caloriesByDay.values()].filter((v) => v > 0);
  const calorieTarget = dayTotals.length > 0
    ? Math.round(dayTotals.reduce((a, b) => a + b, 0) / dayTotals.length)
    : 2000;

  const existingMealNames = existingRows.map((r) => r.mealName);

  const pantry: PantrySnapshot[] = db
    .select()
    .from(pantryItems)
    .all()
    .map((item: typeof pantryItems.$inferSelect) => ({
      name: item.name,
      category: item.category,
      qty: item.qty,
      unit: item.unit,
      expiryDate:
        item.expiryDate instanceof Date
          ? item.expiryDate.toISOString().split("T")[0]
          : new Date((item.expiryDate as unknown as number) * 1000).toISOString().split("T")[0],
    }));

  const profileCtx = profilePromptContext(loadProfile());

  const days = await generateMealsForDays(dayIndices, calorieTarget, pantry, existingMealNames, profileCtx);

  for (const day of days) {
    if (!dayIndices.includes(day.dayIndex)) continue;
    for (const meal of day.meals) {
      db.insert(mealsPlanned).values({
        planId: id,
        weekStart,
        dayIndex: day.dayIndex,
        mealType: meal.mealType,
        mealName: meal.mealName,
        estimatedCalories: meal.estimatedCalories,
        servings: 2,
        ingredientsJson: JSON.stringify({
          uses_from_pantry: meal.usesFromPantry,
          needs_to_buy: meal.needsToBuy,
        }),
      }).run();
    }
  }

  return NextResponse.json({ ok: true, filledDays: days.map((d) => d.dayIndex) });
}
