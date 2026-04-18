import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { eq } from "drizzle-orm";

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
