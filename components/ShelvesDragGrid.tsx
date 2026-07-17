"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ShelfDragItem = {
  id: number;
  name: string;
  category: string;
  qty: number;
  unit: string;
  storageLocation: string;
  expiryDate: number;
  isLocal?: boolean;
};

const SHELF_ORDER = ["fridge", "freezer", "pantry"] as const;

type Props = {
  items: ShelfDragItem[];
  shelfLabels: Record<string, string>;
  nameFontSize?: number;
  /** Server time for first paint — avoids SSR/client `Date.now()` hydration mismatch. */
  nowMs: number;
};

export default function ShelvesDragGrid({
  items: itemsProp,
  shelfLabels,
  nameFontSize = 15,
  nowMs,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(itemsProp);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragEndedRef = useRef(false);

  useEffect(() => {
    setItems(itemsProp);
  }, [itemsProp]);

  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  function days(unix: number) {
    return Math.floor((unix * 1000 - now) / 86_400_000);
  }

  const buckets = useMemo(() => {
    const b: Record<string, ShelfDragItem[]> = { fridge: [], freezer: [], pantry: [], other: [] };
    for (const it of items) {
      const key = (SHELF_ORDER as readonly string[]).includes(it.storageLocation)
        ? it.storageLocation
        : "other";
      b[key].push(it);
    }
    return b;
  }, [items]);

  const shelves = useMemo(() => {
    const tail = buckets.other.length > 0 ? (["other"] as const) : [];
    return [...SHELF_ORDER, ...tail];
  }, [buckets.other.length]);

  async function moveToShelf(itemId: number, targetShelf: string) {
    if (!(SHELF_ORDER as readonly string[]).includes(targetShelf)) return;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.storageLocation === targetShelf) return;

    const previous = items;
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, storageLocation: targetShelf } : i))
    );

    const res = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageLocation: targetShelf }),
    });

    if (!res.ok) {
      setItems(previous);
      return;
    }

    const data: { expiryDate?: string } = await res.json();
    if (data.expiryDate) {
      const expSec = Math.floor(new Date(data.expiryDate).getTime() / 1000);
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, storageLocation: targetShelf, expiryDate: expSec } : i
        )
      );
    }
    router.refresh();
  }

  return (
    <>
      {shelves.map((key) => {
        const acceptsDrop = (SHELF_ORDER as readonly string[]).includes(key);
        const isActiveDrop = acceptsDrop && dragOverKey === key;
        return (
          <section key={key} style={{ marginBottom: 40 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--caption)",
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{shelfLabels[key] ?? key.toUpperCase()}</span>
              <span>
                {buckets[key].length} {buckets[key].length === 1 ? "ITEM" : "ITEMS"}
              </span>
            </div>
            <div
              data-shelf={key}
              onDragOver={
                acceptsDrop
                  ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverKey(key);
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
                      if (Number.isFinite(id)) void moveToShelf(id, key);
                    }
                  : undefined
              }
              style={{
                borderBottom: "4px solid #000",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: 8,
                paddingBottom: 0,
                minHeight: 96,
                background: isActiveDrop ? "rgba(0,0,0,0.06)" : "transparent",
                transition: "background 120ms ease",
              }}
              className="shelf-row"
            >
              {buckets[key].map((item) => {
                const d = days(item.expiryDate);
                const isExpiring = d <= 3;
                const dLabel = d < 0 ? "EXP" : `${d}D`;
                const w = Math.min(180, Math.max(88, item.name.length * 11 + 28));
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      dragEndedRef.current = false;
                      e.dataTransfer.setData("text/plain", String(item.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      dragEndedRef.current = true;
                      setDragOverKey(null);
                      window.setTimeout(() => {
                        dragEndedRef.current = false;
                      }, 80);
                    }}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/recipe?ingredients=${encodeURIComponent(item.name)}`);
                      }
                    }}
                    onClick={() => {
                      if (dragEndedRef.current) return;
                      router.push(`/recipe?ingredients=${encodeURIComponent(item.name)}`);
                    }}
                    title={`${item.name} · ${item.qty} ${item.unit} · ${dLabel} · drag to another shelf`}
                    style={{
                      width: w,
                      height: 88,
                      border: "2px solid #000",
                      background: isExpiring ? "#c8102e" : "#fff",
                      color: isExpiring ? "#fff" : "#000",
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      flexShrink: 0,
                      cursor: "grab",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        opacity: isExpiring ? 0.95 : 0.6,
                      }}
                    >
                      {item.category.replace(/_/g, " ")}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: nameFontSize,
                        lineHeight: 1.05,
                        textTransform: "uppercase",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {item.qty}
                        {item.unit === "each" ? "" : ` ${item.unit}`}
                      </span>
                      <span>{dLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
