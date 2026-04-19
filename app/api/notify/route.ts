import { NextResponse } from "next/server";
import { db, ensureSqliteSchema } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  ensureSqliteSchema();
  try {
    const items = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
    const now = Date.now();
    const dying = items.filter(i => {
      const expiry = i.expiryDate instanceof Date
        ? i.expiryDate.getTime()
        : (i.expiryDate as unknown as number) * 1000;
      const days = Math.floor((expiry - now) / 86_400_000);
      return days <= 2 && days >= 0;
    });
    return NextResponse.json({
      dyingCount: dying.length,
      names: dying.slice(0, 4).map(i => i.name),
    });
  } catch {
    return NextResponse.json({ dyingCount: 0, names: [] });
  }
}
