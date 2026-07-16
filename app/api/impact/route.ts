import { NextResponse } from "next/server";
import { db, ensureSqliteSchema } from "@/lib/db";
import { impactEvents } from "@/db/schema";
import { computeImpact } from "@/lib/impact";

export async function GET() {
  ensureSqliteSchema();
  const events = db.select().from(impactEvents).all();
  const totals = computeImpact(events.map(e => ({
    category: e.category,
    qty: e.qty,
    unit: e.unit,
  })));
  return NextResponse.json(totals);
}
