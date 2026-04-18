"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ColumnItem = {
  id: number;
  name: string;
  category: string;
  daysLeft: number;
};

export default function ExpiryColumn({ items }: { items: ColumnItem[] }) {
  const [threshold, setThreshold] = useState(3);
  const SCALE_MAX = 14;

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.daysLeft - b.daysLeft),
    [items]
  );

  // Group items by daysLeft so same-day items stack cleanly in a row
  const groups = useMemo(() => {
    const map = new Map<number, ColumnItem[]>();
    for (const item of sorted) {
      const key = item.daysLeft;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [sorted]);

  const above = useMemo(
    () => sorted.filter((i) => i.daysLeft <= threshold),
    [sorted, threshold]
  );

  const aboveLabel =
    threshold === 0 ? "today" : threshold === 1 ? "1 day" : `${threshold} days`;

  const recipeHref = `/recipe?ingredients=${encodeURIComponent(
    above.map((i) => i.name).join(",")
  )}`;

  function dayLabel(d: number) {
    if (d < 0) return "EXPIRED";
    if (d === 0) return "TODAY";
    if (d === 1) return "1D";
    return `${d}D`;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 40 }} className="column-grid">

      {/* ── LEFT: flow-based timeline ───────────────────────────────────── */}
      <div style={{ position: "relative" }}>

        {/* Vertical axis line — absolutely behind the rows */}
        <div style={{
          position: "absolute",
          left: 76,
          top: 0, bottom: 0,
          width: 2,
          background: "#000",
          zIndex: 0,
        }} />

        {/* Danger-zone background strip covering all groups ≤ threshold */}
        {above.length > 0 && (
          <div style={{
            position: "absolute",
            left: 0, right: 0, top: 0,
            // height dynamically covers rows up to threshold — computed via CSS
            // We use a semi-transparent overlay on individual rows instead (see below)
            pointerEvents: "none",
          }} />
        )}

        {groups.length === 0 && (
          <div style={{ paddingLeft: 72, paddingTop: 24, fontFamily: "Lora, serif", fontSize: 16, color: "var(--caption)" }}>
            No items in inventory.{" "}
            <Link href="/" style={{ color: "var(--link)" }}>Snap your fridge</Link>.
          </div>
        )}

        {groups.map(([d, groupItems]) => {
          const inDanger = d <= threshold;
          const isExpired = d < 0;
          const isBeyond = d > SCALE_MAX;

          return (
            <div
              key={d}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 0,
                position: "relative",
                zIndex: 1,
                background: inDanger ? "rgba(200,16,46,0.04)" : "transparent",
                borderLeft: inDanger ? "none" : "none",
                marginBottom: 0,
              }}
            >
              {/* Day label column — fixed width, right-aligned up to axis */}
              <div style={{
                width: 72,
                flexShrink: 0,
                paddingRight: 12,
                paddingTop: 14,
                textAlign: "right",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: inDanger ? "#c8102e" : isExpired ? "#c8102e" : "var(--caption)",
                lineHeight: 1,
              }}>
                {dayLabel(d)}
              </div>

              {/* Dot on axis */}
              <div style={{
                width: 2,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 18,
              }}>
                <div style={{
                  width: 10,
                  height: 10,
                  background: inDanger ? "#c8102e" : "#000",
                  border: "2px solid #000",
                  flexShrink: 0,
                  zIndex: 2,
                  marginLeft: -4,
                }} />
              </div>

              {/* Items in this day-group */}
              <div style={{
                flex: 1,
                borderTop: "1px solid var(--hairline)",
                marginLeft: 16,
              }}>
                {groupItems.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: idx < groupItems.length - 1 ? "1px dashed var(--hairline)" : "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        color: "var(--caption)",
                        textTransform: "uppercase",
                        marginBottom: 2,
                      }}>
                        {item.category.replace(/_/g, " ")}
                        {isBeyond && " · SAFE"}
                      </div>
                      <div style={{
                        fontFamily: "'Source Serif 4', serif",
                        fontSize: 18,
                        fontWeight: inDanger ? 600 : 400,
                        color: inDanger ? "#c8102e" : "#000",
                        lineHeight: 1.05,
                      }}>
                        {item.name}
                      </div>
                    </div>
                    <Link
                      href={`/recipe?ingredients=${encodeURIComponent(item.name)}`}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 700,
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "5px 10px",
                        border: "2px solid #000",
                        color: inDanger ? "#fff" : "#000",
                        background: inDanger ? "#000" : "#fff",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      RECIPE
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Threshold dashed line — positioned after the last in-danger group */}
        {above.length > 0 && above.length < sorted.length && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            position: "relative",
            zIndex: 2,
            marginBottom: 8,
          }}>
            <div style={{ width: 72, flexShrink: 0 }} />
            <div style={{ width: 2, flexShrink: 0 }} />
            <div style={{
              flex: 1,
              marginLeft: 16,
              borderTop: "2px dashed #c8102e",
              paddingTop: 4,
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#c8102e",
                background: "var(--paper)",
                paddingRight: 8,
              }}>
                THRESHOLD · {aboveLabel.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: threshold control + CTA ──────────────────────────────── */}
      <aside style={{ position: "sticky", top: 16, alignSelf: "start" }} className="column-aside">
        <div style={{ border: "2px solid #000", padding: 20, marginBottom: 20 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--caption)", marginBottom: 8,
          }}>
            COOK USING · THINGS DYING IN
          </div>
          <div style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 44, fontWeight: 600,
            lineHeight: 1, letterSpacing: "-0.02em",
            marginBottom: 16,
          }}>
            {aboveLabel}
          </div>

          <input
            type="range"
            min={0}
            max={SCALE_MAX}
            step={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c8102e" }}
            aria-label="Days threshold"
          />

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", color: "var(--caption)",
          }}>
            {([[0,"NOW"],[3,"3D"],[7,"7D"],[SCALE_MAX,"ALL"]] as [number,string][]).map(([v, label]) => (
              <button
                key={label}
                onClick={() => setThreshold(v)}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  cursor: "pointer",
                  color: threshold === v ? "#000" : "var(--caption)",
                  fontFamily: "inherit", fontSize: "inherit",
                  fontWeight: "inherit", letterSpacing: "inherit",
                  textDecoration: threshold === v ? "underline" : "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ border: "2px solid #c8102e", padding: 16, marginBottom: 20 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "#c8102e", marginBottom: 10,
          }}>
            {above.length} {above.length === 1 ? "ITEM" : "ITEMS"} · CHEFFABLE
          </div>

          {above.length === 0 ? (
            <div style={{ fontFamily: "Lora, serif", fontSize: 14, color: "var(--caption)" }}>
              Nothing dying within {aboveLabel}. Slide the rule up.
            </div>
          ) : (
            <>
              {above.slice(0, 8).map((i) => (
                <div key={i.id} style={{
                  borderBottom: "1px solid var(--hairline)",
                  padding: "6px 0",
                  display: "flex", justifyContent: "space-between",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  <span>{i.name}</span>
                  <span style={{ color: "#c8102e", fontWeight: 700 }}>
                    {i.daysLeft < 0 ? "EXP" : `${i.daysLeft}D`}
                  </span>
                </div>
              ))}
              {above.length > 8 && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--caption)", marginTop: 6 }}>
                  + {above.length - 8} MORE
                </div>
              )}
            </>
          )}
        </div>

        {above.length > 0 ? (
          <Link
            href={recipeHref}
            style={{
              display: "block",
              fontFamily: "Inter, sans-serif", fontWeight: 700,
              fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em",
              padding: "14px 16px", border: "2px solid #000",
              background: "#000", color: "#fff",
              textDecoration: "none", textAlign: "center",
            }}
          >
            ASK PEPPER → SAVE {above.length}
          </Link>
        ) : (
          <button
            disabled
            style={{
              display: "block", width: "100%",
              fontFamily: "Inter, sans-serif", fontWeight: 700,
              fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em",
              padding: "14px 16px", border: "2px solid var(--hairline)",
              background: "#fff", color: "var(--disabled)", cursor: "not-allowed",
            }}
          >
            ASK PEPPER →
          </button>
        )}
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .column-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .column-aside { position: static !important; }
        }
      `}</style>
    </div>
  );
}
