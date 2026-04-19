import { db } from "@/lib/db";
import { impactEvents } from "@/db/schema";
import { computeImpact } from "@/lib/impact";
import ImpactCard from "@/components/ImpactCard";

export default function ImpactPage() {
  let totals = { itemsRescued: 0, dollarsSaved: 0, lbsSaved: 0, co2Lbs: 0, gallonsSaved: 0 };
  try {
    const events = db.select().from(impactEvents).all();
    totals = computeImpact(events.map(e => ({ category: e.category, qty: e.qty, unit: e.unit })));
  } catch {}

  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString("en-US", { maximumFractionDigits: decimals });

  const secondaryStats = [
    { label: "Money saved",        value: `$${fmt(totals.dollarsSaved, 2)}`, unit: "USD"      },
    { label: "Food from landfill", value: fmt(totals.lbsSaved, 1),           unit: "lbs"      },
    { label: "CO₂ prevented",      value: fmt(totals.co2Lbs, 1),             unit: "lbs CO₂e" },
    { label: "Water saved",        value: fmt(totals.gallonsSaved, 0),       unit: "gallons"  },
  ];

  return (
    <main style={{ background: "var(--paper)" }}>

      {/* ── Ribbon ─────────────────────────────────────────────────── */}
      <div style={{
        background: "#000", color: "#fff",
        padding: "10px 32px",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-ribbon)", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }} className="impact-ribbon">
        <span>YOUR IMPACT · FOOD RESCUED FROM THE BIN</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>ZERO WASTE. NEW MEXICO.</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px 32px" }} className="impact-container">

        {/* ── Hero stat ──────────────────────────────────────────────── */}
        <section style={{ borderBottom: "2px solid #000", paddingBottom: 20, marginBottom: 0 }}>

          <div style={{
            fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8102e",
            marginBottom: 16,
          }}>
            LIFETIME RESCUES
          </div>

          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "var(--text-hero-num)", lineHeight: 0.85, letterSpacing: "-0.04em",
            color: "#c8102e", marginBottom: 20,
          }} className="impact-hero-num">
            {fmt(totals.itemsRescued)}
          </div>

          <div style={{
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--ink)",
            marginBottom: 6,
          }}>
            ITEMS SAVED
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--caption)", lineHeight: 1.5 }}>
            {totals.itemsRescued === 0
              ? "Start tracking: delete items you've used before they expire."
              : "Rescued from your pantry before expiry."}
          </div>

        </section>

        {/* ── Stats grid ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: 0 }}>
          <div style={{ border: "2px solid #000", borderTop: "none" }} className="impact-stats-grid">
            {secondaryStats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: "18px 24px 16px",
                  borderRight: i % 2 === 0 ? "1px solid var(--hairline)" : "none",
                  borderBottom: i < 2 ? "1px solid var(--hairline)" : "none",
                }}
                className="impact-stat-cell"
              >
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "var(--caption)", marginBottom: 12,
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: "var(--text-stat)", lineHeight: 1.0, letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }} className="impact-stat-num">
                  {s.value}
                </div>
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 10,
                  color: "var(--caption)", marginTop: 8,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {s.unit}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Shareable card ─────────────────────────────────────────── */}
        <section style={{ paddingTop: 20 }}>
          <ImpactCard totals={totals} />
        </section>

        {/* ── Lede ───────────────────────────────────────────────────── */}
        <section style={{ borderTop: "none", paddingTop: 20 }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)", lineHeight: 1.8,
            color: "var(--caption)", margin: 0,
          }}>
            The average American household wastes <strong style={{ color: "var(--ink)" }}>~$1,600</strong> of food
            per year. Roughly <strong style={{ color: "var(--ink)" }}>30–40%</strong> of the US food supply ends
            up in the landfill — releasing the equivalent of{" "}
            <strong style={{ color: "var(--ink)" }}>170 million metric tons of CO₂e</strong> annually.
            In New Mexico, <strong style={{ color: "var(--ink)" }}>98% of food</strong> is sourced
            from out of state. Every item you rescue matters.
          </p>
        </section>

      </div>

      <style>{`
        .impact-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 640px) {
          .impact-hero-num   { font-size: 72px !important; }
          .impact-stat-num   { font-size: 30px !important; }
          .impact-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .impact-stat-cell  { padding: 14px 14px 12px !important; }
          .impact-container  { padding: 16px 16px 24px !important; }
          .impact-ribbon     { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
