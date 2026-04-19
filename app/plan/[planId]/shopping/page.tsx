"use client";

import { useEffect, useMemo, useState } from "react";
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

type LocalOutlet = {
  name: string;
  website?: string;
  city: string;
  zip: string;
  kind: string;
};

type NearbyOutlets = {
  csa: LocalOutlet[];
  farmersMarket: LocalOutlet[];
  foodHub: LocalOutlet[];
  onFarmMarket: LocalOutlet[];
  agritourism: LocalOutlet[];
};

type Tab = "stores" | "local";

type Category = "Produce" | "Dairy & Eggs" | "Meat & Seafood" | "Pantry" | "Other";

const CATEGORY_ORDER: Category[] = ["Produce", "Dairy & Eggs", "Meat & Seafood", "Pantry", "Other"];

function categorize(name: string): Category {
  const n = name.toLowerCase();
  if (/\b(milk|yogurt|cheese|butter|cream|egg|eggs)\b/.test(n)) return "Dairy & Eggs";
  if (/\b(chicken|beef|pork|turkey|lamb|bacon|sausage|fish|salmon|tuna|shrimp|cod|tilapia|seafood)\b/.test(n)) return "Meat & Seafood";
  if (/\b(apple|banana|berry|berries|lemon|lime|orange|tomato|onion|garlic|potato|carrot|pepper|cucumber|lettuce|spinach|kale|broccoli|mushroom|avocado|cilantro|parsley|basil|ginger|zucchini|squash|corn|celery|cabbage|cauliflower|pea|peas|bean sprout|scallion|shallot|chili|chile|fruit|vegetable|produce|greens)\b/.test(n)) return "Produce";
  if (/\b(rice|pasta|noodle|bread|tortilla|flour|sugar|salt|oil|vinegar|sauce|spice|bean|lentil|chickpea|canned|broth|stock|tomato paste|honey|syrup|oats|quinoa|cereal|crackers|nut|nuts|seed|seeds|peanut)\b/.test(n)) return "Pantry";
  return "Other";
}

const kindLabel: Record<string, string> = {
  csa: "CSA",
  farmers_market: "Farmer's Market",
  food_hub: "Food Hub",
  on_farm_market: "On-Farm Market",
  agritourism: "Agritourism",
};

