"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DAY_OPTIONS = [3, 5, 7, 10, 14];
const CAL_OPTIONS = [1000, 1200, 1500, 2000, 2500, 3000];

function getMondayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().split("T")[0];
}

type Step = "days" | "calories" | "ideas";

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("days");
  const [numDays, setNumDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [customCal, setCustomCal] = useState("");
  const [mealIdeas, setMealIdeas] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedDays = (numDays ?? parseInt(customDays)) || null;
  const resolvedCal = (calorieTarget ?? parseInt(customCal)) || null;

  async function handleGenerate() {
    if (!resolvedDays || !resolvedCal) return;
    setLoading(true);
    setError(null);
    try {
      const ideas = mealIdeas.map((m) => m.trim()).filter(Boolean);
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numDays: resolvedDays,
          calorieTarget: resolvedCal,
          weekStart: getMondayISO(),
          mealIdeas: ideas,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      router.push("/plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  // ─── shared styles ───────────────────────────────────────────────────────────
  const pill = (active: boolean): React.CSSProperties => ({
    border: `2px solid ${active ? "#000" : "#e2e8f0"}`,
    background: active ? "#000" : "#fff",
    color: active ? "#fff" : "#1a1a1a",
    fontFamily: "var(--font-ui)",
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 20px",
    cursor: "pointer",
    borderRadius: 0,
    letterSpacing: "0.05em",
  });

  const nextBtn: React.CSSProperties = {
    background: "#000", color: "#fff",
    border: "2px solid #000",
    fontFamily: "var(--font-ui)",
    fontSize: 12, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    padding: "12px 28px", cursor: "pointer", borderRadius: 0,
    marginTop: 32,
  };

  const label: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 10, textTransform: "uppercase",
    letterSpacing: "0.12em", color: "#757575",
    marginBottom: 16, display: "block",
  };

  const heading: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-subtitle)", fontWeight: 700,
    color: "#1a1a1a", marginBottom: 8,
  };

  // ─── Step: days ──────────────────────────────────────────────────────────────
  if (step === "days") return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575", marginBottom: 8 }}>
        STEP 1 OF 3
      </div>
      <h1 style={heading}>How many days do you want to plan for?</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#757575", marginBottom: 32 }}>
        We&apos;ll generate breakfast, lunch, and dinner for each day.
      </p>

      <span style={label}>QUICK SELECT</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
        {DAY_OPTIONS.map((d) => (
          <button key={d} style={pill(numDays === d)} onClick={() => { setNumDays(d); setCustomDays(""); }}>
            {d} DAYS
          </button>
        ))}
      </div>

      <span style={label}>OR TYPE A NUMBER</span>
      <input
        type="number" min={1} max={30}
        placeholder="e.g. 21"
        value={customDays}
        onChange={(e) => { setCustomDays(e.target.value); setNumDays(null); }}
        style={{
          border: "2px solid #000", padding: "10px 14px",
          fontFamily: "var(--font-ui)", fontSize: 14,
          width: 120, background: "#fff", color: "#1a1a1a",
          borderRadius: 0, outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          style={{ ...nextBtn, opacity: resolvedDays ? 1 : 0.4, cursor: resolvedDays ? "pointer" : "default" }}
          disabled={!resolvedDays}
          onClick={() => resolvedDays && setStep("calories")}
        >
          NEXT →
        </button>
        <Link href="/plan" style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#757575", textDecoration: "none", marginTop: 32 }}>
          CANCEL
        </Link>
      </div>
    </main>
  );

  // ─── Step: calories ───────────────────────────────────────────────────────────
  if (step === "calories") return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575", marginBottom: 8 }}>
        STEP 2 OF 3
      </div>
      <h1 style={heading}>Daily calorie target?</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#757575", marginBottom: 32 }}>
        Meals will be balanced across breakfast (~25%), lunch (~35%), dinner (~40%).
      </p>

      <span style={label}>QUICK SELECT</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
        {CAL_OPTIONS.map((c) => (
          <button key={c} style={pill(calorieTarget === c)} onClick={() => { setCalorieTarget(c); setCustomCal(""); }}>
            {c.toLocaleString()} CAL
          </button>
        ))}
      </div>

      <span style={label}>OR TYPE A NUMBER</span>
      <input
        type="number" min={500} max={6000} step={50}
        placeholder="e.g. 1800"
        value={customCal}
        onChange={(e) => { setCustomCal(e.target.value); setCalorieTarget(null); }}
        style={{
          border: "2px solid #000", padding: "10px 14px",
          fontFamily: "var(--font-ui)", fontSize: 14,
          width: 140, background: "#fff", color: "#1a1a1a",
          borderRadius: 0, outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 12 }}>
        <button style={{ ...nextBtn, background: "#fff", color: "#000" }} onClick={() => setStep("days")}>
          ← BACK
        </button>
        <button
          style={{ ...nextBtn, opacity: resolvedCal ? 1 : 0.4, cursor: resolvedCal ? "pointer" : "default" }}
          disabled={!resolvedCal}
          onClick={() => resolvedCal && setStep("ideas")}
        >
          NEXT →
        </button>
      </div>
    </main>
  );

  // ─── Step: meal ideas ─────────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575", marginBottom: 8 }}>
        STEP 3 OF 3
      </div>
      <h1 style={heading}>Any meal ideas?</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#757575", marginBottom: 8 }}>
        Optional — leave blank and AI will plan everything from your pantry.
      </p>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#757575", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 32 }}>
        {resolvedDays} DAYS · {resolvedCal?.toLocaleString()} CAL/DAY
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {mealIdeas.map((idea, i) => (
          <div key={i} style={{ borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#757575", width: 24, flexShrink: 0 }}>
              {i + 1}
            </span>
            <input
              value={idea}
              placeholder="e.g. Chicken tacos, pasta bake…"
              onChange={(e) => {
                const next = [...mealIdeas];
                next[i] = e.target.value;
                setMealIdeas(next);
              }}
              style={{
                flex: 1, border: "none", padding: "12px 0",
                fontFamily: "var(--font-body)", fontSize: 16,
                background: "transparent", outline: "none", color: "#1a1a1a",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        {mealIdeas.length < resolvedDays! && (
          <button
            onClick={() => setMealIdeas((p) => [...p, ""])}
            style={{ ...nextBtn, background: "#fff", color: "#000", marginTop: 0 }}
          >
            + ADD IDEA
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#c8102e", border: "1px solid #c8102e", padding: "8px 12px", marginTop: 24 }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button style={{ ...nextBtn, background: "#fff", color: "#000" }} onClick={() => setStep("calories")}>
          ← BACK
        </button>
        <div>
          <button
            style={{ ...nextBtn, opacity: loading ? 0.5 : 1, cursor: loading ? "default" : "pointer" }}
            disabled={loading}
            onClick={handleGenerate}
          >
            {loading ? "GENERATING…" : "◎ GENERATE PLAN"}
          </button>
          {loading && (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "#757575", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 10 }}>
              This takes ~20–30 seconds…
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
