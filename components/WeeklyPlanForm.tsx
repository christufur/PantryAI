"use client";

import { useState } from "react";

const DAY_ABBR = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type MealSlot = {
  mealName: string;
  servings: number;
};

type DayPlan = {
  dayIndex: number;
  mealName: string;
  usesFromPantry: { name: string; qty: number; unit: string }[];
  needsToBuy: { name: string; qty: number; unit: string }[];
};

type ShoppingItem = {
  name: string;
  qty: number;
  unit: string;
  localAlternative?: {
    localProducer: string;
    product: string;
    whereToBuy: string;
  };
};

type WeeklyPlanResponse = {
  days: DayPlan[];
  shoppingList: ShoppingItem[];
};

function getMondayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split("T")[0];
}

export default function WeeklyPlanForm() {
  const [meals, setMeals] = useState<MealSlot[]>([
    { mealName: "", servings: 2 },
    { mealName: "", servings: 2 },
    { mealName: "", servings: 2 },
  ]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WeeklyPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateMeal(index: number, field: keyof MealSlot, value: string | number) {
    setMeals((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  function addSlot() {
    if (meals.length < 7) {
      setMeals((prev) => [...prev, { mealName: "", servings: 2 }]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validMeals = meals.filter((m) => m.mealName.trim());
    if (validMeals.length === 0) {
      setError("Please enter at least one meal.");
      return;
    }
    setError(null);
    setLoading(true);
    setPlan(null);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meals: validMeals,
          weekStart: getMondayISO(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate plan");
      }

      const data = await res.json();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .wired-plan-cols {
            grid-template-columns: 1fr !important;
            padding: 0 !important;
          }
          .wired-form-submit {
            width: 100% !important;
          }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Meal input slots */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {meals.map((meal, i) => (
              <div
                key={i}
                style={{
                  borderBottom: "1px solid #e2e8f0",
                  padding: "12px 0",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                {/* Day kicker */}
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "#757575",
                    letterSpacing: "0.1em",
                    width: 40,
                    flexShrink: 0,
                    textTransform: "uppercase",
                  }}
                >
                  {DAY_ABBR[i] || `DAY ${i + 1}`}
                </div>

                {/* Meal name input */}
                <input
                  id={`meal-${i}`}
                  placeholder="Meal name..."
                  value={meal.mealName}
                  onChange={(e) => updateMeal(i, "mealName", e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    borderBottom: "2px solid #000",
                    padding: "6px 0",
                    fontFamily: "Lora, serif",
                    fontSize: 16,
                    background: "transparent",
                    outline: "none",
                    color: "#1a1a1a",
                  }}
                />

                {/* Servings input */}
                <input
                  id={`servings-${i}`}
                  type="number"
                  min={1}
                  max={12}
                  value={meal.servings}
                  onChange={(e) => updateMeal(i, "servings", parseInt(e.target.value) || 1)}
                  style={{
                    width: 48,
                    border: "2px solid #000",
                    padding: "6px 8px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    textAlign: "center",
                    background: "#ffffff",
                    color: "#1a1a1a",
                    borderRadius: 0,
                    outline: "none",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Buttons row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {meals.length < 7 && (
              <button
                type="button"
                onClick={addSlot}
                style={{
                  background: "transparent",
                  border: "2px solid #000",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#1a1a1a",
                  padding: "8px 14px",
                  borderRadius: 0,
                  cursor: "pointer",
                }}
              >
                + ADD DAY
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="wired-form-submit"
              style={{
                background: loading ? "#e2e8f0" : "#000",
                color: loading ? "#757575" : "#fff",
                border: "2px solid #000",
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "10px 24px",
                borderRadius: 0,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "GENERATING…" : "◎ GENERATE PLAN"}
            </button>
          </div>

          {error && (
            <p
              style={{
                fontFamily: "Lora, serif",
                fontSize: 14,
                color: "#c8102e",
                border: "1px solid #c8102e",
                padding: "8px 12px",
              }}
            >
              {error}
            </p>
          )}
        </form>

        {plan && (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {/* Day cards */}
            <div
              className="wired-plan-cols"
              style={{
                display: "grid",
                gap: 0,
                gridTemplateColumns: "1fr",
              }}
            >
              {plan.days.map((day) => (
                <div
                  key={day.dayIndex}
                  style={{
                    border: "2px solid #000",
                    borderLeft: "2px solid #000",
                    marginBottom: 16,
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      borderBottom: "1px solid #000",
                      padding: "8px 14px",
                      background: "#000",
                      color: "#fff",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {DAY_ABBR[day.dayIndex] ?? `DAY ${day.dayIndex + 1}`} · {day.mealName.toUpperCase()}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: 14 }}>
                    {day.usesFromPantry.length > 0 && (
                      <>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: "#057dbc",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: 4,
                          }}
                        >
                          FROM PANTRY
                        </div>
                        {day.usesFromPantry.map((item) => (
                          <div key={item.name} style={{ fontFamily: "Lora, serif", fontSize: 14, color: "#1a1a1a" }}>
                            ✓ {item.name}
                          </div>
                        ))}
                      </>
                    )}

                    {day.needsToBuy.length > 0 && (
                      <>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: "#757575",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginTop: 10,
                            marginBottom: 4,
                          }}
                        >
                          TO BUY
                        </div>
                        {day.needsToBuy.map((item) => (
                          <div key={item.name} style={{ fontFamily: "Lora, serif", fontSize: 14, color: "#757575" }}>
                            ○ {item.name}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Shopping List */}
            {plan.shoppingList.length > 0 && (
              <div>
                {/* Black ribbon */}
                <div
                  style={{
                    background: "#000",
                    color: "#fff",
                    padding: "14px 20px",
                    marginBottom: 24,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  SHOPPING LIST
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {plan.shoppingList.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        padding: "14px 0",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontFamily: "'Source Serif 4', serif",
                            fontSize: 17,
                            fontWeight: 600,
                            color: "#1a1a1a",
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: "#757575",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            border: "1px solid #e2e8f0",
                            padding: "2px 8px",
                          }}
                        >
                          {item.qty} {item.unit}
                        </span>
                      </div>

                      {item.localAlternative && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10,
                              color: "#057dbc",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                            }}
                          >
                            LOCAL ALTERNATIVE AVAILABLE
                          </div>
                          <p
                            style={{
                              fontFamily: "Lora, serif",
                              fontSize: 13,
                              color: "#1a1a1a",
                              margin: 0,
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{item.localAlternative.localProducer}</span>
                            {" — "}
                            {item.localAlternative.product} at{" "}
                            <span style={{ fontWeight: 700 }}>{item.localAlternative.whereToBuy}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
