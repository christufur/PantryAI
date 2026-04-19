"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Recipe } from "@/lib/gemini";
import type { BuyLocalEntry } from "@/lib/recipe-buy-local";

type ApiPayload = Recipe & { buyLocal: BuyLocalEntry[] };

/**
 * Loads the recipe via `/api/recipe` on the client so the RSC shell returns immediately.
 * Long Gemini calls no longer block the server component (avoids dev Performance.measure glitches).
 */
export default function RecipeDishClient({
  ingredientsParam,
  bust,
}: {
  ingredientsParam: string;
  bust: boolean;
}) {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set("ingredients", ingredientsParam);
      if (bust) q.set("bust", "1");
      const res = await fetch(`/api/recipe?${q.toString()}`);
      const body = (await res.json()) as ApiPayload | { error: string };
      if (!res.ok) {
        setError("error" in body ? body.error : res.statusText);
        setData(null);
        return;
      }
      setData(body as ApiPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ingredientsParam, bust]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <>
        <div
          style={{
            background: "#000",
            color: "#fff",
            padding: "10px 32px",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-ribbon)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>RECIPE · GENERATING</span>
          <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>WASTE LESS. EAT WELL.</span>
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px" }} className="recipe-container">
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-lg)",
              color: "var(--caption)",
              margin: 0,
            }}
          >
            Generating your recipe…
          </p>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div
          style={{
            background: "#000",
            color: "#fff",
            padding: "10px 32px",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--text-ribbon)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>RECIPE · COULDN&apos;T GENERATE</span>
          <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>WASTE LESS. EAT WELL.</span>
        </div>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }} className="recipe-container">
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 16,
              color: "#1a1a1a",
              margin: "0 0 20px",
              border: "2px solid #c8102e",
              padding: "16px 20px",
            }}
          >
            {error ?? "Something went wrong."}
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--caption)", margin: "0 0 24px" }}>
            The AI service may be busy (503). We retry automatically a few times; you can try again in a moment.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "var(--text-ribbon)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "10px 18px",
                border: "2px solid #000",
                background: "#000",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              TRY AGAIN
            </button>
            <Link
              href="/recipe"
              style={{
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "var(--text-ribbon)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "10px 18px",
                border: "2px solid #000",
                background: "#fff",
                color: "#000",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              ← PICK INGREDIENTS
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { buyLocal, ...recipe } = data;
  const ingredients = ingredientsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const savedItems: string[] = recipe.saves ?? ingredients.slice(0, 3);
  const itemsSaved = savedItems.length;

  return (
    <>
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "10px 32px",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-ribbon)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>RECIPE · GENERATED BY PANTRY.AI</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>WASTE LESS. EAT WELL.</span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }} className="recipe-container">
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: itemsSaved > 0 ? "var(--dying)" : "var(--caption)",
            marginBottom: 12,
          }}
        >
          SAVES {itemsSaved} PANTRY {itemsSaved === 1 ? "ITEM" : "ITEMS"}
          {recipe.timeMinutes ? ` · ${recipe.timeMinutes} MIN` : ""}
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "var(--text-title)",
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            margin: "0 0 24px",
            color: "var(--ink)",
          }}
        >
          {recipe.title}
        </h1>

        <div style={{ borderBottom: "2px solid #000", marginBottom: 32 }} />

        <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }} className="recipe-columns">
          <div style={{ flex: "0 0 220px" }} className="recipe-ingredients">
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--caption)",
                marginBottom: 16,
              }}
            >
              INGREDIENTS
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {recipe.ingredients.map((ing: string, i: number) => (
                <li
                  key={i}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    lineHeight: 1.5,
                    color: "var(--ink)",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--hairline)",
                  }}
                >
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--caption)",
                marginBottom: 16,
              }}
            >
              METHOD
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {recipe.steps.map((step: string, i: number) => (
                <li key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 20,
                      color: "var(--caption)",
                      lineHeight: 1.3,
                      minWidth: 28,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-md)",
                      lineHeight: 1.6,
                      color: "var(--ink)",
                    }}
                  >
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            {savedItems.length > 0 && (
              <div
                style={{
                  marginTop: 32,
                  borderTop: "1px solid var(--hairline)",
                  paddingTop: 16,
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--dying)",
                }}
              >
                SAVES: {savedItems.join(", ")}
              </div>
            )}

            {buyLocal.length > 0 && (
              <div
                style={{
                  marginTop: 24,
                  border: "2px solid #057dbc",
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "#057dbc",
                    marginBottom: 12,
                  }}
                >
                  ◉ BUY LOCAL · NEW MEXICO PRODUCERS
                </div>
                {buyLocal.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      borderBottom: i < buyLocal.length - 1 ? "1px solid #d1e9f5" : "none",
                      padding: "8px 0",
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      color: "#1a1a1a",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{s.ingredient}</span>
                    {" → "}
                    <span style={{ fontWeight: 700 }}>{s.producer}</span>
                    {" · "}
                    {s.product}
                    {" at "}
                    <span style={{ fontWeight: 700 }}>{s.store}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            borderTop: "1px solid var(--hairline)",
            paddingTop: 24,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/recipe"
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: "var(--text-ribbon)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "10px 18px",
              border: "2px solid #000",
              background: "#000",
              color: "#fff",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            ← PICK DIFFERENT INGREDIENTS
          </Link>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: "var(--text-ribbon)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              padding: "10px 18px",
              border: "2px solid #000",
              background: "#fff",
              color: "#000",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            BACK TO PANTRY
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .recipe-container { padding: 24px 16px !important; }
          .recipe-columns { flex-direction: column !important; gap: 32px !important; }
          .recipe-ingredients { flex: 0 0 auto !important; width: 100% !important; }
          h1 { font-size: 34px !important; }
        }
      `}</style>
    </>
  );
}
