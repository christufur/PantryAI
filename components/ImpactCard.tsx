"use client";

import type { ImpactTotals } from "@/lib/impact";

export default function ImpactCard({ totals }: { totals: ImpactTotals }) {

  function drawCard(): HTMLCanvasElement {
    const W = 1200, H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // White border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // Header
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px 'JetBrains Mono', monospace";
    ctx.letterSpacing = "4px";
    ctx.fillText("pantry.ai  ·  MY FOOD RESCUE IMPACT", 60, 80);

    // Divider
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 100);
    ctx.lineTo(W - 60, 100);
    ctx.stroke();

    // Big rescue number
    ctx.fillStyle = "#c8102e";
    ctx.font = "bold 160px 'Source Serif 4', serif";
    ctx.fillText(totals.itemsRescued.toString(), 60, 280);

    ctx.fillStyle = "#888";
    ctx.font = "bold 28px 'JetBrains Mono', monospace";
    ctx.fillText("ITEMS RESCUED", 60, 320);

    // Stats row
    const stats = [
      { label: "MONEY SAVED", value: `$${totals.dollarsSaved.toFixed(2)}` },
      { label: "FOOD SAVED", value: `${totals.lbsSaved.toFixed(1)} LBS` },
      { label: "CO₂ PREVENTED", value: `${totals.co2Lbs.toFixed(1)} LBS` },
      { label: "WATER SAVED", value: `${Math.round(totals.gallonsSaved)} GAL` },
    ];

    const cellW = (W - 120) / stats.length;
    stats.forEach((s, i) => {
      const x = 60 + i * cellW;

      // Cell border
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 380, cellW - 8, 160);

      ctx.fillStyle = "#888";
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillText(s.label, x + 16, 412);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px 'Source Serif 4', serif";
      ctx.fillText(s.value, x + 16, 468);
    });

    // Footer
    ctx.fillStyle = "#444";
    ctx.font = "18px 'JetBrains Mono', monospace";
    ctx.fillText("ZERO WASTE · NEW MEXICO · pantry.ai", 60, H - 40);

    return canvas;
  }

  function handleDownload() {
    const canvas = drawCard();
    const link = document.createElement("a");
    link.download = "my-pantry-impact.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div>
      {/* Preview card (CSS-rendered, matches canvas aesthetic) */}
      <div style={{
        background: "#000", color: "#fff",
        border: "2px solid #fff",
        padding: "24px 28px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "var(--font-ui)",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", marginBottom: 16 }}>
          pantry.ai · my food rescue impact
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-title)", fontWeight: 700, lineHeight: 1, color: "#c8102e" }}>
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
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 9, color: "#444", letterSpacing: "0.1em" }}>
          ZERO WASTE · NEW MEXICO
        </div>
      </div>

      <button
        onClick={handleDownload}
        style={{
          marginTop: 12,
          width: "100%",
          fontFamily: "var(--font-ui)",
          fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em",
          padding: "12px 0",
          border: "2px solid #000",
          background: "#000", color: "#fff",
          cursor: "pointer",
        }}
      >
        ↓ DOWNLOAD IMPACT CARD
      </button>
    </div>
  );
}
