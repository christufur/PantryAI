import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pantryItems, donationOrgs } from "@/db/schema";
import { eq } from "drizzle-orm";

const NON_PERISHABLE_CATEGORIES = new Set([
  "rice_dry",
  "pasta_dry",
  "beans_dry",
  "beans_canned",
  "canned_vegetable",
  "canned_fruit",
  "canned_soup",
  "cereal",
  "flour",
  "sugar",
  "oil_olive",
]);

export async function GET(request: NextRequest) {
  const itemId = request.nextUrl.searchParams.get("item_id");

  if (!itemId) {
    return NextResponse.json(db.select().from(donationOrgs).all());
  }

  const item = db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.id, Number(itemId)))
    .get();

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const isPerishable = !NON_PERISHABLE_CATEGORIES.has(item.category);
  const orgs = db.select().from(donationOrgs).all();

  const filtered = isPerishable
    ? orgs.filter((o) => o.acceptsPerishable)
    : orgs.filter((o) => !o.name.includes("Compost"));

  return NextResponse.json({ item, orgs: filtered, isPerishable });
}
