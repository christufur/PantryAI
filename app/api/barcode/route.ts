import { NextRequest, NextResponse } from "next/server";
import { db, ensureSqliteSchema, sqliteMissingTableHint } from "@/lib/db";
import { pantryItems, shelfLife } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { fetchOpenFoodFactsProduct } from "@/lib/openfoodfacts";
import { type StorageLocation, VALID_LOCATIONS } from "@/lib/storage";

export const runtime = "nodejs";

function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

export async function POST(request: NextRequest) {
  ensureSqliteSchema();

  let body: { barcode?: unknown; storageLocation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const barcode = typeof body.barcode === "string" ? normalizeBarcode(body.barcode) : null;
  if (!barcode) {
    return NextResponse.json(
      { error: "Provide an 8–14 digit barcode (EAN/UPC)." },
      { status: 400 }
    );
  }

  const rawLocation = body.storageLocation;
  const storageLocation: StorageLocation =
    typeof rawLocation === "string" && VALID_LOCATIONS.has(rawLocation as StorageLocation)
      ? (rawLocation as StorageLocation)
      : "fridge";

  const product = await fetchOpenFoodFactsProduct(barcode);
  if (!product) {
    return NextResponse.json(
      { error: "Product not found in Open Food Facts. Try a photo add or another code." },
      { status: 404 }
    );
  }

  try {
    const shelfRow = db
      .select()
      .from(shelfLife)
      .where(
        and(eq(shelfLife.category, product.category), eq(shelfLife.storageLocation, storageLocation))
      )
      .get();

    const shelfDays = shelfRow?.days ?? 7;
    const expiryDate = new Date(Date.now() + shelfDays * 86400000);

    const result = db
      .insert(pantryItems)
      .values({
        name: product.name,
        category: product.category,
        qty: product.qty,
        unit: product.unit,
        storageLocation,
        expiryDate,
      })
      .run();

    const inserted = {
      id: Number(result.lastInsertRowid),
      name: product.name,
      category: product.category,
      qty: product.qty,
      unit: product.unit,
      storageLocation,
      expiryDate: expiryDate.toISOString(),
    };

    return NextResponse.json({ items: [inserted], source: "openfoodfacts", barcode });
  } catch (e) {
    if (sqliteMissingTableHint(e)) {
      return NextResponse.json(
        {
          error: "The pantry database is not initialized.",
          hint: "Stop the dev server, run from project root: npm run db:seed (optional data). If this persists: rm sqlite.db && restart npm run dev (schema is auto-created from db/migrations/0000_*.sql).",
        },
        { status: 500 }
      );
    }
    throw e;
  }
}
