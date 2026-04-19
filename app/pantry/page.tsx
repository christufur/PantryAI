import { db } from "@/lib/db";
import { pantryItems, impactEvents } from "@/db/schema";
import { asc } from "drizzle-orm";
import PantryViewSwitcher, { type PlainItem } from "@/components/PantryViewSwitcher";
import { computeImpact, type ImpactTotals } from "@/lib/impact";

export default function PantryPage() {
  let items: PlainItem[] = [];
  let impact: ImpactTotals = { itemsRescued: 0, dollarsSaved: 0, lbsSaved: 0, co2Lbs: 0, gallonsSaved: 0 };
  try {
    const events = db.select().from(impactEvents).all();
    impact = computeImpact(events.map(e => ({ category: e.category, qty: e.qty, unit: e.unit })));
  } catch {}
  try {
    const rows = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
    items = rows.map((r) => ({
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
  } catch {}

  const serverNow = Date.now();
  const dying = items.filter(
    (i) => Math.floor((i.expiryDate * 1000 - serverNow) / 86_400_000) <= 3
  );

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
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
        <span>PANTRY · {items.length} ITEMS</span>
        {dying.length > 0 && (
          <span style={{ color: "#c8102e" }}>⚠ {dying.length} DYING</span>
        )}
      </div>

      <PantryViewSwitcher items={items} nowMs={serverNow} impact={impact} />

      <style>{`
        @media (max-width: 768px) {
          .ribbon { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
