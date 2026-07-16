import { ApiError } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { db, ensureSqliteSchema, sqliteMissingTableHint } from "@/lib/db";
import { pantryItems, shelfLife, localSwaps } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  delayDemoPhotoMock,
  DEMO_PHOTO_MOCK_ENABLED,
  getDemoPhotoIdentifiedItems,
} from "@/lib/demo-photo-mock";
import { GEMINI_MODEL_RESPONSE_HEADER, identifyPantryItems } from "@/lib/gemini";
import { type StorageLocation, VALID_LOCATIONS } from "@/lib/storage";

export const runtime = "nodejs";

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

  let identified: Awaited<ReturnType<typeof identifyPantryItems>>["items"];
  let geminiModel: string;

  if (DEMO_PHOTO_MOCK_ENABLED) {
    await delayDemoPhotoMock();
    identified = getDemoPhotoIdentifiedItems();
    geminiModel = "demo-mock";
  } else {
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const out = await identifyPantryItems(buffer, file.type);
      identified = out.items;
      geminiModel = out.model;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 503 || e.status === 429)) {
        return NextResponse.json(
          {
            error:
              "The photo analyzer is temporarily busy (high demand). Wait a minute and try again.",
          },
          { status: 503 }
        );
      }
      if (e instanceof ApiError) {
        return NextResponse.json(
          { error: "Could not analyze the photo. Please try again." },
          { status: 502 }
        );
      }
      if (e instanceof Error && e.message === "GEMINI_API_KEY not set") {
        return NextResponse.json(
          { error: "Photo analysis is not configured on this server." },
          { status: 500 }
        );
      }
      throw e;
    }
  }

  try {
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

      const matchedSwap = allSwaps.find(
        (s) =>
          itemNameLower.includes(s.genericName.toLowerCase()) ||
          s.genericName.toLowerCase().includes(itemNameLower)
      );

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

    return NextResponse.json(
      { items: inserted, geminiModel },
      { headers: { [GEMINI_MODEL_RESPONSE_HEADER]: geminiModel } }
    );
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