export default function ShoppingPage() {
  const { planId } = useParams<{ planId: string }>();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [weekStart, setWeekStart] = useState<unknown>(null);
  const [dayCount, setDayCount] = useState<number>(0);
  const [outlets, setOutlets] = useState<NearbyOutlets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("stores");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const storageKey = `shopping-${planId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(new Set(JSON.parse(raw)));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    fetch(`/api/plan/${planId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setItems(data.shoppingList ?? []);
        setWeekStart(data.weekStart);
        setDayCount((data.days ?? []).length);
        setOutlets(data.nearbyOutlets ?? null);
        setLoading(false);
      })
      .catch((e) => { setError(e.message ?? "Failed to load"); setLoading(false); });
  }, [planId]);

  function toggleItem(name: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function clearAll() {
    setChecked(new Set());
    try { localStorage.removeItem(storageKey); } catch {}
  }

  const localItems = items.filter((i) => i.localAlternative);
  const storeItems = items.filter((i) => !i.localAlternative);
  const displayed = tab === "local" ? localItems : storeItems;

  const grouped = useMemo(() => {
    const map = new Map<Category, ShoppingItem[]>();
    for (const item of displayed) {
      const cat = categorize(item.name);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => ({ category: c, items: map.get(c)! }));
  }, [displayed]);

  const totalCount = items.length;
  const boughtCount = items.filter((i) => checked.has(i.name)).length;
  const progress = totalCount > 0 ? Math.round((boughtCount / totalCount) * 100) : 0;

  const dateLabel = useMemo(() => {
    if (!weekStart) return "";
    const d = weekStart instanceof Date ? weekStart : new Date((weekStart as number) * 1000);
    if (isNaN(d.getTime())) return "";
    const end = new Date(d);
    end.setDate(end.getDate() + Math.max(0, dayCount - 1));
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${d.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
  }, [weekStart, dayCount]);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px 0",
    border: "none", borderBottom: `3px solid ${active ? "#000" : "transparent"}`,
    background: "transparent",
    fontFamily: "var(--font-ui)",
    fontSize: 11, fontWeight: 700,
    textTransform: "uppercase" as const, letterSpacing: "0.1em",
    color: active ? "#000" : "#757575",
    cursor: "pointer",
  });

  if (loading) return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "#757575", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        LOADING…
      </p>
    </main>
  );

  if (error) return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <Link href="/plan" style={{ fontFamily: "var(--font-ui)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#757575", textDecoration: "none", display: "block", marginBottom: 32 }}>
        ← BACK TO PLAN
      </Link>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "#c8102e", border: "2px solid #c8102e", padding: "14px 20px" }}>
        Couldn&apos;t load shopping list: {error}
      </p>
    </main>
  );

  const hasAnyOutlets = outlets && (
    outlets.farmersMarket.length + outlets.csa.length + outlets.foodHub.length + outlets.onFarmMarket.length > 0
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <Link href="/plan" style={{
        fontFamily: "var(--font-ui)", fontSize: 11,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: "#757575", textDecoration: "none", display: "block", marginBottom: 24,
      }}>
        ← BACK TO PLAN
      </Link>

<<<<<<< HEAD
      <div style={{ marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575" }}>
        SHOPPING LIST
      </div>
      <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 32, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>
        {dayCount}-Day Plan
      </h1>
      {dateLabel && (
        <div style={{ fontFamily: "Lora, serif", fontSize: 14, color: "#757575", marginBottom: 24 }}>
          {dateLabel}
        </div>
      )}

      <div style={{ border: "2px solid #000", padding: "16px 20px", marginBottom: 28, background: "#f8f8f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {boughtCount} OF {totalCount} BOUGHT
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: 8, background: "#e2e8f0", border: "1px solid #000" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#000", transition: "width 0.2s" }} />
        </div>
        {boughtCount > 0 && (
          <button
            onClick={clearAll}
            style={{
              background: "none", border: "none", padding: 0, marginTop: 10, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em", color: "#c8102e",
              textDecoration: "underline",
            }}
          >
            RESET CHECKLIST
          </button>
        )}
      </div>

      <div style={{ display: "flex", border: "2px solid #000", marginBottom: 0 }}>
=======
      {/* Section: Current Stock */}
      <div style={{
        background: "#000", color: "#fff",
        padding: "14px 20px", marginBottom: 0,
        fontFamily: "var(--font-ui)",
        fontSize: 13, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
      }}>
        CURRENT (USABLE FROM PANTRY)
      </div>
      <div style={{ border: "2px solid #000", borderTop: "none", padding: "16px 20px", marginBottom: 32 }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#757575", margin: 0 }}>
          Check the{" "}
          <Link href="/plan" style={{ color: "#057dbc" }}>plan</Link>
          {" "}for items already in stock — they appear in each meal&apos;s &quot;From Pantry&quot; list.
        </p>
      </div>

      {/* Section: Need to Buy */}
      <div style={{
        background: "#000", color: "#fff",
        padding: "14px 20px",
        fontFamily: "var(--font-ui)",
        fontSize: 13, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
      }}>
        NEED TO BUY ({items.length} ITEMS)
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: 24, border: "2px solid #000", borderTop: "none" }}>
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
        <button style={tabBtn(tab === "stores")} onClick={() => setTab("stores")}>
          ANY GROCER ({storeItems.length})
        </button>
        <button style={{ ...tabBtn(tab === "local"), borderLeft: "1px solid #e2e8f0" }} onClick={() => setTab("local")}>
          BUY LOCAL ({localItems.length})
        </button>
      </div>

      {displayed.length === 0 ? (
<<<<<<< HEAD
        <p style={{ fontFamily: "Lora, serif", fontSize: 15, color: "#757575", padding: "32px 0", textAlign: "center" }}>
=======
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#757575", padding: "24px 0" }}>
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
          {tab === "local"
            ? "No local NM alternatives found for items in this plan."
            : "All items have local alternatives — switch to the Buy Local tab!"}
        </p>
      ) : (
<<<<<<< HEAD
        <div style={{ marginTop: 24 }}>
          {grouped.map(({ category, items: catItems }) => (
            <div key={category} style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.12em", color: "#1a1a1a",
                borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 0,
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{category}</span>
                <span style={{ color: "#757575" }}>{catItems.length}</span>
              </div>

              {catItems.map((item, i) => {
                const isChecked = checked.has(item.name);
                if (tab === "local" && item.localAlternative) {
                  return (
                    <div
                      key={`${item.name}-${i}`}
                      onClick={() => toggleItem(item.name)}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        padding: "14px 0", cursor: "pointer",
                        opacity: isChecked ? 0.5 : 1,
                        display: "flex", gap: 14, alignItems: "flex-start",
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, border: "2px solid #000",
                        background: isChecked ? "#000" : "#fff",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 900, flexShrink: 0, marginTop: 2,
                      }}>
                        {isChecked ? "✓" : ""}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 600,
                          color: "#1a1a1a",
                          textDecoration: isChecked ? "line-through" : "none",
                        }}>
                          {item.name} <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#757575", fontWeight: 400 }}>
                            · {item.qty} {item.unit}
                          </span>
                        </div>
                        <div style={{ marginTop: 6, padding: "8px 10px", background: "#f8f8f5", borderLeft: "3px solid #057dbc" }}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#057dbc", marginBottom: 3 }}>
                            LOCAL SWAP
                          </div>
                          <div style={{ fontFamily: "Lora, serif", fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                            {item.localAlternative.localProducer}
                          </div>
                          <div style={{ fontFamily: "Lora, serif", fontSize: 13, color: "#444" }}>
                            {item.localAlternative.product}
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#057dbc", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            → {item.localAlternative.whereToBuy}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={`${item.name}-${i}`}
                    onClick={() => toggleItem(item.name)}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      padding: "14px 0", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14,
                      opacity: isChecked ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, border: "2px solid #000",
                      background: isChecked ? "#000" : "#fff",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 900, flexShrink: 0,
                    }}>
                      {isChecked ? "✓" : ""}
                    </div>
                    <div style={{
                      flex: 1,
                      fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, fontWeight: 600,
                      color: "#1a1a1a",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}>
                      {item.name}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                      color: "#757575",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}>
                      {item.qty} {item.unit}
                    </div>
                  </div>
                );
              })}
=======
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: tab === "local" ? "1fr 1fr 1fr" : "1fr 80px",
            borderBottom: "2px solid #000",
            padding: "8px 0",
          }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575" }}>ITEM</span>
            {tab === "local" && <>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575" }}>PRODUCER</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575" }}>WHERE TO BUY</span>
            </>}
            {tab === "stores" && (
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#757575", textAlign: "right" }}>QTY</span>
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
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>
                  {item.name}
                </div>
                {tab === "stores" && (
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#757575", marginTop: 2 }}>
                    Available at most grocers
                  </div>
                )}
              </div>

              {tab === "local" && item.localAlternative && <>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    {item.localAlternative.localProducer}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#757575" }}>
                    {item.localAlternative.product}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#057dbc" }}>
                  {item.localAlternative.whereToBuy}
                </div>
              </>}

              {tab === "stores" && (
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 11,
                  color: "#757575", textAlign: "right", paddingTop: 2,
                }}>
                  {item.qty} {item.unit}
                </div>
              )}
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
            </div>
          ))}
        </div>
      )}

      {tab === "local" && hasAnyOutlets && outlets && (
        <div style={{ marginTop: 40, paddingTop: 28, borderTop: "2px solid #000" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575", marginBottom: 6 }}>
            NEARBY
          </div>
          <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>
            Where to shop local
          </h2>
          <p style={{ fontFamily: "Lora, serif", fontSize: 14, color: "#757575", marginBottom: 20 }}>
            Farmers markets, CSAs & food hubs within 30 miles.
          </p>

          {(["farmersMarket", "csa", "foodHub", "onFarmMarket"] as const).map((key) => {
            const list = outlets[key];
            if (list.length === 0) return null;
            return (
              <div key={key} style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1a1a1a", borderBottom: "1px solid #000", paddingBottom: 4, marginBottom: 8 }}>
                  {kindLabel[list[0].kind] ?? key} ({list.length})
                </div>
                {list.slice(0, 5).map((o, idx) => (
                  <div key={idx} style={{ padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
                      {o.website ? (
                        <a href={o.website} target="_blank" rel="noopener noreferrer" style={{ color: "#057dbc", textDecoration: "none" }}>
                          {o.name} ↗
                        </a>
                      ) : o.name}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#757575", marginTop: 2 }}>
                      {o.city}{o.zip ? ` · ${o.zip}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
