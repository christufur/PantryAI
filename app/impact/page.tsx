import { db, ensureSqliteSchema } from "@/lib/db";
import { impactEvents } from "@/db/schema";
import { computeImpact } from "@/lib/impact";

export default function ImpactPage() {
  ensureSqliteSchema();
  const events = db.select().from(impactEvents).all();
  const totals = computeImpact(events.map(e => ({ category: e.category, qty: e.qty, unit: e.unit })));

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

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 40px 44px" }} className="impact-container">

        {/* ── Hero stat ──────────────────────────────────────────────── */}
        <section style={{ borderBottom: "2px solid #000", paddingBottom: 28, marginBottom: 0 }}>

          <div style={{
            fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8102e",
            marginBottom: 18,
          }}>
            LIFETIME RESCUES
          </div>

          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: "clamp(104px, 18vw, 200px)", lineHeight: 0.82, letterSpacing: "-0.04em",
            color: "#c8102e", marginBottom: 20,
          }} className="impact-hero-num">
            {fmt(totals.itemsRescued)}
          </div>

          <div style={{
            fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--ink)",
            marginBottom: 8,
          }}>
            ITEMS SAVED
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--caption)", lineHeight: 1.55 }}>
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
                  padding: "24px 28px 20px",
                  borderRight: i % 2 === 0 ? "1px solid var(--hairline)" : "none",
                  borderBottom: i < 2 ? "1px solid var(--hairline)" : "none",
                }}
                className="impact-stat-cell"
              >
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "var(--caption)", marginBottom: 14,
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: "clamp(44px, 6vw, 72px)", lineHeight: 0.95, letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }} className="impact-stat-num">
                  {s.value}
                </div>
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 11,
                  color: "var(--caption)", marginTop: 10,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {s.unit}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Lede ───────────────────────────────────────────────────── */}
        <section style={{ borderTop: "none", paddingTop: 28 }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(16px, 2.1vw, 20px)", lineHeight: 1.8,
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
          .impact-hero-num   { font-size: 96px !important; }
          .impact-stat-num   { font-size: 36px !important; }
          .impact-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .impact-stat-cell  { padding: 18px 16px 16px !important; }
          .impact-container  { padding: 20px 16px 30px !important; }
          .impact-ribbon     { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
