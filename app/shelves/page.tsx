import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import ShelvesDragGrid from "@/components/ShelvesDragGrid";

// Var 03 — Shelves. Group inventory by storage_location and render each
// item as a labeled rectangle on a literal shelf. Dying items shift to red.
// Tap an item → recipe scoped to that ingredient.
export default function ShelvesPage() {
  let items: (typeof pantryItems.$inferSelect)[] = [];
  try {
    items = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
  } catch {}

  const now = Date.now();
  const daysUntil = (d: Date) => Math.floor((d.getTime() - now) / 86_400_000);

  // Stable shelf order. Anything else gets bucketed under "OTHER".
  const order = ["fridge", "freezer", "pantry"] as const;
  const labels: Record<string, string> = {
    fridge: "TOP SHELF · FRIDGE",
    freezer: "MID SHELF · FREEZER",
    pantry: "LOW SHELF · PANTRY",
    other: "LOW SHELF · OTHER",
  };

  const hasOtherShelf = items.some(
    (it) => !(order as readonly string[]).includes(it.storageLocation)
  );
  const shelfSectionCount = items.length === 0 ? 0 : hasOtherShelf ? 4 : 3;
  const dyingCount = items.filter((i) => daysUntil(i.expiryDate) <= 3).length;

  const dragItems = items.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    qty: r.qty,
    unit: r.unit,
    storageLocation: r.storageLocation,
    expiryDate:
      r.expiryDate instanceof Date
        ? Math.floor(r.expiryDate.getTime() / 1000)
        : Number(r.expiryDate),
    isLocal: r.isLocal,
  }));

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
      {/* Black ribbon */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "10px 32px",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-ribbon)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
        className="ribbon"
      >
        <span>
          PANTRY · {shelfSectionCount} SHELVES · {items.length} ITEMS
        </span>
        {dyingCount > 0 && <span style={{ color: "#c8102e" }}>⚠ {dyingCount} DYING</span>}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }} className="shelves-container">
        {/* Page heading */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "var(--text-title)",
            lineHeight: 0.95,
            letterSpacing: "-0.025em",
            margin: "0 0 8px",
          }}
          className="shelves-title"
        >
          Shelves
        </h1>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--caption)",
            marginBottom: 32,
          }}
        >
          DRAG BETWEEN SHELVES · TAP A TILE FOR RECIPES
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-subtitle)",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Empty shelves.
            </div>
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "10px 18px",
                border: "2px solid #000",
                background: "#000",
                color: "#fff",
                textDecoration: "none",
                display: "inline-block",
                marginTop: 16,
              }}
            >
              SNAP YOUR FRIDGE →
            </Link>
          </div>
        ) : (
          <ShelvesDragGrid
            items={dragItems}
            shelfLabels={labels}
            nameFontSize={16}
            nowMs={now}
          />
        )}

        {/* Bottom actions */}
        {items.length > 0 && (
          <div
            style={{
              marginTop: 40,
              borderTop: "1px solid var(--hairline)",
              paddingTop: 20,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "10px 18px",
                border: "2px solid #000",
                background: "#fff",
                color: "#000",
                textDecoration: "none",
              }}
            >
              + SNAP
            </Link>
            {dyingCount > 0 && (
              <Link
                href={`/recipe?ingredients=${encodeURIComponent(
                  items
                    .filter((i) => daysUntil(i.expiryDate) <= 3)
                    .map((i) => i.name)
                    .join(",")
                )}`}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "10px 18px",
                  border: "2px solid #000",
                  background: "#000",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                COOK → SAVE {dyingCount}
              </Link>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .shelves-container { padding: 20px 16px !important; }
          .shelves-title { font-size: 40px !important; }
          .ribbon { padding: 10px 16px !important; }
          .shelf-row { gap: 6px !important; }
        }
      `}</style>
    </main>
  );
}
