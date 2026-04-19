import { db } from "@/lib/db";
import { pantryItems, localSwaps as localSwapsTable } from "@/db/schema";
import { asc } from "drizzle-orm";
import PantryViewSwitcher, { type PlainItem } from "@/components/PantryViewSwitcher";

export default function Home() {
  let items: PlainItem[] = [];
  try {
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
  } catch {}

  const dying = items.filter(i => Math.floor((i.expiryDate * 1000 - Date.now()) / 86_400_000) <= 3);

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <div style={{
        background: "#000", color: "#fff",
        padding: "10px 40px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }} className="ribbon">
        <span>PANTRY · {items.length} ITEMS</span>
        {dying.length > 0 && <span style={{ color: "#c8102e" }}>⚠ {dying.length} DYING</span>}
      </div>

      <PantryViewSwitcher items={items} />

      <style>{`
        @media (max-width: 768px) {
          .ribbon { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
