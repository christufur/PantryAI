import { db, ensureSqliteSchema } from "@/lib/db";
import { pantryItems, localSwaps as localSwapsTable, impactEvents } from "@/db/schema";
import { asc } from "drizzle-orm";
import type { PlainItem } from "@/components/pantry-types";
import PantryViewSwitcher from "@/components/PantryViewSwitcher";
import { computeImpact, type ImpactTotals } from "@/lib/impact";

export default function Home() {
  ensureSqliteSchema();
  let items: PlainItem[] = [];
  const events = db.select().from(impactEvents).all();
  const impact: ImpactTotals = computeImpact(events.map(e => ({ category: e.category, qty: e.qty, unit: e.unit })));
  const rows = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
  const allSwaps = db.select().from(localSwapsTable).all();

  items = rows.map(r => {
      const nameLower = r.name.toLowerCase();
      const swap = allSwaps.find(
        s =>
          nameLower.includes(s.genericName.toLowerCase()) ||
          s.genericName.toLowerCase().includes(nameLower)
      );
      return {
        id:              r.id,
        name:            r.name,
        category:        r.category,
        qty:             r.qty,
        unit:            r.unit,
        storageLocation: r.storageLocation,
        expiryDate:      r.expiryDate instanceof Date
                           ? Math.floor(r.expiryDate.getTime() / 1000)
                           : Number(r.expiryDate),
        isLocal:         r.isLocal,
        localSwap:       swap
          ? { localProducer: swap.localProducer, product: swap.product, whereToBuy: swap.whereToBuy }
          : null,
      };
    });

  const serverNow = Date.now();
  const dying = items.filter(
    i => Math.floor((i.expiryDate * 1000 - serverNow) / 86_400_000) <= 3
  );

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <div style={{
        background: "#000", color: "#fff",
        padding: "10px 32px",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-ribbon)", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }} className="ribbon">
        <span>PANTRY · {items.length} ITEMS</span>
        {dying.length > 0 && <span style={{ color: "#c8102e" }}>⚠ {dying.length} EXPIRING</span>}
      </div>

      <div className="pantry-main-below-ribbon">
        <PantryViewSwitcher items={items} nowMs={serverNow} impact={impact} />
      </div>

      <style>{`
        .pantry-main-below-ribbon {
          padding-top: clamp(16px, 3.5vw, 28px);
        }
        @media (max-width: 768px) {
          .ribbon { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
