"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type Ingredient = { name: string; qty: number; unit: string };
export type Meal = {
  id: number;
  mealType: string;
  mealName: string;
  estimatedCalories: number | null;
  usesFromPantry: Ingredient[];
  needsToBuy: Ingredient[];
};
export type DayData = { dayIndex: number; date: string; meals: Meal[] };

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const EMOJI: Record<string, string> = { breakfast: "☀", lunch: "☁", dinner: "☽" };
const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

const STORAGE_KEY = "pantry-completed-meals";

function loadCompleted(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompleted(set: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export default function WeekGrid({
  days,
  todayIndex,
  planId,
}: {
  days: DayData[];
  todayIndex: number;
  planId: number;
}) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [removing, setRemoving] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"breakfast" | "lunch" | "dinner">("dinner");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompleted(loadCompleted());
  }, []);

  const current = openDay != null ? days.find((d) => d.dayIndex === openDay) : null;

  function closeModal() {
    setOpenDay(null);
    setAdding(false);
    setNewName("");
    setNewType("dinner");
  }

  function toggleCompleted(mealId: number) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(mealId) ? next.delete(mealId) : next.add(mealId);
      saveCompleted(next);
      return next;
    });
  }

  async function handleRemove(mealId: number) {
    setRemoving(mealId);
    await fetch(`/api/meal/${mealId}`, { method: "DELETE" });
    setRemoving(null);
    router.refresh();
  }

  async function handleAdd() {
    if (!newName.trim() || openDay == null) return;
    setSaving(true);
    await fetch("/api/meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, dayIndex: openDay, mealType: newType, mealName: newName.trim() }),
    });
    setSaving(false);
    setAdding(false);
    setNewName("");
    setNewType("dinner");
    router.refresh();
  }

  return (
    <>
      {/* Week grid tiles */}
      <div className="plan-week-grid">
        {DAY_LABELS.map((label, i) => {
          const day = days.find((d) => d.dayIndex === i);
          const isToday = i === todayIndex;
          const doneCount = day?.meals.filter((m) => completed.has(m.id)).length ?? 0;
          return (
            <button
              key={i}
              onClick={() => day && setOpenDay(i)}
              disabled={!day}
              style={{
                border: "none",
                borderRight: i === 6 ? "none" : "1px solid var(--hairline)",
                padding: 10,
                minHeight: 160,
                background: isToday ? "#000" : "var(--paper)",
                color: isToday ? "#fff" : "#000",
                textAlign: "left",
                cursor: day ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", opacity: isToday ? 0.9 : 0.6 }}>
                {label}{day?.date ? ` · ${day.date}` : ""}
              </div>
              {day ? (
                <>
                  {day.meals.map((m, mi) => (
                    <div key={mi} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                      <span style={{ fontSize: 11, opacity: 0.75, flexShrink: 0 }}>{EMOJI[m.mealType] ?? "·"}</span>
                      <span style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        lineHeight: 1.2,
                        fontWeight: 600,
                        textDecoration: completed.has(m.id) ? "line-through" : "none",
                        opacity: completed.has(m.id) ? 0.4 : 1,
                      }}>
                        {m.mealName}
                      </span>
                    </div>
                  ))}
                  {doneCount > 0 && (
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: isToday ? "rgba(255,255,255,0.5)" : "var(--caption)", marginTop: 2 }}>
                      {doneCount}/{day.meals.length} DONE
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontStyle: "italic", color: isToday ? "rgba(255,255,255,0.6)" : "var(--caption)" }}>
                  —
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day modal */}
      {current && (
        <div
          onClick={closeModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", border: "2px solid #000", maxWidth: 520, width: "100%", maxHeight: "85vh", overflow: "auto", padding: "24px 28px" }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--caption)" }}>
                {DAY_LABELS[current.dayIndex]} · {current.date}
              </div>
              <button onClick={closeModal} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 20, fontFamily: "monospace", lineHeight: 1 }}>×</button>
            </div>

            {/* Meal list */}
            {current.meals.length === 0 && !adding && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--caption)", marginBottom: 16 }}>No meals planned. Add one below.</p>
            )}

            {current.meals.map((m) => {
              const done = completed.has(m.id);
              const isRemoving = removing === m.id;
              return (
                <div
                  key={m.id}
                  style={{ borderBottom: "1px solid var(--hairline)", padding: "12px 0", display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleCompleted(m.id)}
                    style={{
                      width: 20, height: 20, flexShrink: 0,
                      border: `2px solid ${done ? "#000" : "#aaa"}`,
                      background: done ? "#000" : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 2,
                    }}
                    title={done ? "Mark incomplete" : "Mark complete"}
                  >
                    {done && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                  </button>

                  {/* Meal info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--caption)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                      {EMOJI[m.mealType] ?? "·"} {m.mealType}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16, fontWeight: 600,
                      textDecoration: done ? "line-through" : "none",
                      opacity: done ? 0.4 : 1,
                    }}>
                      {m.mealName}
                    </div>
                    {(m.usesFromPantry.length > 0 || m.needsToBuy.length > 0) && !done && (
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 6 }}>
                        {m.usesFromPantry.length > 0 && (
                          <div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--link)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>FROM PANTRY</div>
                            {m.usesFromPantry.map((item) => (
                              <div key={item.name} style={{ fontFamily: "var(--font-body)", fontSize: 12 }}>✓ {item.name}</div>
                            ))}
                          </div>
                        )}
                        {m.needsToBuy.length > 0 && (
                          <div>
                            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--caption)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>TO BUY</div>
                            {m.needsToBuy.map((item) => (
                              <div key={item.name} style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--caption)" }}>○ {item.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={isRemoving}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#aaa", fontSize: 16, lineHeight: 1, flexShrink: 0, opacity: isRemoving ? 0.3 : 1 }}
                    title="Remove meal"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Add meal form */}
            {adding ? (
              <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as typeof newType)}
                  style={{ fontFamily: "var(--font-ui)", fontSize: 11, textTransform: "uppercase", border: "2px solid #000", padding: "6px 10px", background: "#fff", cursor: "pointer" }}
                >
                  {MEAL_TYPES.map((t) => (
                    <option key={t} value={t}>{EMOJI[t]} {t}</option>
                  ))}
                </select>
                <input
                  autoFocus
                  placeholder="Meal name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  style={{ fontFamily: "var(--font-body)", fontSize: 15, border: "none", borderBottom: "2px solid #000", outline: "none", padding: "6px 0", background: "transparent" }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleAdd}
                    disabled={!newName.trim() || saving}
                    style={{ flex: 1, background: "#000", color: "#fff", border: "2px solid #000", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 0", cursor: "pointer", opacity: (!newName.trim() || saving) ? 0.4 : 1 }}
                  >
                    {saving ? "ADDING…" : "ADD"}
                  </button>
                  <button
                    onClick={() => { setAdding(false); setNewName(""); }}
                    style={{ background: "#fff", color: "#000", border: "2px solid #000", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "10px 16px", cursor: "pointer" }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                style={{ marginTop: 16, width: "100%", border: "2px dashed #aaa", background: "transparent", fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--caption)", padding: "12px 0", cursor: "pointer" }}
              >
                + ADD MEAL
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
