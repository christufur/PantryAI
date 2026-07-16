"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlainItem } from "@/components/pantry-types";
import { CircleHelp } from "lucide-react";
import PhotoUploadDialog from "@/components/PhotoUploadDialog";
import EditItemDialog from "@/components/EditItemDialog";
import DeleteItemButton from "@/components/DeleteItemButton";
import DonateModal from "@/components/DonateModal";
import ImpactCard from "@/components/ImpactCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHELF_ORDER = ["fridge", "freezer", "pantry", "other"] as const;
const SCALE_MAX = 14;

const SHELF_LABELS: Record<string, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  pantry: "Pantry",
  other: "Other",
};

/** Fridge / freezer / pantry only — same targets as drag-and-drop. */
const MOVE_TARGETS = ["fridge", "freezer", "pantry"] as const;

function daysLeft(unixSec: number, now: number) {
  return Math.floor((unixSec * 1000 - now) / 86_400_000);
}

type ShelfKey = (typeof SHELF_ORDER)[number];

export default function PantryKitchenBoard({
  items,
  nowMs,
  impact,
}: {
  items: PlainItem[];
  nowMs: number;
  impact: import("@/lib/impact").ImpactTotals;
}) {
  const router = useRouter();
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  const [threshold, setThreshold] = useState(3);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [localItems, setLocalItems] = useState(items);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const dragEndedRef = useRef(false);
  /** Touch / narrow: drag-and-drop is unreliable — use press-and-hold → move sheet instead. */
  const [useTouchShelfUi, setUseTouchShelfUi] = useState(false);
  const [moveSheetItem, setMoveSheetItem] = useState<PlainItem | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (max-width: 768px)");
    const apply = () => setUseTouchShelfUi(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!moveSheetItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoveSheetItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveSheetItem]);

  const selectedItems = useMemo(
    () => localItems.filter((i) => selectedIds.has(i.id)),
    [localItems, selectedIds]
  );
  const selectionCount = selectedIds.size;
  const allSelected = localItems.length > 0 && selectionCount === localItems.length;

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function selectAll() {
    setSelectedIds(new Set(localItems.map((i) => i.id)));
  }

  function cookSelected() {
    if (selectedItems.length === 0) return;
    const param = selectedItems.map((i) => i.name).join(",");
    router.push(`/recipe?ingredients=${encodeURIComponent(param)}`);
  }

  const urgentInHorizon = useMemo(() => {
    return localItems.filter((i) => daysLeft(i.expiryDate, now) <= threshold);
  }, [localItems, now, threshold]);

  const aboveLabel =
    threshold === 0 ? "today" : threshold === 1 ? "1 day" : `${threshold} days`;

  const rescueRecipeHref = `/recipe?ingredients=${encodeURIComponent(
    urgentInHorizon.map((i) => i.name).join(",")
  )}`;

  const buckets = useMemo(() => {
    const b: Record<ShelfKey, PlainItem[]> = {
      fridge: [],
      freezer: [],
      pantry: [],
      other: [],
    };
    for (const it of localItems) {
      const key = (SHELF_ORDER as readonly string[]).includes(it.storageLocation)
        ? (it.storageLocation as ShelfKey)
        : "other";
      b[key].push(it);
    }
    return b;
  }, [localItems]);

  const visibleShelves = useMemo((): ShelfKey[] => {
    const base: ShelfKey[] = ["fridge", "freezer", "pantry"];
    return buckets.other.length > 0 ? [...base, "other"] : base;
  }, [buckets.other.length]);

  function sortByExpiry(a: PlainItem, b: PlainItem) {
    return daysLeft(a.expiryDate, now) - daysLeft(b.expiryDate, now);
  }

  async function moveToShelf(itemId: number, targetShelf: string) {
    const main = ["fridge", "freezer", "pantry"] as const;
    if (!main.includes(targetShelf as (typeof main)[number])) return;
    const item = localItems.find((i) => i.id === itemId);
    if (!item || item.storageLocation === targetShelf) return;

    const previous = localItems;
    setLocalItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, storageLocation: targetShelf } : i))
    );

    const res = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageLocation: targetShelf }),
    });

    if (!res.ok) {
      setLocalItems(previous);
      return;
    }

    const data: { expiryDate?: string } = await res.json();
    if (data.expiryDate) {
      const expSec = Math.floor(new Date(data.expiryDate).getTime() / 1000);
      setLocalItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, storageLocation: targetShelf, expiryDate: expSec } : i
        )
      );
    }
    router.refresh();
  }

  const dyingCount = useMemo(
    () => localItems.filter((i) => daysLeft(i.expiryDate, now) <= 3).length,
    [localItems, now]
  );
  const expiredCount = useMemo(
    () => localItems.filter((i) => daysLeft(i.expiryDate, now) < 0).length,
    [localItems, now]
  );

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: selectionCount > 0 ? "24px 24px 96px" : "24px 24px 0",
      }}
      className="kitchen-board-outer"
    >
      {/* Split header: title + help · primary add CTA; deck = stats first (emphasis on in-window), then horizon */}
      <header style={{ marginBottom: 28 }}>
        <div
          className="kitchen-board-title-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-caption)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--caption)",
                marginBottom: 6,
              }}
            >
              One surface · sort by urgency · move between storage columns
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "var(--text-title)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.03em",
                  margin: 0,
                }}
              >
                Kitchen board
              </h1>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="How the kitchen board works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  padding: 0,
                  border: "2px solid var(--hairline)",
                  background: "var(--paper)",
                  color: "var(--caption)",
                  cursor: "pointer",
                  borderRadius: 0,
                  flexShrink: 0,
                }}
              >
                <CircleHelp size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
          <div className="kitchen-snap-slot" style={{ flexShrink: 0 }}>
            <PhotoUploadDialog triggerVariant="solid" />
          </div>
        </div>

        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent
            className="!z-[200000] sm:max-w-md !rounded-none !border-2 !border-black !bg-[var(--paper)] !p-6 !ring-0"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-subtitle)",
                  fontWeight: 600,
                  color: "#000",
                }}
              >
                How this board works
              </DialogTitle>
              <DialogDescription
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "#1a1a1a",
                  lineHeight: 1.55,
                  marginTop: 8,
                }}
              >
                <span style={{ display: "block", marginBottom: 12 }}>
                  Each ingredient sits in one storage column (fridge, freezer, pantry), ordered by
                  soonest expiry first.
                </span>
                <span style={{ display: "block", marginBottom: 12 }}>
                  The <strong>rescue window</strong> is adjustable: anything expiring within that many
                  days is highlighted in red everywhere on the board.
                </span>
                <span style={{ display: "block" }}>
                  On desktop, drag a tile to another column. On touch devices, press and hold a card to
                  move it. Use checkboxes to batch a recipe; use the row actions to edit or remove.
                </span>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <div
          className="kitchen-deck"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              border: "2px solid #000",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
              background: "var(--paper)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-caption)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--caption)",
                  marginBottom: 8,
                }}
              >
                In rescue window (expiry ≤ horizon)
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 4.5vw, var(--text-stat))",
                  fontWeight: 600,
                  lineHeight: 1,
                  color: "#c8102e",
                  marginBottom: 16,
                }}
              >
                {urgentInHorizon.length}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-caption)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <div style={{ borderBottom: "1px solid var(--hairline)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--caption)" }}>Total</span>
                  <div style={{ fontSize: "var(--text-step)", fontWeight: 700, color: "#000", marginTop: 4 }}>
                    {localItems.length}
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid var(--hairline)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--caption)" }}>Expiring ≤3d</span>
                  <div
                    style={{
                      fontSize: "var(--text-step)",
                      fontWeight: 700,
                      color: dyingCount ? "#c8102e" : "#000",
                      marginTop: 4,
                    }}
                  >
                    {dyingCount}
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid var(--hairline)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--caption)" }}>Expired</span>
                  <div
                    style={{
                      fontSize: "var(--text-step)",
                      fontWeight: 700,
                      color: expiredCount ? "#c8102e" : "#000",
                      marginTop: 4,
                    }}
                  >
                    {expiredCount}
                  </div>
                </div>
              </div>
            </div>
            {urgentInHorizon.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link
                  href={rescueRecipeHref}
                  style={{
                    display: "block",
                    textAlign: "center",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: "var(--text-ribbon)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "12px 14px",
                    border: "2px solid #000",
                    background: "#000",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                >
                  Cook what&apos;s in the window ({urgentInHorizon.length}) →
                </Link>
                <button
                  type="button"
                  onClick={() => setDonateOpen(true)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: "var(--text-ribbon)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "10px 14px",
                    border: "2px solid #057dbc",
                    background: "#fff",
                    color: "#057dbc",
                    cursor: "pointer",
                    borderRadius: 0,
                  }}
                >
                  ◉ Donate to community
                </button>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--caption)",
                  textAlign: "center",
                  padding: "8px 0",
                }}
              >
                Nothing in this window—slide the rule on the right to widen it.
              </div>
            )}
          </div>

          <div
            style={{
              border: "2px solid #000",
              padding: "18px 20px",
              background: "var(--paper)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-caption)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--caption)",
                marginBottom: 10,
              }}
            >
              Rescue horizon (highlight ≤)
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(var(--text-lg), 2.5vw, var(--text-subtitle))",
                fontWeight: 600,
                lineHeight: 1.2,
                marginBottom: 14,
                color: "#000",
              }}
            >
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
              aria-label="Days threshold for rescue highlight"
            />
            <div
              style={{
                position: "relative",
                height: 20,
                marginTop: 8,
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-caption)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--caption)",
              }}
            >
              {([[0, "NOW"], [3, "3D"], [7, "7D"], [SCALE_MAX, "14D"]] as [number, string][]).map(
                ([v, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setThreshold(v)}
                    style={{
                      position: "absolute",
                      left: `${(v / SCALE_MAX) * 100}%`,
                      transform: v === 0 ? "none" : v === SCALE_MAX ? "translateX(-100%)" : "translateX(-50%)",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: threshold === v ? "#000" : "var(--caption)",
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      fontWeight: "inherit",
                      letterSpacing: "inherit",
                      textDecoration: threshold === v ? "underline" : "none",
                    }}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Impact card */}
          <ImpactCard totals={impact} />
        </div>
      </header>

      {/* Select row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 0",
          borderTop: "2px solid #000",
          borderBottom: "1px solid var(--hairline)",
          marginBottom: 16,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => (allSelected ? clearSelection() : selectAll())}
            ref={(el) => {
              if (el) el.indeterminate = !allSelected && selectionCount > 0;
            }}
            style={{ width: 18, height: 18, accentColor: "#000", cursor: "pointer", margin: 0 }}
            aria-label="Select all items"
          />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-caption)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--caption)",
            }}
          >
            {selectionCount === 0
              ? "Select for batch recipe"
              : `${selectionCount} of ${localItems.length} selected`}
          </span>
        </label>
      </div>

      {/* Unified three (or four) columns */}
      <div
        className="kitchen-columns"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {visibleShelves.map((shelfKey) => {
          const list = [...buckets[shelfKey]].sort(sortByExpiry);
          const acceptsDrop = shelfKey !== "other";

          const urgent = list.filter((i) => daysLeft(i.expiryDate, now) <= threshold);
          const stable = list.filter((i) => daysLeft(i.expiryDate, now) > threshold);
          const isActiveDrop = acceptsDrop && dragOverKey === shelfKey;

          return (
            <section key={shelfKey}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-caption)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--caption)",
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span>{SHELF_LABELS[shelfKey]}</span>
                <span>{list.length}</span>
              </div>

              <div
                data-shelf={shelfKey}
                onDragOver={
                  acceptsDrop
                    ? (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverKey(shelfKey);
                      }
                    : undefined
                }
                onDragLeave={
                  acceptsDrop
                    ? (e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverKey(null);
                        }
                      }
                    : undefined
                }
                onDrop={
                  acceptsDrop
                    ? (e) => {
                        e.preventDefault();
                        setDragOverKey(null);
                        const raw = e.dataTransfer.getData("text/plain");
                        const id = Number(raw);
                        if (Number.isFinite(id)) void moveToShelf(id, shelfKey);
                      }
                    : undefined
                }
                style={{
                  minHeight: 120,
                  background: isActiveDrop ? "rgba(0,0,0,0.06)" : "transparent",
                  transition: "background 120ms ease",
                  borderBottom: "3px solid #000",
                  paddingBottom: 12,
                }}
              >
                {list.length === 0 && (
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-sm)",
                      color: "var(--caption)",
                      padding: "16px 8px",
                    }}
                  >
                    Empty
                  </div>
                )}

                {/* Rescue label — always rendered so all columns share the same top offset */}
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--text-caption)",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    color: urgent.length > 0 ? "#c8102e" : "transparent",
                    userSelect: "none",
                  }}
                  aria-hidden={urgent.length === 0}
                >
                  ≤ {aboveLabel} · rescue
                </div>

                {urgent.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {urgent.map((item) => (
                      <KitchenTile
                        key={item.id}
                        item={item}
                        now={now}
                        threshold={threshold}
                        selected={selectedIds.has(item.id)}
                        onToggleSelect={() => toggleSelected(item.id)}
                        dragEndedRef={dragEndedRef}
                        setDragOverKey={setDragOverKey}
                        useTouchShelfUi={useTouchShelfUi}
                        onOpenMoveSheet={() => setMoveSheetItem(item)}
                      />
                    ))}
                  </div>
                )}

                {stable.length > 0 && (
                  <div>
                    {urgent.length > 0 && (
                      <div
                        style={{
                          borderTop: "2px dashed rgba(200,16,46,0.35)",
                          margin: "14px 0 10px",
                        }}
                      />
                    )}
                    {stable.map((item) => (
                      <KitchenTile
                        key={item.id}
                        item={item}
                        now={now}
                        threshold={threshold}
                        selected={selectedIds.has(item.id)}
                        onToggleSelect={() => toggleSelected(item.id)}
                        dragEndedRef={dragEndedRef}
                        setDragOverKey={setDragOverKey}
                        useTouchShelfUi={useTouchShelfUi}
                        onOpenMoveSheet={() => setMoveSheetItem(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {selectionCount > 0 && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "#000",
            color: "#fff",
            borderTop: "2px solid #000",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: "space-between",
            flexWrap: "wrap",
            zIndex: 50,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-ribbon)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            {selectionCount} selected · {selectedItems.map((i) => i.name).slice(0, 3).join(", ")}
            {selectionCount > 3 && ` +${selectionCount - 3} more`}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={clearSelection}
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "var(--text-ribbon)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "10px 16px",
                border: "2px solid #fff",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={cookSelected}
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "var(--text-ribbon)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "10px 18px",
                border: "2px solid #fff",
                background: "#fff",
                color: "#000",
                cursor: "pointer",
              }}
            >
              Cook these ({selectionCount}) →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .kitchen-columns { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 900px) {
          .kitchen-deck { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .kitchen-deck { grid-template-columns: 1fr !important; }
          .kitchen-columns { grid-template-columns: 1fr !important; }
          .kitchen-board-title-row {
            flex-direction: column;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .kitchen-snap-slot button { width: 100%; justify-content: center; }
        }
        @media (max-width: 768px) {
          .kitchen-board-outer { padding: 16px 16px 96px !important; }
        }
      `}</style>

      {moveSheetItem && (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="move-sheet-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 160000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
            boxSizing: "border-box",
          }}
          onClick={() => setMoveSheetItem(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              background: "var(--paper)",
              border: "2px solid #000",
              padding: "24px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              id="move-sheet-title"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-caption)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--caption)",
                marginBottom: 8,
              }}
            >
              Move to storage
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-card-name)",
                fontWeight: 600,
                color: "#000",
                marginBottom: 20,
                lineHeight: 1.2,
              }}
            >
              {moveSheetItem.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MOVE_TARGETS.map((sk) => {
                const active = moveSheetItem.storageLocation === sk;
                return (
                  <button
                    key={sk}
                    type="button"
                    disabled={active}
                    onClick={() => {
                      void moveToShelf(moveSheetItem.id, sk);
                      setMoveSheetItem(null);
                    }}
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      fontSize: "var(--text-sm)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "14px 16px",
                      border: "2px solid #000",
                      background: active ? "#000" : "#fff",
                      color: active ? "#fff" : "#000",
                      cursor: active ? "default" : "pointer",
                      borderRadius: 0,
                      touchAction: "manipulation",
                    }}
                  >
                    {active ? "✓ " : ""}
                    {SHELF_LABELS[sk]}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setMoveSheetItem(null)}
              style={{
                marginTop: 16,
                width: "100%",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "var(--text-ribbon)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "12px",
                border: "2px solid var(--hairline)",
                background: "#fff",
                color: "#000",
                cursor: "pointer",
                borderRadius: 0,
                touchAction: "manipulation",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {donateOpen && urgentInHorizon.length > 0 && (
        <DonateModal items={urgentInHorizon} onClose={() => setDonateOpen(false)} />
      )}
    </div>
  );
}

function KitchenTile({
  item,
  now,
  threshold,
  selected,
  onToggleSelect,
  dragEndedRef,
  setDragOverKey,
  useTouchShelfUi,
  onOpenMoveSheet,
}: {
  item: PlainItem;
  now: number;
  threshold: number;
  selected: boolean;
  onToggleSelect: () => void;
  dragEndedRef: MutableRefObject<boolean>;
  setDragOverKey: (k: string | null) => void;
  useTouchShelfUi: boolean;
  onOpenMoveSheet: () => void;
}) {
  const router = useRouter();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockRecipeNavRef = useRef(false);
  const d = daysLeft(item.expiryDate, now);
  const inWindow = d <= threshold;
  const isDying = d <= 3;
  const dLabel = d < 0 ? "EXP" : `${d}d`;

  function goRecipe(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/recipe?ingredients=${encodeURIComponent(item.name)}`);
  }

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div
      draggable={!useTouchShelfUi}
      onDragStart={
        useTouchShelfUi
          ? undefined
          : (e) => {
              dragEndedRef.current = false;
              e.dataTransfer.setData("text/plain", String(item.id));
              e.dataTransfer.effectAllowed = "move";
            }
      }
      onDragEnd={
        useTouchShelfUi
          ? undefined
          : () => {
              dragEndedRef.current = true;
              setDragOverKey(null);
              window.setTimeout(() => {
                dragEndedRef.current = false;
              }, 80);
            }
      }
      onPointerDown={(e) => {
        if (!useTouchShelfUi || e.button !== 0) return;
        clearLongPressTimer();
        longPressTimer.current = setTimeout(() => {
          longPressTimer.current = null;
          blockRecipeNavRef.current = true;
          onOpenMoveSheet();
        }, 480);
      }}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onClick={() => {
        if (dragEndedRef.current) return;
        if (blockRecipeNavRef.current) {
          blockRecipeNavRef.current = false;
          return;
        }
        router.push(`/recipe?ingredients=${encodeURIComponent(item.name)}`);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/recipe?ingredients=${encodeURIComponent(item.name)}`);
        }
      }}
      style={{
        display: "flex",
        gap: 0,
        marginBottom: 8,
        border: "2px solid #000",
        background: selected ? "rgba(0,0,0,0.06)" : inWindow ? "rgba(200,16,46,0.06)" : "#fff",
        cursor: useTouchShelfUi ? "default" : "grab",
        boxShadow: selected ? "inset 0 0 0 2px #000" : "none",
        touchAction: "manipulation",
      }}
    >
      {/* Urgency spine */}
      <div
        style={{
          width: 5,
          flexShrink: 0,
          background: inWindow ? "#c8102e" : isDying ? "#c8102e" : "#000",
          opacity: inWindow ? 1 : 0.25,
        }}
        aria-hidden
      />

      <div style={{ flex: 1, minWidth: 0, padding: "8px 10px 10px", display: "flex", gap: 10 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Select ${item.name}`}
          style={{
            width: 17,
            height: 17,
            accentColor: "#000",
            cursor: "pointer",
            marginTop: 2,
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-2xs)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: inWindow ? "#c8102e" : "var(--caption)",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {item.category.replace(/_/g, " ")} · {dLabel}
            {d > 14 ? " · safe" : ""}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: inWindow ? 600 : 500,
              color: "#000",
              lineHeight: 1.15,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span>{item.name}</span>
            {item.isLocal && (
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-caption)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "2px 5px",
                  border: "1px solid #057dbc",
                  color: "#057dbc",
                }}
              >
                NM local
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--text-xs)",
              color: "var(--caption)",
              marginTop: 3,
            }}
          >
            {item.qty} {item.unit}
          </div>
          {!item.isLocal && item.localSwap && (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--text-2xs)",
                color: "#057dbc",
                marginTop: 4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              ◉ {item.localSwap.localProducer} · {item.localSwap.whereToBuy.split(",")[0]}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 8,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={goRecipe}
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "var(--text-ribbon)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "5px 10px",
                border: "2px solid #000",
                background: inWindow ? "#000" : "#fff",
                color: inWindow ? "#fff" : "#000",
                cursor: "pointer",
              }}
            >
              Recipe
            </button>
            <EditItemDialog
              id={item.id}
              name={item.name}
              qty={item.qty}
              unit={item.unit}
              storageLocation={item.storageLocation}
              expiryDate={item.expiryDate}
              isLocal={item.isLocal}
            />
            <DeleteItemButton id={item.id} name={item.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
