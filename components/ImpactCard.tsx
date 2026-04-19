import Link from "next/link";
import type { ImpactTotals } from "@/lib/impact";

export default function ImpactCard({ totals }: { totals: ImpactTotals }) {
  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString("en-US", { maximumFractionDigits: decimals });

  const stats = [
    { label: "Money saved",  value: `$${fmt(totals.dollarsSaved, 2)}`, unit: "USD"     },
    { label: "Food saved",   value: fmt(totals.lbsSaved, 1),           unit: "lbs"     },
    { label: "CO₂ prevent.", value: fmt(totals.co2Lbs, 1),             unit: "lbs CO₂" },
    { label: "Water saved",  value: fmt(totals.gallonsSaved, 0),       unit: "gal"     },
  ];

  return (
    <div style={{
      border: "2px solid #000",
      background: "var(--paper)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
    }}>
      {/* Kicker */}
      <div style={{
        padding: "14px 18px 0",
        fontFamily: "var(--font-ui)",
        fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.14em",
        color: "#c8102e",
      }}>
        Lifetime rescues
      </div>

      {/* Hero number */}
      <div style={{
        padding: "6px 18px 12px",
        borderBottom: "2px solid #000",
      }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(56px, 8vw, 96px)",
          lineHeight: 0.9,
          letterSpacing: "-0.03em",
          color: "#c8102e",
        }}>
          {fmt(totals.itemsRescued)}
        </div>
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.10em",
          color: "var(--ink)", marginTop: 8,
        }}>
          Items saved
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        flexGrow: 1,
      }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            padding: "14px 16px 12px",
            borderRight: i % 2 === 0 ? "1px solid var(--hairline)" : "none",
            borderBottom: i < 2 ? "1px solid var(--hairline)" : "none",
          }}>
            <div style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.10em",
              color: "var(--caption)", marginBottom: 6,
            }}>
              {s.label}
            </div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(20px, 2.5vw, 28px)",
              lineHeight: 1,
              color: "var(--ink)",
            }}>
              {s.value}
            </div>
            <div style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10, color: "var(--caption)",
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginTop: 4,
            }}>
              {s.unit}
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid var(--hairline)" }}>
        <Link href="/impact" style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--ink)", textDecoration: "none",
        }}>
          Open impact report →
        </Link>
      </div>
    </div>
  );
}
