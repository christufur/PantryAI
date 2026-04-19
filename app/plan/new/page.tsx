"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CUISINES = [
  "Mediterranean",
  "Mexican",
  "Asian",
  "Italian",
  "Indian",
  "American comfort",
  "Middle Eastern",
];

const TIME_OPTIONS = [
  { id: "15", label: "≤ 15 MIN" },
  { id: "30", label: "≤ 30 MIN" },
  { id: "any", label: "NO RUSH" },
];

const STYLE_OPTIONS = [
  { id: "fresh", label: "FRESH EACH MEAL" },
  { id: "batch", label: "BATCH COOK / LEFTOVERS OK" },
];

type ProfileLite = { dietary: string; allergies: string };

function getMondayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().split("T")[0];
}

type Step = "days" | "calories" | "vibes";

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("days");
  const [numDays, setNumDays] = useState<number>(7);
  const [calorieTarget, setCalorieTarget] = useState<string>("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [timeBudget, setTimeBudget] = useState<string | null>(null);
  const [cookStyle, setCookStyle] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => setProfile({ dietary: p.dietary ?? "", allergies: p.allergies ?? "" }))
      .catch(() => {});
  }, []);

  const resolvedCal = parseInt(calorieTarget) || null;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const ideas: string[] = [];
      if (cuisines.length > 0) ideas.push(`Cuisines: ${cuisines.join(", ")}`);
      if (timeBudget === "15") ideas.push("Keep weeknight meals under 15 minutes of active cooking.");
      else if (timeBudget === "30") ideas.push("Keep weeknight meals under 30 minutes of active cooking.");
      if (cookStyle === "batch") ideas.push("Batch cooking & leftovers are encouraged — it's fine to repeat or reuse meals across days.");
      else if (cookStyle === "fresh") ideas.push("Cook fresh for each meal — avoid repeating the same dish across days.");
      if (note.trim()) ideas.push(`Avoid this week: ${note.trim()}`);
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numDays,
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

  if (step === "days") return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575", marginBottom: 8 }}>
        STEP 1 OF 3
      </div>
      <h1 style={heading}>How many days do you want to plan for?</h1>
<<<<<<< HEAD
      <p style={{ fontFamily: "Lora, serif", fontSize: 15, color: "#757575", marginBottom: 40 }}>
=======
      <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#757575", marginBottom: 32 }}>
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
        We&apos;ll generate breakfast, lunch, and dinner for each day.
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 64, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>
          {numDays}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#757575", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          DAYS
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={14}
        value={numDays}
        onChange={(e) => setNumDays(parseInt(e.target.value))}
        style={{
<<<<<<< HEAD
          width: "100%",
          accentColor: "#000",
          marginTop: 16,
          marginBottom: 8,
          cursor: "pointer",
=======
          border: "2px solid #000", padding: "10px 14px",
          fontFamily: "var(--font-ui)", fontSize: 14,
          width: 120, background: "#fff", color: "#1a1a1a",
          borderRadius: 0, outline: "none",
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#757575", letterSpacing: "0.08em", marginBottom: 24 }}>
        <span>1</span><span>7</span><span>14</span>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button style={nextBtn} onClick={() => setStep("calories")}>
          NEXT →
        </button>
        <Link href="/plan" style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#757575", textDecoration: "none", marginTop: 32 }}>
          CANCEL
        </Link>
      </div>
    </main>
  );

  if (step === "calories") return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575", marginBottom: 8 }}>
        STEP 2 OF 3
      </div>
<<<<<<< HEAD
      <h1 style={heading}>Daily calorie target? <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 400, color: "#999", letterSpacing: "0.08em" }}>(optional)</span></h1>
      <p style={{ fontFamily: "Lora, serif", fontSize: 15, color: "#757575", marginBottom: 32 }}>
        Leave blank and we&apos;ll aim for a balanced ~2,000/day.
=======
      <h1 style={heading}>Daily calorie target?</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#757575", marginBottom: 32 }}>
        Meals will be balanced across breakfast (~25%), lunch (~35%), dinner (~40%).
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
      </p>

      <span style={label}>TYPE A NUMBER</span>
      <input
        type="number" min={500} max={6000} step={50}
        placeholder="e.g. 1800"
        value={calorieTarget}
        onChange={(e) => setCalorieTarget(e.target.value)}
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
        <button style={nextBtn} onClick={() => setStep("vibes")}>
          NEXT →
        </button>
      </div>
    </main>
  );

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#757575", marginBottom: 8 }}>
        STEP 3 OF 3
      </div>
<<<<<<< HEAD
      <h1 style={heading}>Tune your plan</h1>
      <p style={{ fontFamily: "Lora, serif", fontSize: 15, color: "#757575", marginBottom: 8 }}>
        Everything here is optional — skip to let AI choose freely.
      </p>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#757575", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 24 }}>
        {numDays} DAYS {resolvedCal ? `· ${resolvedCal.toLocaleString()} CAL/DAY` : "· BALANCED CAL"}
      </p>

      {profile && (profile.dietary || profile.allergies) && (
        <div style={{
          border: "1px solid #000", padding: "12px 14px", marginBottom: 32,
          background: "#f8f8f5",
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1a1a1a", marginBottom: 6 }}>
            ✓ APPLYING FROM SETTINGS
=======
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
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
          </div>
          <div style={{ fontFamily: "Lora, serif", fontSize: 14, color: "#1a1a1a", lineHeight: 1.5 }}>
            {profile.dietary && <div>Dietary: {profile.dietary}</div>}
            {profile.allergies && <div>Allergies: {profile.allergies}</div>}
          </div>
          <Link href="/settings" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#757575", textDecoration: "underline", marginTop: 6, display: "inline-block" }}>
            EDIT →
          </Link>
        </div>
      )}

      <span style={label}>CUISINES (MULTI-SELECT)</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
        {CUISINES.map((c) => {
          const active = cuisines.includes(c);
          return (
            <button
              key={c}
              style={pill(active)}
              onClick={() =>
                setCuisines((prev) =>
                  active ? prev.filter((x) => x !== c) : [...prev, c]
                )
              }
            >
              {c.toUpperCase()}
            </button>
          );
        })}
      </div>

      <span style={label}>WEEKNIGHT TIME BUDGET</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
        {TIME_OPTIONS.map((t) => (
          <button key={t.id} style={pill(timeBudget === t.id)} onClick={() => setTimeBudget(timeBudget === t.id ? null : t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <span style={label}>COOKING STYLE</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
        {STYLE_OPTIONS.map((s) => (
          <button key={s.id} style={pill(cookStyle === s.id)} onClick={() => setCookStyle(cookStyle === s.id ? null : s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <span style={label}>ANYTHING TO AVOID THIS WEEK? (OPTIONAL)</span>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. no chicken this week, tired of pasta…"
        rows={2}
        style={{
          width: "100%",
          border: "2px solid #000",
          padding: "10px 14px",
          fontFamily: "Lora, serif",
          fontSize: 15,
          background: "#fff",
          color: "#1a1a1a",
          borderRadius: 0,
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

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
