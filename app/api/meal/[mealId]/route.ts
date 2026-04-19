import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mealsPlanned } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  const { mealId } = await params;
  db.delete(mealsPlanned).where(eq(mealsPlanned.id, parseInt(mealId, 10))).run();
  return NextResponse.json({ ok: true });
}
