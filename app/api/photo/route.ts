import { NextRequest, NextResponse } from "next/server";
import { db, ensureSqliteSchema, getSqlitePath } from "@/lib/db";
import { pantryItems, shelfLife, localSwaps } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { identifyPantryItems } from "@/lib/gemini";

export const runtime = "nodejs";

type StorageLocation = "fridge" | "freezer" | "pantry";

function sqliteMissingTableHint(e: unknown): boolean {
  return e instanceof Error && e.message.includes("no such table");
}

const VALID_LOCATIONS: ReadonlySet<StorageLocation> = new Set([
  "fridge",
  "freezer",
  "pantry",
]);

// Fallback when the user doesn't specify (e.g. if the form field is dropped).
function inferStorageLocation(category: string): StorageLocation {
  if (/rice_dry|pasta_dry|beans_dry|beans_canned|canned_|cereal|flour|sugar|oil_/.test(category))
    return "pantry";
  return "fridge";
}

export async function POST(request: NextRequest) {
  ensureSqliteSchema();
  const form = await request.formData();
  const file = form.get("file") as File | null;
  const rawLocation = form.get("storageLocation");
  const userLocation =
    typeof rawLocation === "string" && VALID_LOCATIONS.has(rawLocation as StorageLocation)
      ? (rawLocation as StorageLocation)
      : null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const identified = await identifyPantryItems(buffer, file.type);

  try {
    // Pre-fetch for matching (avoids N+1 queries in the loop)
    const allSwaps = db.select().from(localSwaps).all();
    const existingItems = db
      .select({ id: pantryItems.id, name: pantryItems.name, qty: pantryItems.qty, expiryDate: pantryItems.expiryDate })
      .from(pantryItems)
      .all();

    const inserted = [];

    for (const item of identified) {
      const storageLocation: StorageLocation =
        userLocation ?? inferStorageLocation(item.category);

      const itemNameLower = item.name.toLowerCase();

      // Match against NM local producer list (contains check both ways)
      const matchedSwap = allSwaps.find(
        (s) =>
          itemNameLower.includes(s.genericName.toLowerCase()) ||
          s.genericName.toLowerCase().includes(itemNameLower)
      );

      // Deduplicate: if an item with the same name already exists, increment qty
      const duplicate = existingItems.find((e) => e.name.toLowerCase() === itemNameLower);

      if (duplicate) {
        const newQty = duplicate.qty + item.qty;
        db.update(pantryItems).set({ qty: newQty }).where(eq(pantryItems.id, duplicate.id)).run();
        const expiry =
          duplicate.expiryDate instanceof Date
            ? duplicate.expiryDate
            : new Date((duplicate.expiryDate as number) * 1000);
        inserted.push({
          id: duplicate.id,
          name: item.name,
          category: item.category,
          qty: newQty,
          unit: item.unit,
          storageLocation,
          expiryDate: expiry.toISOString(),
        });
        continue;
      }

      let expiryDate: Date;
      if (item.printedDate) {
        expiryDate = new Date(item.printedDate);
      } else {
        const shelfRow = db
          .select()
          .from(shelfLife)
          .where(
            and(
              eq(shelfLife.category, item.category),
              eq(shelfLife.storageLocation, storageLocation)
            )
          )
          .get();

        const shelfDays = shelfRow?.days ?? 7;
        expiryDate = new Date(Date.now() + shelfDays * 86400000);
      }

      const result = db
        .insert(pantryItems)
        .values({
          name: item.name,
          category: item.category,
          qty: item.qty,
          unit: item.unit,
          storageLocation,
          expiryDate,
          isLocal: !!matchedSwap,
        })
        .run();

      inserted.push({
        id: Number(result.lastInsertRowid),
        name: item.name,
        category: item.category,
        qty: item.qty,
        unit: item.unit,
        storageLocation,
        expiryDate: expiryDate.toISOString(),
        isLocal: !!matchedSwap,
      });
    }

    return NextResponse.json({ items: inserted });
  } catch (e) {
    if (sqliteMissingTableHint(e)) {
      return NextResponse.json(
        {
          error: (e as Error).message,
          sqlitePath: getSqlitePath(),
          hint: "Stop the dev server, run from project root: npm run db:seed (optional data). If this persists: rm sqlite.db && restart npm run dev (schema is auto-created from db/migrations/0000_*.sql).",
        },
        { status: 500 }
      );
    }
    throw e;
  }
}
