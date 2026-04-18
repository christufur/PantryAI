import { NextRequest, NextResponse } from "next/server";
import { db, ensureSqliteSchema } from "@/lib/db";
import { pantryItems, shelfLife } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const VALID_STORAGE: ReadonlySet<string> = new Set(["fridge", "freezer", "pantry"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureSqliteSchema();
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const loc =
    typeof body === "object" &&
    body !== null &&
    "storageLocation" in body &&
    typeof (body as { storageLocation: unknown }).storageLocation === "string"
      ? (body as { storageLocation: string }).storageLocation
      : null;

  if (!loc || !VALID_STORAGE.has(loc)) {
    return NextResponse.json({ error: "Invalid storageLocation" }, { status: 400 });
  }

  const row = db.select().from(pantryItems).where(eq(pantryItems.id, itemId)).get();
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shelfRow = db
    .select()
    .from(shelfLife)
    .where(and(eq(shelfLife.category, row.category), eq(shelfLife.storageLocation, loc)))
    .get();
  const shelfDays = shelfRow?.days ?? 7;
  const expiryDate = new Date(Date.now() + shelfDays * 86_400_000);

  db.update(pantryItems)
    .set({ storageLocation: loc, expiryDate })
    .where(eq(pantryItems.id, itemId))
    .run();

  return NextResponse.json({
    ok: true,
    storageLocation: loc,
    expiryDate: expiryDate.toISOString(),
  });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body: { qty?: number; unit?: string; storageLocation?: string; expiryDate?: string } =
    await req.json();

  const updates = {
    ...(body.qty !== undefined && { qty: Number(body.qty) }),
    ...(body.unit !== undefined && { unit: body.unit }),
    ...(body.storageLocation !== undefined && { storageLocation: body.storageLocation }),
    ...(body.expiryDate !== undefined && { expiryDate: new Date(body.expiryDate) }),
  };

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const result = db.update(pantryItems).set(updates).where(eq(pantryItems.id, itemId)).run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
