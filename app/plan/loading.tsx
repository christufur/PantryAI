export default function PlanLoading() {
  return (
    <main style={{ background: "var(--paper)", minHeight: "100dvh" }}>
      {/* Black ribbon */}
      <div style={{
        background: "#000", color: "#fff",
        padding: "10px 32px",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-ribbon)", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }} className="ribbon">
        <span>WEEKLY PLAN · TONIGHT &amp; THIS WEEK</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>LOADING…</span>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }} className="wall-container">
        {/* Action bar skeleton */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div className="skel" style={{ width: 160, height: 14 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <div className="skel" style={{ width: 140, height: 38 }} />
            <div className="skel" style={{ width: 180, height: 38 }} />
          </div>
        </section>

        {/* TONIGHT skeleton */}
        <section style={{ borderBottom: "2px solid #000", paddingBottom: 32, marginBottom: 32 }}>
          <div className="skel" style={{ width: 260, height: 13, marginBottom: 16 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 32, alignItems: "end" }} className="wall-tonight-grid">
            <div>
              <div className="skel" style={{ width: "70%", height: 52, marginBottom: 12 }} />
              <div className="skel" style={{ width: "40%", height: 52 }} />
            </div>
            <div className="skel" style={{ width: "100%", height: 56 }} />
          </div>
        </section>

        {/* Bottom grid skeleton */}
        <section style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 40 }} className="wall-bottom-grid">
          {/* Dying soon */}
          <div>
            <div className="skel" style={{ width: 100, height: 11, marginBottom: 16 }} />
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ borderBottom: "1px solid var(--hairline)", padding: "12px 0", display: "flex", justifyContent: "space-between" }}>
                <div className="skel" style={{ width: "55%", height: 26 }} />
                <div className="skel" style={{ width: 32, height: 18 }} />
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div>
            <div className="skel" style={{ width: 140, height: 11, marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "2px solid #000" }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{
                  borderRight: i === 6 ? "none" : "1px solid var(--hairline)",
                  padding: 10, minHeight: 160,
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div className="skel" style={{ width: "60%", height: 10 }} />
                  <div className="skel" style={{ width: "80%", height: 12 }} />
                  <div className="skel" style={{ width: "70%", height: 12 }} />
                  <div className="skel" style={{ width: "75%", height: 12 }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .skel {
          background: #e8e8e8;
          border-radius: 2px;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 900px) {
          .wall-tonight-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .wall-bottom-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .wall-container { padding: 20px 16px !important; }
          .ribbon { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
