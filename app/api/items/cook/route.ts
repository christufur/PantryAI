import { NextRequest, NextResponse } from "next/server";
import { db, ensureSqliteSchema } from "@/lib/db";
import { pantryItems, impactEvents } from "@/db/schema";
import { inArray } from "drizzle-orm";

// POST { names: string[] }
// Deletes pantry items matching the given names (case-insensitive) and records
// impact events for any that haven't expired yet.
export async function POST(req: NextRequest) {
  ensureSqliteSchema();
  let names: string[];
  try {
    const body = await req.json() as { names?: unknown };
    if (!Array.isArray(body.names) || body.names.length === 0) {
      return NextResponse.json({ error: "names must be a non-empty array" }, { status: 400 });
    }
    names = (body.names as unknown[]).map(String);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lower = names.map((n) => n.toLowerCase());
  const all = db.select().from(pantryItems).all();
  const matches = all.filter((item) => lower.includes(item.name.toLowerCase()));

  if (matches.length === 0) {
    return NextResponse.json({ cooked: 0 });
  }

  const now = new Date();
  for (const item of matches) {
    const expiry =
      item.expiryDate instanceof Date
        ? item.expiryDate
        : new Date((item.expiryDate as unknown as number) * 1000);
    if (now < expiry) {
      db.insert(impactEvents)
        .values({ itemName: item.name, category: item.category, qty: item.qty, unit: item.unit })
        .run();
    }
  }

  db.delete(pantryItems)
    .where(inArray(pantryItems.id, matches.map((i) => i.id)))
    .run();

  return NextResponse.json({ cooked: matches.length });
}
