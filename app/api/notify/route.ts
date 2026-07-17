import { NextResponse } from "next/server";
import { db, ensureSqliteSchema } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  ensureSqliteSchema();
  const items = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
  const now = Date.now();
  const expiring = items.filter(i => {
    const expiry = i.expiryDate instanceof Date
      ? i.expiryDate.getTime()
      : (i.expiryDate as unknown as number) * 1000;
    const days = Math.floor((expiry - now) / 86_400_000);
    return days <= 2 && days >= 0;
  });
  return NextResponse.json({
    expiringCount: expiring.length,
    names: expiring.slice(0, 4).map(i => i.name),
  });
}
