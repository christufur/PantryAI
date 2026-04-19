import type { ImpactTotals } from "@/lib/impact";

export default function ImpactCard({ totals }: { totals: ImpactTotals }) {
  return (
    <div style={{
      background: "#000", color: "#fff",
      border: "2px solid #fff",
      padding: "24px 28px",
      width: "100%",
      boxSizing: "border-box",
      fontFamily: "var(--font-ui)",
      height: "100%",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", marginBottom: 16 }}>
        pantry.ai · my food rescue impact
      </div>
      <div style={{ fontSize: "var(--text-title)", fontWeight: 700, lineHeight: 1, color: "#c8102e" }}>
        {totals.itemsRescued}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#888", marginBottom: 20 }}>
        ITEMS RESCUED
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "SAVED", value: `$${totals.dollarsSaved.toFixed(2)}` },
          { label: "FOOD", value: `${totals.lbsSaved.toFixed(1)} LBS` },
          { label: "CO₂", value: `${totals.co2Lbs.toFixed(1)} LBS` },
          { label: "WATER", value: `${Math.round(totals.gallonsSaved)} GAL` },
        ].map(s => (
          <div key={s.label} style={{ border: "1px solid #333", padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "#888", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 9, color: "#444", letterSpacing: "0.1em" }}>
        ZERO WASTE · NEW MEXICO
      </div>
    </div>
  );
}
