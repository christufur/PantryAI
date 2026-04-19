import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pantryItems, localSwaps, mealsPlanned } from "@/db/schema";
import { generateWeeklyPlan, type PantrySnapshot } from "@/lib/gemini";
import { desc, sql } from "drizzle-orm";
import { fetchNearbyLocalOutlets } from "@/lib/usda";

const DEFAULT_ZIP = "87102";

export async function POST(request: NextRequest) {
  const { numDays, calorieTarget, weekStart, mealIdeas } = await request.json();

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

  const [plan, nearbyOutlets] = await Promise.all([
    generateWeeklyPlan(numDays ?? 7, calorieTarget ?? 2000, pantry, mealIdeas ?? []),
    fetchNearbyLocalOutlets(DEFAULT_ZIP),
  ]);

  const allSwaps = db.select().from(localSwaps).all();

  const enrichedList = plan.shoppingList.map((item: { name: string; qty: number; unit: string }) => {
    const swap = allSwaps.find(
      (s: typeof localSwaps.$inferSelect) =>
        item.name.toLowerCase().includes(s.genericName.toLowerCase()) ||
        s.genericName.toLowerCase().includes(item.name.toLowerCase())
    );
    return swap
      ? { ...item, localAlternative: { localProducer: swap.localProducer, product: swap.product, whereToBuy: swap.whereToBuy } }
      : item;
  });

  const planId = Date.now();
  const weekStartTs = new Date(weekStart);

  for (const day of plan.days) {
    for (const meal of day.meals) {
      db.insert(mealsPlanned)
        .values({
          planId,
          weekStart: weekStartTs,
          dayIndex: day.dayIndex,
          mealType: meal.mealType,
          mealName: meal.mealName,
          estimatedCalories: meal.estimatedCalories,
          servings: 2,
          ingredientsJson: JSON.stringify({
            uses_from_pantry: meal.usesFromPantry,
            needs_to_buy: meal.needsToBuy,
          }),
        })
        .run();
    }
  }

  return NextResponse.json({ planId, ...plan, shoppingList: enrichedList, nearbyOutlets });
}

export async function GET() {
  const rows = db
    .select({
      planId: mealsPlanned.planId,
      weekStart: mealsPlanned.weekStart,
      mealCount: sql<number>`count(*)`,
    })
    .from(mealsPlanned)
    .groupBy(mealsPlanned.planId)
    .orderBy(desc(mealsPlanned.planId))
    .all();

  return NextResponse.json(rows);
}
