"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PickerItem = {
  id: number;
  name: string;
  category: string;
  daysUntilExpiry: number;
  isLocal: boolean;
};

export default function IngredientPicker({
  items,
  initialSelected = [],
}: {
  items: PickerItem[];
  initialSelected?: string[];
}) {
  const router = useRouter();

  // Pre-select dying items (≤3d) by default if no explicit initial selection.
  const defaultSelected = useMemo(() => {
    if (initialSelected.length > 0) return new Set(initialSelected);
    return new Set(items.filter((i) => i.daysUntilExpiry <= 3).map((i) => i.name));
  }, [items, initialSelected]);

  const [selected, setSelected] = useState<Set<string>>(defaultSelected);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectDying() {
    setSelected(new Set(items.filter((i) => i.daysUntilExpiry <= 3).map((i) => i.name)));
  }

  function selectAll() {
    setSelected(new Set(items.map((i) => i.name)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function generate() {
    if (selected.size === 0) return;
    const param = Array.from(selected).join(",");
    router.push(`/recipe?ingredients=${encodeURIComponent(param)}`);
  }

  // Sort: dying first (most urgent first), then everything else by expiry.
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
    [items]
  );

  const dyingCount = items.filter((i) => i.daysUntilExpiry <= 3).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {dyingCount > 0 && (
          <button
            onClick={selectDying}
            style={chipStyle(true)}
          >
            ⚠ USE WHAT&apos;S EXPIRING ({dyingCount})
          </button>
        )}
        <button onClick={selectAll} style={chipStyle(false)}>
          SELECT ALL
        </button>
        <button onClick={clearAll} style={chipStyle(false)}>
          CLEAR
        </button>
      </div>

      {/* Selection counter */}
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--caption)",
          borderBottom: "2px solid #000",
          paddingBottom: 8,
        }}
      >
        {selected.size} OF {items.length} SELECTED
      </div>

      {/* Item checkboxes */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {sorted.map((item) => {
          const isSelected = selected.has(item.name);
          const isDying = item.daysUntilExpiry <= 3;
          const isExpired = item.daysUntilExpiry < 0;
          const dLabel = isExpired
            ? "EXPIRED"
            : item.daysUntilExpiry === 0
            ? "TODAY"
            : `${item.daysUntilExpiry}D`;

          return (
            <label
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 0",
                borderBottom: "1px solid var(--hairline)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(item.name)}
                style={{
                  width: 18,
                  height: 18,
                  margin: 0,
                  accentColor: "#000",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: isDying ? "#c8102e" : "var(--caption)",
                    marginBottom: 2,
                  }}
                >
                  {item.category.replace(/_/g, " ")} · {dLabel}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-md)",
                    fontWeight: isDying ? 600 : 400,
                    color: "#000",
                    lineHeight: 1.2,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span>{item.name}</span>
                  {item.isLocal && (
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "2px 6px",
                        border: "1px solid #057dbc",
                        color: "#057dbc",
                        lineHeight: 1,
                      }}
                    >
                      NM LOCAL
                    </span>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Sticky generate bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--paper)",
          borderTop: "2px solid #000",
          paddingTop: 16,
          paddingBottom: 8,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={generate}
          disabled={selected.size === 0}
          style={{
            background: selected.size === 0 ? "#e2e8f0" : "#000",
            color: selected.size === 0 ? "#757575" : "#fff",
            border: "2px solid #000",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "12px 24px",
            cursor: selected.size === 0 ? "default" : "pointer",
            flex: "1 1 auto",
          }}
        >
          ◎ GENERATE RECIPE ({selected.size})
        </button>
      </div>
    </div>
  );
}

function chipStyle(primary: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-ui)",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "8px 14px",
    border: "2px solid #000",
    background: primary ? "#000" : "#fff",
    color: primary ? "#fff" : "#000",
    cursor: "pointer",
  };
}
