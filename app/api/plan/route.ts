import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pantryItems, localSwaps, mealsPlanned } from "@/db/schema";
import { generateWeeklyPlan, type PantrySnapshot } from "@/lib/gemini";
import { fetchNearbyLocalOutlets } from "@/lib/usda";

// TODO: user-configurable zip in later pass
const DEFAULT_ZIP = "87102";

export async function POST(request: NextRequest) {
  const { meals, weekStart } = await request.json();

  const pantry: PantrySnapshot[] = db
    .select()
    .from(pantryItems)
    .all()
    .map((item) => ({
      name: item.name,
      category: item.category,
      qty: item.qty,
      unit: item.unit,
      expiryDate:
        item.expiryDate instanceof Date
          ? item.expiryDate.toISOString().split("T")[0]
          : new Date(item.expiryDate * 1000).toISOString().split("T")[0],
    }));

  // Run plan generation and outlets fetch in parallel
  const [plan, nearbyOutlets] = await Promise.all([
    generateWeeklyPlan(meals, pantry),
    fetchNearbyLocalOutlets(DEFAULT_ZIP),
  ]);

  const allSwaps = db.select().from(localSwaps).all();

  const enrichedList = plan.shoppingList.map((item) => {
    const swap = allSwaps.find(
      (s) =>
        item.name.toLowerCase().includes(s.genericName.toLowerCase()) ||
        s.genericName.toLowerCase().includes(item.name.toLowerCase())
    );
    return swap ? { ...item, localAlternative: swap } : item;
  });

  const weekStartTs = new Date(weekStart);

  for (const day of plan.days) {
    db.insert(mealsPlanned)
      .values({
        weekStart: weekStartTs,
        dayIndex: day.dayIndex,
        mealName: day.mealName,
        ingredientsJson: JSON.stringify({
          uses_from_pantry: day.usesFromPantry,
          needs_to_buy: day.needsToBuy,
        }),
      })
      .run();
  }

  return NextResponse.json({ ...plan, shoppingList: enrichedList, nearbyOutlets });
}
