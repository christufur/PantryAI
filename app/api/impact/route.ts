import { NextResponse } from "next/server";
import { db, ensureSqliteSchema } from "@/lib/db";
import { impactEvents } from "@/db/schema";
import { computeImpact } from "@/lib/impact";

export async function GET() {
  ensureSqliteSchema();
  try {
    const events = db.select().from(impactEvents).all();
    const totals = computeImpact(events.map(e => ({
      category: e.category,
      qty: e.qty,
      unit: e.unit,
    })));
    return NextResponse.json(totals);
  } catch {
    return NextResponse.json({ itemsRescued: 0, dollarsSaved: 0, lbsSaved: 0, co2Lbs: 0, gallonsSaved: 0 });
  }
}
