import { db } from "@/lib/db";
import { impactEvents } from "@/db/schema";
import { computeImpact } from "@/lib/impact";
import ImpactCard from "@/components/ImpactCard";
import NotifyButton from "@/components/NotifyButton";

export default function ImpactPage() {
  let totals = { itemsRescued: 0, dollarsSaved: 0, lbsSaved: 0, co2Lbs: 0, gallonsSaved: 0 };
  try {
    const events = db.select().from(impactEvents).all();
    totals = computeImpact(events.map(e => ({ category: e.category, qty: e.qty, unit: e.unit })));
  } catch {}

  const fmt = (n: number, decimals = 0) => n.toLocaleString("en-US", { maximumFractionDigits: decimals });

  const stats = [
    { label: "Items rescued", value: fmt(totals.itemsRescued), unit: "items", color: "#c8102e" },
    { label: "Money saved", value: `$${fmt(totals.dollarsSaved, 2)}`, unit: "USD", color: "#000" },
    { label: "Food from landfill", value: fmt(totals.lbsSaved, 1), unit: "lbs", color: "#000" },
    { label: "CO₂ prevented", value: fmt(totals.co2Lbs, 1), unit: "lbs CO₂e", color: "#000" },
    { label: "Water saved", value: fmt(totals.gallonsSaved, 0), unit: "gallons", color: "#000" },
  ];

  return (
    <main style={{ background: "var(--paper)", minHeight: "100dvh" }}>
      {/* Ribbon */}
      <div style={{
        background: "#000", color: "#fff",
        padding: "10px 32px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }} className="impact-ribbon">
        <span>YOUR IMPACT · FOOD RESCUED FROM THE BIN</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>ZERO WASTE. NEW MEXICO.</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 32px" }} className="impact-container">

        {/* Hero stat — items rescued */}
        <section style={{ borderBottom: "2px solid #000", paddingBottom: 40, marginBottom: 40 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8102e", marginBottom: 12 }}>
            LIFETIME RESCUES
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 96, lineHeight: 0.9, letterSpacing: "-0.04em", color: "#c8102e" }} className="impact-hero-num">
              {fmt(totals.itemsRescued)}
            </span>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                ITEMS SAVED
              </div>
              <div style={{ fontFamily: "Lora, serif", fontSize: 15, color: "var(--caption)", marginTop: 4 }}>
                from your pantry, rescued before expiry
              </div>
            </div>
          </div>
          {totals.itemsRescued === 0 && (
            <p style={{ fontFamily: "Lora, serif", fontSize: 15, color: "var(--caption)", marginTop: 16, fontStyle: "italic" }}>
              No rescues yet — start tracking by deleting items you&apos;ve used before they expire.
            </p>
          )}
        </section>

        {/* Stats grid */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0", borderTop: "2px solid #000", marginBottom: 40 }} className="impact-stats-grid">
          {stats.slice(1).map((s) => (
            <div key={s.label} style={{ borderBottom: "1px solid var(--hairline)", borderRight: "1px solid var(--hairline)", padding: "28px 24px" }} className="impact-stat-cell">
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 10 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 42, lineHeight: 1.0, letterSpacing: "-0.02em", color: s.color }} className="impact-stat-num">
                {s.value}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--caption)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {s.unit}
              </div>
            </div>
          ))}
        </section>

        {/* Context note */}
        <section style={{ borderTop: "1px solid var(--hairline)", paddingTop: 24, marginBottom: 40 }}>
          <p style={{ fontFamily: "Lora, serif", fontSize: 14, color: "var(--caption)", margin: 0, lineHeight: 1.7 }}>
            The average American household wastes <strong>~$1,600</strong> of food per year. Roughly <strong>30–40%</strong> of the US food supply is wasted — releasing the equivalent of <strong>170 million metric tons of CO₂e</strong> annually. In New Mexico, 98% of food is sourced from out of state. Every item you rescue matters.
          </p>
        </section>

        {/* Share card + notifications */}
        <section style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <ImpactCard totals={totals} />
          <NotifyButton />
        </section>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .impact-hero-num { font-size: 72px !important; }
          .impact-stats-grid { grid-template-columns: 1fr !important; }
          .impact-stat-cell { border-right: none !important; }
          .impact-container { padding: 24px 16px !important; }
          .impact-ribbon { padding: 10px 16px !important; }
          .impact-stat-num { font-size: 34px !important; }
        }
      `}</style>
    </main>
  );
}
