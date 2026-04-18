import Link from "next/link";
import { db } from "@/lib/db";
import { pantryItems, donationOrgs } from "@/db/schema";
import { eq, lte } from "drizzle-orm";

const NON_PERISHABLE_CATEGORIES = new Set([
  "rice_dry",
  "pasta_dry",
  "beans_dry",
  "beans_canned",
  "canned_vegetable",
  "canned_fruit",
  "canned_soup",
  "cereal",
  "flour",
  "sugar",
  "oil_olive",
]);

export default async function DonatePage({
  searchParams,
}: {
  searchParams: Promise<{ item_id?: string }>;
}) {
  const { item_id } = await searchParams;

  if (!item_id) {
    // Show items expiring within 3 days
    const cutoff = new Date(Date.now() + 3 * 86400000);
    const expiringItems = db
      .select()
      .from(pantryItems)
      .where(lte(pantryItems.expiryDate, cutoff))
      .all();

    return (
      <main
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "32px 32px",
        }}
      >
        <style>{`
          @media (max-width: 600px) {
            .donate-main { padding: 24px 16px !important; }
            .donate-item-row { flex-direction: column !important; align-items: flex-start !important; }
          }
        `}</style>

        {/* Black ribbon */}
        <div
          style={{
            background: "#000",
            color: "#fff",
            padding: "14px 20px",
            marginBottom: 40,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          DONATE · FOOD BANK MATCHING
        </div>

        {expiringItems.length === 0 ? (
          <div
            style={{
              border: "2px solid #000",
              padding: "40px 24px",
              textAlign: "center",
              fontFamily: "Lora, serif",
              color: "#757575",
              fontSize: 16,
            }}
          >
            No items expiring in the next 3 days.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {expiringItems.map((item) => {
              const daysLeft = Math.ceil(
                (item.expiryDate.getTime() - Date.now()) / 86400000
              );
              const dLabel =
                daysLeft <= 0
                  ? "EXPIRES TODAY"
                  : daysLeft === 1
                  ? "EXPIRES IN 1D"
                  : `EXPIRES IN ${daysLeft}D`;

              return (
                <Link
                  key={item.id}
                  href={`/donate?item_id=${item.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    className="donate-item-row"
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      padding: "16px 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Source Serif 4', serif",
                          fontSize: 20,
                          fontWeight: 600,
                          color: "#1a1a1a",
                          letterSpacing: "-0.01em",
                          marginBottom: 4,
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          color: "#c8102e",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {dLabel}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#757575",
                        whiteSpace: "nowrap",
                      }}
                    >
                      FIND ORG →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 40 }}>
          <Link
            href="/"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#757575",
              textDecoration: "none",
            }}
          >
            ← BACK TO PANTRY
          </Link>
        </div>
      </main>
    );
  }

  // item_id provided — show matched donation orgs
  const itemId = parseInt(item_id, 10);
  const itemRows = db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.id, itemId))
    .all();

  const item = itemRows[0];

  if (!item) {
    return (
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 32px" }}>
        <p style={{ fontFamily: "Lora, serif", color: "#757575", marginBottom: 16 }}>
          Item not found.
        </p>
        <Link
          href="/donate"
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#757575",
            textDecoration: "none",
          }}
        >
          ← BACK TO EXPIRING ITEMS
        </Link>
      </main>
    );
  }

  const isPerishable = !NON_PERISHABLE_CATEGORIES.has(item.category);
  const daysLeft = Math.ceil((item.expiryDate.getTime() - Date.now()) / 86400000);
  const dLabel =
    daysLeft <= 0 ? "EXPIRES TODAY" : daysLeft === 1 ? "EXPIRES IN 1D" : `EXPIRES IN ${daysLeft}D`;
  const isDying = daysLeft <= 3;

  const allOrgs = db.select().from(donationOrgs).all();
  const matchedOrgs = isPerishable
    ? allOrgs.filter((org) => org.acceptsPerishable)
    : allOrgs.filter((org) => !org.name.includes("Compost"));

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 32px" }}>
      <style>{`
        @media (max-width: 600px) {
          .donate-detail-main { padding: 24px 16px !important; }
        }
      `}</style>

      {/* Black ribbon */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "14px 20px",
          marginBottom: 32,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        DONATE · FOOD BANK MATCHING
      </div>

      <Link
        href="/donate"
        style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#757575",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: 28,
        }}
      >
        ← BACK TO EXPIRING ITEMS
      </Link>

      {/* Item detail card */}
      <div
        style={{
          border: "2px solid #000",
          padding: 20,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: isDying ? "#c8102e" : "#757575",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 4,
          }}
        >
          {item.category.replace(/_/g, " ").toUpperCase()} · {dLabel}
        </div>
        <div
          style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#1a1a1a",
          }}
        >
          {item.name}
        </div>
        {isPerishable && (
          <div
            style={{
              marginTop: 12,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "#c8102e",
              border: "1px solid #c8102e",
              padding: "6px 10px",
              display: "inline-block",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            PERISHABLE · FILTERED TO ACCEPTING ORGS
          </div>
        )}
      </div>

      {/* Org cards */}
      {matchedOrgs.length === 0 ? (
        <div
          style={{
            border: "2px solid #000",
            padding: "40px 24px",
            textAlign: "center",
            fontFamily: "Lora, serif",
            color: "#757575",
            fontSize: 16,
          }}
        >
          No matching donation organizations found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {matchedOrgs.map((org) => (
            <div
              key={org.id}
              style={{
                border: "2px solid #000",
                borderLeft: "4px solid #000",
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#757575",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                ACCEPTS PERISHABLE: {org.acceptsPerishable ? "YES" : "NO"}
              </div>
              <div
                style={{
                  fontFamily: "'Source Serif 4', serif",
                  fontSize: 22,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#1a1a1a",
                }}
              >
                {org.name}
              </div>
              <div
                style={{
                  fontFamily: "Lora, serif",
                  fontSize: 14,
                  color: "#757575",
                  lineHeight: 1.6,
                }}
              >
                {org.address} · {org.phone}
                <br />
                {org.hours}
              </div>
              {org.notes && (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: "Lora, serif",
                    fontSize: 13,
                    color: "#1a1a1a",
                  }}
                >
                  {org.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
