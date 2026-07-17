import { db, ensureSqliteSchema } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import ExpiryColumn from "@/components/ExpiryColumn";

export default function ColumnPage() {
  ensureSqliteSchema();
  const items = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();

  const now = Date.now();
  const data = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    daysLeft: Math.floor((i.expiryDate.getTime() - now) / 86_400_000),
  }));

  const expiringCount = data.filter((i) => i.daysLeft <= 3).length;

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
      {/* Black ribbon */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "10px 32px",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-ribbon)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
        className="ribbon"
      >
        <span>EXPIRY COLUMN · {data.length} ITEMS PLOTTED BY DAYS-LEFT</span>
        {expiringCount > 0 && <span style={{ color: "#c8102e" }}>⚠ {expiringCount} EXPIRING</span>}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }} className="column-container">
        {/* Heading */}
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--caption)",
            marginBottom: 4,
          }}
        >
          EXPIRES IN
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "var(--text-title)",
            lineHeight: 0.95,
            letterSpacing: "-0.025em",
            margin: "0 0 8px",
          }}
          className="column-title"
        >
          This Week
        </h1>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 16,
            color: "var(--caption)",
            marginBottom: 32,
            maxWidth: 560,
          }}
        >
          Today at top, safe at the bottom. Slide the threshold to define <em>expiring</em>, then ask
          Pepper for one recipe that uses everything above the line.
        </div>

        <ExpiryColumn items={data} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .column-container { padding: 20px 16px !important; }
          .column-title { font-size: 40px !important; }
          .ribbon { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
