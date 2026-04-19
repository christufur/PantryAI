"use client";

import type { ImpactTotals } from "@/lib/impact";

export default function ImpactDownloadButton({ totals }: { totals: ImpactTotals }) {
  function handleDownload() {
    const W = 1200, H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // Logo line
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.fillText("pantry.ai  ·  YOUR IMPACT", 80, 96);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 112);
    ctx.lineTo(W - 80, 112);
    ctx.stroke();

    // Big number
    ctx.fillStyle = "#c8102e";
    ctx.font = "bold 180px serif";
    ctx.fillText(totals.itemsRescued.toString(), 80, 310);

    ctx.fillStyle = "#666";
    ctx.font = "bold 20px monospace";
    ctx.fillText("ITEMS RESCUED FROM THE BIN", 80, 348);

    // Stats row
    const stats = [
      { label: "MONEY SAVED", value: `$${totals.dollarsSaved.toFixed(2)}` },
      { label: "FOOD FROM BIN", value: `${totals.lbsSaved.toFixed(1)} LBS` },
      { label: "CO₂ PREVENTED", value: `${totals.co2Lbs.toFixed(1)} LBS` },
      { label: "WATER SAVED", value: `${Math.round(totals.gallonsSaved)} GAL` },
    ];

    const cellW = (W - 160) / 4;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 400, W - 160, 160);

    stats.forEach((s, i) => {
      const x = 80 + i * cellW;
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(x, 400);
        ctx.lineTo(x, 560);
        ctx.stroke();
      }
      ctx.fillStyle = "#666";
      ctx.font = "bold 13px monospace";
      ctx.fillText(s.label, x + 16, 428);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 34px serif";
      ctx.fillText(s.value, x + 16, 490);
    });

    // Footer
    ctx.fillStyle = "#444";
    ctx.font = "14px monospace";
    ctx.fillText("ZERO WASTE · NEW MEXICO · pantry.ai", 80, H - 52);

    const link = document.createElement("a");
    link.download = "my-pantry-impact.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <button
      onClick={handleDownload}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.08em",
        padding: "10px 16px",
        border: "2px solid #000",
        background: "#fff", color: "#000",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      ↓ SHARE CARD
    </button>
  );
}
