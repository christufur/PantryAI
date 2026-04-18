import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";

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

  const buckets: Record<string, typeof items> = { fridge: [], freezer: [], pantry: [], other: [] };
  for (const it of items) {
    const key = (order as readonly string[]).includes(it.storageLocation) ? it.storageLocation : "other";
    buckets[key].push(it);
  }

  const shelves = [...order, "other"].filter((k) => buckets[k].length > 0);
  const dyingCount = items.filter((i) => daysUntil(i.expiryDate) <= 3).length;

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
      {/* Black ribbon */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "10px 32px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
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
          PANTRY · {shelves.length} SHELVES · {items.length} ITEMS
        </span>
        {dyingCount > 0 && <span style={{ color: "#c8102e" }}>⚠ {dyingCount} DYING</span>}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }} className="shelves-container">
        {/* Page heading */}
        <h1
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontWeight: 600,
            fontSize: 64,
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
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--caption)",
            marginBottom: 32,
          }}
        >
          THE APP <em style={{ fontStyle: "italic" }}>IS</em> YOUR PANTRY · TAP AN ITEM FOR RECIPES
        </div>

        {items.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: 28,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Empty shelves.
            </div>
            <Link
              href="/"
              style={{
                fontFamily: "Inter, sans-serif",
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
          shelves.map((key) => (
            <section key={key} style={{ marginBottom: 36 }}>
              {/* Shelf label */}
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--caption)",
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{labels[key]}</span>
                <span>
                  {buckets[key].length} {buckets[key].length === 1 ? "ITEM" : "ITEMS"}
                </span>
              </div>

              {/* The shelf itself: items sit on top of a hard 4px black rule */}
              <div
                style={{
                  borderBottom: "4px solid #000",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: 8,
                  paddingBottom: 0,
                  minHeight: 96,
                }}
                className="shelf-row"
              >
                {buckets[key].map((item) => {
                  const d = daysUntil(item.expiryDate);
                  const isDying = d <= 3;
                  const isExpired = d < 0;
                  const dLabel = isExpired ? "EXP" : `${d}D`;
                  // Width scales loosely with name length so the row reads as
                  // varied jars/cartons rather than uniform tiles.
                  const w = Math.min(180, Math.max(88, item.name.length * 11 + 28));

                  return (
                    <Link
                      key={item.id}
                      href={`/recipe?ingredients=${encodeURIComponent(item.name)}`}
                      title={`${item.name} · ${item.qty} ${item.unit} · ${dLabel}`}
                      style={{
                        width: w,
                        height: 88,
                        border: "2px solid #000",
                        background: isDying ? "#c8102e" : "#fff",
                        color: isDying ? "#fff" : "#000",
                        textDecoration: "none",
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          opacity: isDying ? 0.95 : 0.6,
                        }}
                      >
                        {item.category.replace(/_/g, " ")}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Source Serif 4', serif",
                          fontWeight: 600,
                          fontSize: 16,
                          lineHeight: 1.05,
                          textTransform: "uppercase",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          {item.qty}
                          {item.unit === "each" ? "" : ` ${item.unit}`}
                        </span>
                        <span>{dLabel}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))
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
                fontFamily: "Inter, sans-serif",
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
                  fontFamily: "Inter, sans-serif",
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
