import { NextRequest, NextResponse } from "next/server";
import { db, ensureSqliteSchema } from "@/lib/db";
import { pantryItems, shelfLife } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const VALID_STORAGE: ReadonlySet<string> = new Set(["fridge", "freezer", "pantry"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureSqliteSchema();
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { qty?: number; unit?: string; storageLocation?: string; expiryDate?: string; isLocal?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.qty !== undefined) updates.qty = Number(body.qty);
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.expiryDate !== undefined) updates.expiryDate = new Date(body.expiryDate);
  if (body.isLocal !== undefined) updates.isLocal = Boolean(body.isLocal);

  if (body.storageLocation !== undefined) {
    const loc = body.storageLocation;
    if (!VALID_STORAGE.has(loc)) {
      return NextResponse.json({ error: "Invalid storageLocation" }, { status: 400 });
    }
    updates.storageLocation = loc;
    // If no explicit expiryDate, recalculate from shelf-life for the new location
    if (body.expiryDate === undefined) {
      const row = db.select().from(pantryItems).where(eq(pantryItems.id, itemId)).get();
      if (row) {
        const shelfRow = db
          .select()
          .from(shelfLife)
          .where(and(eq(shelfLife.category, row.category), eq(shelfLife.storageLocation, loc)))
          .get();
        updates.expiryDate = new Date(Date.now() + (shelfRow?.days ?? 7) * 86_400_000);
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const result = db.update(pantryItems).set(updates).where(eq(pantryItems.id, itemId)).run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...("expiryDate" in updates && { expiryDate: (updates.expiryDate as Date).toISOString() }) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = db.delete(pantryItems).where(eq(pantryItems.id, itemId)).run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
