import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealsPlanned, localSwaps, pantryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchNearbyLocalOutlets, ABQ_DEFAULT_ZIP } from "@/lib/usda";
import { reconcileShoppingList } from "@/lib/shopping";



type Ingredient = { name: string; qty: number; unit: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const id = parseInt(planId, 10);

  const rows = db
    .select()
    .from(mealsPlanned)
    .where(eq(mealsPlanned.planId, id))
    .orderBy(mealsPlanned.dayIndex, mealsPlanned.mealType)
    .all();

  if (rows.length === 0) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const dayMap = new Map<number, { dayIndex: number; meals: object[] }>();
  const allNeedsToBuy: Ingredient[] = [];

  for (const row of rows) {
    if (!dayMap.has(row.dayIndex)) {
      dayMap.set(row.dayIndex, { dayIndex: row.dayIndex, meals: [] });
    }
    const parsed = row.ingredientsJson ? JSON.parse(row.ingredientsJson) : {};
    const needsToBuy: Ingredient[] = parsed.needs_to_buy ?? [];
    allNeedsToBuy.push(...needsToBuy);

    dayMap.get(row.dayIndex)!.meals.push({
      mealType: row.mealType,
      mealName: row.mealName,
      estimatedCalories: row.estimatedCalories,
      usesFromPantry: parsed.uses_from_pantry ?? [],
      needsToBuy,
    });
  }

  const seen = new Set<string>();
  const dedupedList = allNeedsToBuy.filter((item) => {
    if (seen.has(item.name.toLowerCase())) return false;
    seen.add(item.name.toLowerCase());
    return true;
  });

  const currentPantry = db
    .select({ name: pantryItems.name, qty: pantryItems.qty, unit: pantryItems.unit })
    .from(pantryItems)
    .all();
  const shoppingList = reconcileShoppingList(dedupedList, currentPantry);

  const allSwaps = db.select().from(localSwaps).all();
  const enrichedList = shoppingList.map((item) => {
    const swap = allSwaps.find(
      (s: typeof localSwaps.$inferSelect) =>
        item.name.toLowerCase().includes(s.genericName.toLowerCase()) ||
        s.genericName.toLowerCase().includes(item.name.toLowerCase())
    );
    return swap
      ? {
          ...item,
          localAlternative: {
            localProducer: swap.localProducer,
            product: swap.product,
            whereToBuy: swap.whereToBuy,
          },
        }
      : item;
  });

  const nearbyOutlets = await fetchNearbyLocalOutlets(ABQ_DEFAULT_ZIP);

  return NextResponse.json({
    planId: id,
    weekStart: rows[0].weekStart,
    days: Array.from(dayMap.values()).sort((a, b) => a.dayIndex - b.dayIndex),
    shoppingList: enrichedList,
    nearbyOutlets,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  db.delete(mealsPlanned).where(eq(mealsPlanned.planId, parseInt(planId, 10))).run();
  return NextResponse.json({ ok: true });
}
