import { db } from "@/lib/db";
import { impactEvents } from "@/db/schema";
import { computeImpact } from "@/lib/impact";
import ImpactDownloadButton from "@/components/ImpactDownloadButton";
import NotifyButton from "@/components/NotifyButton";

export default function ImpactPage() {
  let totals = { itemsRescued: 0, dollarsSaved: 0, lbsSaved: 0, co2Lbs: 0, gallonsSaved: 0 };
  try {
    const events = db.select().from(impactEvents).all();
    totals = computeImpact(events.map(e => ({ category: e.category, qty: e.qty, unit: e.unit })));
  } catch {}

  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString("en-US", { maximumFractionDigits: decimals });

  const secondaryStats = [
    { label: "Money saved",       value: `$${fmt(totals.dollarsSaved, 2)}`, unit: "USD"       },
    { label: "Food from landfill",value: fmt(totals.lbsSaved, 1),           unit: "lbs"       },
    { label: "CO₂ prevented",     value: fmt(totals.co2Lbs, 1),             unit: "lbs CO₂e"  },
    { label: "Water saved",       value: fmt(totals.gallonsSaved, 0),       unit: "gallons"   },
  ];

  return (
    <main style={{ background: "var(--paper)", minHeight: "100dvh" }}>

      {/* ── Ribbon ─────────────────────────────────────────────────── */}
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

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px 64px" }} className="impact-container">

        {/* ── Action bar ─────────────────────────────────────────────── */}
        <section style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 32, gap: 16, flexWrap: "wrap",
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--caption)",
          }}>
            LIFETIME IMPACT
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <ImpactDownloadButton totals={totals} />
            <NotifyButton compact />
          </div>
        </section>

        {/* ── Editorial lede ─────────────────────────────────────────── */}
        <section style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "28px 0" }}>
          <p style={{
            fontFamily: "Lora, serif",
            fontSize: 17, lineHeight: 1.75,
            color: "var(--ink)", margin: 0,
            maxWidth: 680,
          }}>
            The average American household wastes{" "}
            <strong>~$1,600</strong> of food per year.
            Roughly <strong>30–40%</strong> of the US food supply ends up in the landfill —
            releasing the equivalent of{" "}
            <strong>170 million metric tons of CO₂e</strong> annually.
            In New Mexico, <strong>98% of food</strong> is sourced from out of state.
            Every item you rescue matters.
          </p>
        </section>

        {/* ── Hero stat ──────────────────────────────────────────────── */}
        <section style={{ padding: "40px 0 0" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.14em", color: "#c8102e",
            marginBottom: 14,
          }}>
            LIFETIME RESCUES
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 20, flexWrap: "wrap", marginBottom: 40 }}>
            <span style={{
              fontFamily: "'Source Serif 4', serif", fontWeight: 700,
              fontSize: 112, lineHeight: 0.88, letterSpacing: "-0.04em",
              color: "#c8102e",
            }} className="impact-hero-num">
              {fmt(totals.itemsRescued)}
            </span>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink)",
              }}>
                ITEMS SAVED
              </div>
              <div style={{ fontFamily: "Lora, serif", fontSize: 15, color: "var(--caption)", marginTop: 4 }}>
                rescued from your pantry before expiry
              </div>
              {totals.itemsRescued === 0 && (
                <div style={{ fontFamily: "Lora, serif", fontSize: 14, color: "var(--caption)", marginTop: 12, fontStyle: "italic" }}>
                  Start tracking: delete items you&apos;ve used before they expire.
                </div>
              )}
            </div>
          </div>

          {/* ── Stats grid ─────────────────────────────────────────────── */}
          <div style={{ border: "2px solid #000" }} className="impact-stats-grid">
            {secondaryStats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: "28px 28px 24px",
                  borderRight: i % 2 === 0 ? "1px solid var(--hairline)" : "none",
                  borderBottom: i < 2 ? "1px solid var(--hairline)" : "none",
                }}
                className="impact-stat-cell"
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "var(--caption)", marginBottom: 12,
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily: "'Source Serif 4', serif", fontWeight: 700,
                  fontSize: 44, lineHeight: 1.0, letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }} className="impact-stat-num">
                  {s.value}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: "var(--caption)", marginTop: 8,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {s.unit}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <style>{`
        .impact-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 640px) {
          .impact-hero-num  { font-size: 80px !important; }
          .impact-stat-num  { font-size: 34px !important; }
          .impact-stats-grid { grid-template-columns: 1fr !important; }
          .impact-stat-cell  { border-right: none !important; }
          .impact-container  { padding: 24px 16px 48px !important; }
          .impact-ribbon     { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
