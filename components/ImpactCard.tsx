import Link from "next/link";
import type { ImpactTotals } from "@/lib/impact";

export default function ImpactCard({ totals }: { totals: ImpactTotals }) {
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div style={{
      border: "2px solid #000",
      background: "var(--paper)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      height: "100%",
    }}>
      <div style={{ padding: "14px 18px 16px" }}>
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.14em",
          color: "#c8102e", marginBottom: 6,
        }}>
          Lifetime rescues
        </div>
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
