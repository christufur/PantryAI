"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type LocalAlternative = {
  localProducer: string;
  product: string;
  whereToBuy: string;
};

type ShoppingItem = {
  name: string;
  qty: number;
  unit: string;
  localAlternative?: LocalAlternative;
};

type Tab = "stores" | "local";

export default function ShoppingPage() {
  const { planId } = useParams<{ planId: string }>();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("stores");

  useEffect(() => {
    fetch(`/api/plan/${planId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { setItems(data.shoppingList ?? []); setLoading(false); })
      .catch((e) => { setError(e.message ?? "Failed to load"); setLoading(false); });
  }, [planId]);

  const localItems = items.filter((i) => i.localAlternative);
  const storeItems = items.filter((i) => !i.localAlternative);
  const displayed = tab === "local" ? localItems : storeItems;

  // ─── shared styles ─────────────────────────────────────────────────────────
  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px 0",
    border: "none", borderBottom: `3px solid ${active ? "#000" : "transparent"}`,
    background: "transparent",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, fontWeight: 700,
    textTransform: "uppercase" as const, letterSpacing: "0.1em",
    color: active ? "#000" : "#757575",
    cursor: "pointer",
  });

  if (loading) return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#757575", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        LOADING…
      </p>
    </main>
  );

  if (error) return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <Link href="/plan" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#757575", textDecoration: "none", display: "block", marginBottom: 32 }}>
        ← BACK TO PLAN
      </Link>
      <p style={{ fontFamily: "Lora, serif", fontSize: 16, color: "#c8102e", border: "2px solid #c8102e", padding: "14px 20px" }}>
        Couldn&apos;t load shopping list: {error}
      </p>
    </main>
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      {/* Back link */}
      <Link href="/plan" style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: "#757575", textDecoration: "none", display: "block", marginBottom: 32,
      }}>
        ← BACK TO PLAN
      </Link>

      {/* Section: Current Stock */}
      <div style={{
        background: "#000", color: "#fff",
        padding: "14px 20px", marginBottom: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
      }}>
        CURRENT (USABLE FROM PANTRY)
      </div>
      <div style={{ border: "2px solid #000", borderTop: "none", padding: "16px 20px", marginBottom: 32 }}>
        <p style={{ fontFamily: "Lora, serif", fontSize: 14, color: "#757575", margin: 0 }}>
          Check the{" "}
          <Link href="/plan" style={{ color: "#057dbc" }}>plan</Link>
          {" "}for items already in stock — they appear in each meal&apos;s &quot;From Pantry&quot; list.
        </p>
      </div>

      {/* Section: Need to Buy */}
      <div style={{
        background: "#000", color: "#fff",
        padding: "14px 20px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
      }}>
        NEED TO BUY ({items.length} ITEMS)
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 24, border: "2px solid #000", borderTop: "none" }}>
        <button style={tabBtn(tab === "stores")} onClick={() => setTab("stores")}>
          🛒 ANY GROCER ({storeItems.length})
        </button>
        <button style={{ ...tabBtn(tab === "local"), borderLeft: "1px solid #e2e8f0" }} onClick={() => setTab("local")}>
          🌿 BUY LOCAL ({localItems.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <p style={{ fontFamily: "Lora, serif", fontSize: 15, color: "#757575", padding: "24px 0" }}>
          {tab === "local"
            ? "No local NM alternatives found for items in this plan."
            : "All items have local NM alternatives — switch to the Local tab!"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: tab === "local" ? "1fr 1fr 1fr" : "1fr 80px",
            borderBottom: "2px solid #000",
            padding: "8px 0",
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575" }}>ITEM</span>
            {tab === "local" && <>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575" }}>PRODUCER</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575" }}>WHERE TO BUY</span>
            </>}
            {tab === "stores" && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575", textAlign: "right" }}>QTY</span>
            )}
          </div>

          {displayed.map((item, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: tab === "local" ? "1fr 1fr 1fr" : "1fr 80px",
                borderBottom: "1px solid #e2e8f0",
                padding: "14px 0",
                alignItems: "start",
              }}
            >
              <div>
                <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>
                  {item.name}
                </div>
                {tab === "stores" && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#757575", marginTop: 2 }}>
                    Available at most grocers
                  </div>
                )}
              </div>

              {tab === "local" && item.localAlternative && <>
                <div>
                  <div style={{ fontFamily: "Lora, serif", fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    {item.localAlternative.localProducer}
                  </div>
                  <div style={{ fontFamily: "Lora, serif", fontSize: 13, color: "#757575" }}>
                    {item.localAlternative.product}
                  </div>
                </div>
                <div style={{ fontFamily: "Lora, serif", fontSize: 13, color: "#057dbc" }}>
                  {item.localAlternative.whereToBuy}
                </div>
              </>}

              {tab === "stores" && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "#757575", textAlign: "right", paddingTop: 2,
                }}>
                  {item.qty} {item.unit}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
