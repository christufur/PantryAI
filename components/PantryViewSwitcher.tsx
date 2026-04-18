"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ExpiryColumn from "@/components/ExpiryColumn";
import PhotoUploadDialog from "@/components/PhotoUploadDialog";
import DeleteItemButton from "@/components/DeleteItemButton";

export type PlainItem = {
  id: number;
  name: string;
  category: string;
  qty: number;
  unit: string;
  storageLocation: string;
  expiryDate: number; // unix seconds
  isLocal: boolean;
};

type View = "list" | "column" | "shelves";

const SHELF_ORDER = ["fridge", "freezer", "pantry"] as const;
const SHELF_LABELS: Record<string, string> = {
  fridge:  "FRIDGE",
  freezer: "FREEZER",
  pantry:  "PANTRY",
  other:   "OTHER",
};

export default function PantryViewSwitcher({ items }: { items: PlainItem[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const now = Date.now();
  function days(unix: number) {
    return Math.floor((unix * 1000 - now) / 86_400_000);
  }

  function toggleSelected(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }
  function selectAll() { setSelectedIds(new Set(items.map(i => i.id))); }

  const selectedItems = useMemo(
    () => items.filter(i => selectedIds.has(i.id)),
    [items, selectedIds]
  );
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  function cookSelected() {
    if (selectedItems.length === 0) return;
    const param = selectedItems.map(i => i.name).join(",");
    router.push(`/recipe?ingredients=${encodeURIComponent(param)}`);
  }

  const dying  = useMemo(() => items.filter(i => days(i.expiryDate) <= 3),  [items]);
  const expired = useMemo(() => items.filter(i => days(i.expiryDate) < 0),  [items]);

  // ── ExpiryColumn expects this shape ──────────────────────────────────────
  const columnItems = useMemo(() =>
    items.map(i => ({ id: i.id, name: i.name, category: i.category, daysLeft: days(i.expiryDate) })),
    [items]
  );

  // ── Shelves buckets ───────────────────────────────────────────────────────
  const buckets = useMemo(() => {
    const b: Record<string, PlainItem[]> = { fridge: [], freezer: [], pantry: [], other: [] };
    for (const it of items) {
      const key = (SHELF_ORDER as readonly string[]).includes(it.storageLocation)
        ? it.storageLocation : "other";
      b[key].push(it);
    }
    return b;
  }, [items]);
  const shelves = [...SHELF_ORDER, "other"].filter(k => buckets[k].length > 0);

  // ─────────────────────────────────────────────────────────────────────────
  //  View-toggle bar
  // ─────────────────────────────────────────────────────────────────────────
  const toggleBar = (
    <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #000", marginBottom: 32 }}>
      {(["list", "column", "shelves"] as View[]).map(v => (
        <button
          key={v}
          onClick={() => setView(v)}
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "12px 20px",
            border: "none",
            borderBottom: v === view ? "3px solid #000" : "3px solid transparent",
            background: "none",
            color: v === view ? "#000" : "var(--caption)",
            cursor: "pointer",
            marginBottom: -2,
            transition: "color 100ms",
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  Shared sidebar (LIST view only)
  // ─────────────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ position: "sticky", top: 16 }} className="sidebar">
      <div style={{ border: "2px solid #000", padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 10 }}>
          ADD ITEMS
        </div>
        <PhotoUploadDialog />
      </div>

      {dying.length > 0 && (
        <div style={{ border: "2px solid #c8102e", padding: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#c8102e", marginBottom: 10 }}>
            DYING SOON · {dying.length} ITEMS
          </div>
          {dying.slice(0, 6).map(item => (
            <div key={item.id} style={{ borderBottom: "1px solid var(--hairline)", padding: "6px 0", display: "flex", justifyContent: "space-between", fontFamily: "Lora, serif", fontSize: 14 }}>
              <span>{item.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#c8102e", fontWeight: 700 }}>
                {days(item.expiryDate) < 0 ? "EXP" : `${days(item.expiryDate)}D`}
              </span>
            </div>
          ))}
          <Link href={`/recipe?ingredients=${encodeURIComponent(dying.map(i => i.name).join(","))}`} style={{
            display: "block", marginTop: 12,
            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12,
            textTransform: "uppercase", letterSpacing: "0.05em",
            padding: "10px 14px", border: "2px solid #000",
            background: "#000", color: "#fff", textDecoration: "none", textAlign: "center",
          }}>
            SAVE THE DYING →
          </Link>
          <Link href="/recipe" style={{
            display: "block", marginTop: 8,
            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11,
            textTransform: "uppercase", letterSpacing: "0.05em",
            padding: "8px 14px", border: "2px solid #000",
            background: "#fff", color: "#000", textDecoration: "none", textAlign: "center",
          }}>
            OR PICK INGREDIENTS →
          </Link>
        </div>
      )}

      {dying.length === 0 && items.length > 0 && (
        <div style={{ border: "2px solid #000", padding: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 10 }}>
            COOK SOMETHING
          </div>
          <Link href="/recipe" style={{
            display: "block",
            fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12,
            textTransform: "uppercase", letterSpacing: "0.05em",
            padding: "10px 14px", border: "2px solid #000",
            background: "#000", color: "#fff", textDecoration: "none", textAlign: "center",
          }}>
            PICK INGREDIENTS →
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
          {([["TOTAL", items.length], ["DYING (≤3D)", dying.length], ["EXPIRED", expired.length]] as [string, number][]).map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--hairline)", padding: "8px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span style={{ color: "var(--caption)" }}>{label}</span>
              <span style={{ fontWeight: 700, color: label === "DYING (≤3D)" && val > 0 ? "#c8102e" : "#000" }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  Empty state
  // ─────────────────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }} className="page-grid-outer">
        {toggleBar}
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 32, fontWeight: 600, marginBottom: 8 }}>Nothing here yet.</div>
          <div style={{ fontFamily: "Lora, serif", fontSize: 16, color: "var(--caption)", marginBottom: 32 }}>Snap your fridge to get started.</div>
          <PhotoUploadDialog />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  LIST view
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "list") {
    const selectionCount = selectedIds.size;

    return (
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: selectionCount > 0 ? "32px 32px 96px" : "32px 32px 0",
      }} className="page-grid-outer">
        {toggleBar}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 40, alignItems: "start" }} className="page-grid">
          <div>
            {/* Select-all header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0",
              borderTop: "2px solid #000",
              borderBottom: "1px solid var(--hairline)",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? clearSelection() : selectAll()}
                  ref={el => { if (el) el.indeterminate = !allSelected && selectionCount > 0; }}
                  style={{ width: 18, height: 18, accentColor: "#000", cursor: "pointer", margin: 0 }}
                  aria-label="Select all items"
                />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "var(--caption)",
                }}>
                  {selectionCount === 0
                    ? "SELECT ITEMS TO COOK TOGETHER"
                    : `${selectionCount} OF ${items.length} SELECTED`}
                </span>
              </label>
            </div>

            {items.map(item => {
              const d = days(item.expiryDate);
              const isDying = d <= 3;
              const dLabel = d < 0 ? "EXPIRED" : `${d}D`;
              const isChecked = selectedIds.has(item.id);
              return (
                <div key={item.id} style={{
                  borderBottom: "1px solid var(--hairline)",
                  padding: "12px 0",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                  background: isChecked ? "rgba(0,0,0,0.03)" : "transparent",
                  transition: "background 100ms",
                }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelected(item.id)}
                    aria-label={`Select ${item.name}`}
                    style={{ width: 18, height: 18, accentColor: "#000", cursor: "pointer", margin: 0, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: isDying ? "#c8102e" : "var(--caption)", marginBottom: 2 }}>
                      {item.category.replace(/_/g, " ").toUpperCase()} · {dLabel}
                    </div>
                    <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: isDying ? 600 : 400, color: "#000", lineHeight: 1.1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span>{item.name}</span>
                      {item.isLocal && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 6px", border: "1px solid #057dbc", color: "#057dbc", lineHeight: 1 }}>NM LOCAL</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--caption)", letterSpacing: "0.08em", marginTop: 2 }}>
                      {item.qty} {item.unit} · {item.storageLocation.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Link href={`/recipe?ingredients=${encodeURIComponent(item.name)}`} style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 12px", border: "2px solid #000", color: isDying ? "#fff" : "#000", background: isDying ? "#000" : "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>RECIPE</Link>
                    <Link href={`/donate?item_id=${item.id}`} style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 12px", border: "2px solid #000", color: "#000", background: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>DONATE</Link>
                    <DeleteItemButton id={item.id} name={item.name} />
                  </div>
                </div>
              );
            })}
          </div>
          {sidebar}
        </div>

        {/* Sticky multi-select action bar */}
        {selectionCount > 0 && (
          <div style={{
            position: "fixed",
            left: 0, right: 0, bottom: 0,
            background: "#000", color: "#fff",
            borderTop: "2px solid #000",
            padding: "14px 24px",
            display: "flex", alignItems: "center", gap: 16,
            justifyContent: "space-between", flexWrap: "wrap",
            zIndex: 50,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>
              {selectionCount} SELECTED · {selectedItems.map(i => i.name).slice(0, 3).join(", ")}
              {selectionCount > 3 && ` +${selectionCount - 3} MORE`}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={clearSelection}
                style={{
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  padding: "10px 16px", border: "2px solid #fff",
                  background: "transparent", color: "#fff", cursor: "pointer",
                }}
              >
                CLEAR
              </button>
              <button
                onClick={cookSelected}
                style={{
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  padding: "10px 18px", border: "2px solid #fff",
                  background: "#fff", color: "#000", cursor: "pointer",
                }}
              >
                ◎ COOK THESE ({selectionCount}) →
              </button>
            </div>
          </div>
        )}
        <style>{`
          @media (max-width: 768px) {
            .page-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
            .sidebar { position: static !important; }
            .page-grid-outer { padding: 20px 16px 0 !important; }
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  COLUMN view  (wraps the existing ExpiryColumn component)
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "column") {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 0" }} className="page-grid-outer">
        {toggleBar}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 4 }}>EXPIRES IN</div>
          <h2 style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: 56, lineHeight: 0.95, letterSpacing: "-0.025em", margin: "0 0 8px" }} className="column-title">This Week</h2>
          <div style={{ fontFamily: "Lora, serif", fontSize: 15, color: "var(--caption)", marginBottom: 32, maxWidth: 560 }}>
            Today at top, safe at the bottom. Slide the threshold to define <em>dying</em>, then ask Claude for one recipe that uses everything above the line.
          </div>
        </div>
        <ExpiryColumn items={columnItems} />
        <style>{`
          @media (max-width: 768px) {
            .page-grid-outer { padding: 20px 16px 0 !important; }
            .column-title { font-size: 36px !important; }
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SHELVES view
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 0" }} className="page-grid-outer">
      {toggleBar}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: 56, lineHeight: 0.95, letterSpacing: "-0.025em", margin: "0 0 8px" }} className="shelves-title">Shelves</h2>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)" }}>
          TAP AN ITEM TO GET A RECIPE · DYING ITEMS IN RED
        </div>
      </div>

      {shelves.map(key => (
        <section key={key} style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>{SHELF_LABELS[key]}</span>
            <span>{buckets[key].length} {buckets[key].length === 1 ? "ITEM" : "ITEMS"}</span>
          </div>
          <div style={{ borderBottom: "4px solid #000", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8, paddingBottom: 0, minHeight: 96 }} className="shelf-row">
            {buckets[key].map(item => {
              const d = days(item.expiryDate);
              const isDying = d <= 3;
              const dLabel = d < 0 ? "EXP" : `${d}D`;
              const w = Math.min(180, Math.max(88, item.name.length * 11 + 28));
              return (
                <Link key={item.id} href={`/recipe?ingredients=${encodeURIComponent(item.name)}`} title={`${item.name} · ${item.qty} ${item.unit} · ${dLabel}`} style={{ width: w, height: 88, border: "2px solid #000", background: isDying ? "#c8102e" : "#fff", color: isDying ? "#fff" : "#000", textDecoration: "none", padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: isDying ? 0.95 : 0.6 }}>
                    {item.category.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: 15, lineHeight: 1.05, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
                    {item.name}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", display: "flex", justifyContent: "space-between" }}>
                    <span>{item.qty}{item.unit === "each" ? "" : ` ${item.unit}`}</span>
                    <span>{dLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {dying.length > 0 && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--hairline)", paddingTop: 20, display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
          <PhotoUploadDialog />
          <Link href={`/recipe?ingredients=${encodeURIComponent(dying.map(i => i.name).join(","))}`} style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", padding: "10px 18px", border: "2px solid #000", background: "#000", color: "#fff", textDecoration: "none" }}>
            COOK → SAVE {dying.length} DYING
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .page-grid-outer { padding: 20px 16px 0 !important; }
          .shelves-title { font-size: 36px !important; }
          .shelf-row { gap: 6px !important; }
        }
      `}</style>
    </div>
  );
}
