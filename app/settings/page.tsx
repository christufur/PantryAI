"use client";

import { useEffect, useState } from "react";
import NotifyButton from "@/components/NotifyButton";

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Halal", "Kosher", "Low-Carb / Keto", "Paleo",
];

const NUTRITION_OPTIONS = [
  "High-Protein", "Low-Sodium", "Low-Calorie", "Heart-Healthy",
  "Diabetic-Friendly", "High-Fiber",
];

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function CheckPill({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        ...mono,
        fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.06em",
        padding: "7px 14px",
        border: `2px solid ${checked ? "#000" : "var(--hairline)"}`,
        background: checked ? "#000" : "#fff",
        color: checked ? "#fff" : "var(--caption)",
        cursor: "pointer",
        transition: "all 100ms",
      }}
    >
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const [dietary, setDietary] = useState<string[]>([]);
  const [nutritionalGoals, setNutritionalGoals] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [householdSize, setHouseholdSize] = useState(2);
  const [cookingSkill, setCookingSkill] = useState("intermediate");
  const [aboutMe, setAboutMe] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => {
        setDietary(p.dietary ? p.dietary.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
        setNutritionalGoals(p.nutritionalGoals ? p.nutritionalGoals.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
        setAllergies(p.allergies ?? "");
        setHouseholdSize(p.householdSize ?? 2);
        setCookingSkill(p.cookingSkill ?? "intermediate");
        setAboutMe(p.aboutMe ?? "");
        setLoading(false);
      });
  }, []);

  function toggleList(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietary: dietary.join(","),
          allergies,
          nutritionalGoals: nutritionalGoals.join(","),
          householdSize,
          cookingSkill,
          aboutMe,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    border: "2px solid #000", background: "#fff",
    fontFamily: "Lora, serif", fontSize: 15,
    outline: "none", boxSizing: "border-box",
    resize: "vertical",
  };

  if (loading) return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 32px 80px" }}>
      <div style={{ borderBottom: "2px solid #000", marginBottom: 40, paddingBottom: 20 }}>
        <div style={{ width: 220, height: 10, background: "#e8e8e8", marginBottom: 10, animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ width: 160, height: 48, background: "#e8e8e8", animation: "pulse 1.4s ease-in-out infinite" }} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ marginBottom: 36 }}>
          <div style={{ width: 140, height: 10, background: "#e8e8e8", marginBottom: 14, animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[80, 100, 90, 110, 85].map((w, j) => (
              <div key={j} style={{ width: w, height: 34, background: "#e8e8e8", animation: "pulse 1.4s ease-in-out infinite" }} />
            ))}
          </div>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 32px 80px" }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #000", marginBottom: 40, paddingBottom: 20 }}>
        <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 6 }}>
          PROFILE · INFLUENCES ALL AI SUGGESTIONS
        </div>
        <h1 style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 48, lineHeight: 0.95, letterSpacing: "-0.03em", margin: 0 }}>
          Settings
        </h1>
      </div>

      <form onSubmit={handleSave}>
        {/* Dietary restrictions */}
        <div style={{ marginBottom: 36 }}>
          <SectionLabel>Dietary Restrictions</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DIETARY_OPTIONS.map((opt) => (
              <CheckPill
                key={opt}
                label={opt}
                checked={dietary.includes(opt)}
                onChange={() => toggleList(dietary, setDietary, opt)}
              />
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div style={{ marginBottom: 36 }}>
          <SectionLabel>Allergies & Must-Avoid</SectionLabel>
          <input
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. peanuts, shellfish, tree nuts"
            style={{ ...inputStyle, resize: undefined }}
          />
        </div>

        {/* Nutritional goals */}
        <div style={{ marginBottom: 36 }}>
          <SectionLabel>Nutritional Goals</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {NUTRITION_OPTIONS.map((opt) => (
              <CheckPill
                key={opt}
                label={opt}
                checked={nutritionalGoals.includes(opt)}
                onChange={() => toggleList(nutritionalGoals, setNutritionalGoals, opt)}
              />
            ))}
          </div>
        </div>

        {/* Household size + skill */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }} className="settings-two-col">
          <div>
            <SectionLabel>Household Size</SectionLabel>
            <input
              type="number"
              min={1} max={12}
              value={householdSize}
              onChange={(e) => setHouseholdSize(Number(e.target.value))}
              style={{ ...inputStyle, resize: undefined, width: "100%" }}
            />
          </div>
          <div>
            <SectionLabel>Cooking Skill</SectionLabel>
            <select
              value={cookingSkill}
              onChange={(e) => setCookingSkill(e.target.value)}
              style={{ ...inputStyle, resize: undefined, width: "100%", appearance: "none", cursor: "pointer" }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* About me */}
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>About Me · Free-Form Context</SectionLabel>
          <textarea
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            rows={4}
            placeholder="e.g. I have two young kids who hate spicy food. I prefer quick weeknight meals and love NM cuisine."
            style={inputStyle}
          />
          <div style={{ ...mono, fontSize: 10, color: "var(--caption)", marginTop: 6, letterSpacing: "0.06em" }}>
            THIS TEXT IS SENT TO THE AI WITH EVERY RECIPE, PLAN & CHAT REQUEST.
          </div>
        </div>

        {/* Save */}
        <button
          type="submit"
          style={{
            ...mono,
            fontWeight: 700, fontSize: 13,
            textTransform: "uppercase", letterSpacing: "0.10em",
            padding: "14px 32px",
            border: "2px solid #000",
            background: saved ? "#000" : "#fff",
            color: saved ? "#fff" : "#000",
            cursor: "pointer",
            transition: "all 150ms",
            width: "100%",
          }}
        >
          {saved ? "✓ SAVED" : "SAVE PROFILE"}
        </button>
      </form>

      {/* Notifications */}
      <div style={{ marginTop: 48, paddingTop: 32, borderTop: "2px solid #000" }}>
        <NotifyButton />
      </div>

      <style>{`
        @media (max-width: 600px) {
          .settings-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
