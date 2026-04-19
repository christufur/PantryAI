import { db } from "@/lib/db";
import { pantryItems, mealsPlanned, recipesCache } from "@/db/schema";
import { asc, eq, gte, lte, and } from "drizzle-orm";
import Link from "next/link";
import { generateRecipe, ingredientsHash } from "@/lib/gemini";

// Var 04 — Kitchen Wall. Tablet/desktop dashboard meant to live on the
// fridge. Glanceable headline (tonight's rescue dinner), dying items,
// week meal-plan grid.
//
// Reads-only at render time. The "tonight" recipe is sourced from
// recipesCache when available so the wall is fast and offline-safe;
// only generates fresh if there's no cached match.
export default async function WallPage() {
  let items: (typeof pantryItems.$inferSelect)[] = [];
  try {
    items = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
  } catch {}

  const now = Date.now();
  const daysUntil = (d: Date) => Math.floor((d.getTime() - now) / 86_400_000);

  const dying = items.filter((i) => daysUntil(i.expiryDate) <= 3);

  // ---- Tonight's recipe ----
  // Use top-3 dying items as the seed. Cache hit keeps render snappy.
  let tonight: { title: string; saves: string[]; timeMinutes: number; ingredients: string[] } | null =
    null;

  if (dying.length > 0) {
    const seed = dying.slice(0, 4).map((i) => i.name);
    try {
      const hash = ingredientsHash(seed);
      const cached = db
        .select()
        .from(recipesCache)
        .where(eq(recipesCache.ingredientsHash, hash))
        .get();
      if (cached) {
        tonight = JSON.parse(cached.recipeJson);
      } else {
        const fresh = await generateRecipe(seed);
        db.insert(recipesCache)
          .values({ ingredientsHash: hash, recipeJson: JSON.stringify(fresh) })
          .run();
        tonight = fresh;
      }
    } catch {
      // Render without the headline if the API or cache table is unavailable.
      tonight = null;
    }
  }

  // ---- This week grid ----
  // Show the current Mon–Sun week. mealsPlanned rows seeded by /plan land here.
  const weekStart = startOfMondayWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);

  let plannedMeals: (typeof mealsPlanned.$inferSelect)[] = [];
  try {
    plannedMeals = db
      .select()
      .from(mealsPlanned)
      .where(
        and(
          gte(mealsPlanned.weekStart, weekStart),
          lte(mealsPlanned.weekStart, weekEnd)
        )
      )
      .all();
  } catch {}

  // Bucket by day index (0 = Mon).
  const byDay: Record<number, typeof plannedMeals> = {};
  for (const m of plannedMeals) {
    (byDay[m.dayIndex] ||= []).push(m);
  }

  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIndex = (new Date().getDay() + 6) % 7; // JS Sun=0 → shift so Mon=0

  const tonightSeedHref =
    dying.length > 0
      ? `/recipe?ingredients=${encodeURIComponent(dying.slice(0, 4).map((i) => i.name).join(","))}`
      : "/";

  return (
    <main style={{ background: "var(--paper)", minHeight: "100dvh" }}>
      {/* Black ribbon */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "10px 32px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
        className="ribbon"
      >
        <span>KITCHEN WALL · PIN TO THE FRIDGE</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }} className="wall-container">
        {/* TONIGHT — hero band */}
        <section style={{ borderBottom: "2px solid #000", paddingBottom: 32, marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: tonight ? "#c8102e" : "var(--caption)",
              marginBottom: 12,
            }}
          >
            {tonight
              ? `TONIGHT · SAVES ${tonight.saves?.length ?? dying.length} DYING · ${tonight.timeMinutes ?? 25} MIN`
              : "TONIGHT · NOTHING DYING"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 240px",
              gap: 32,
              alignItems: "end",
            }}
            className="wall-tonight-grid"
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Source Serif 4', serif",
                  fontWeight: 600,
                  fontSize: 48,
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  color: "var(--ink)",
                }}
                className="wall-headline"
              >
                {tonight ? tonight.title : "Pantry's clean."}
              </h1>

              {tonight && (
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--caption)",
                  }}
                >
                  {(tonight.saves ?? dying.slice(0, 3).map((i) => i.name)).join(" · ")}
                </div>
              )}
            </div>

            <Link
              href={tonightSeedHref}
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "18px 22px",
                border: "2px solid #000",
                background: "#000",
                color: "#fff",
                textDecoration: "none",
                textAlign: "center",
                alignSelf: "end",
              }}
            >
              START COOKING →
            </Link>
          </div>
        </section>

        {/* DYING SOON · THIS WEEK · two-column band */}
        <section
          style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 40 }}
          className="wall-bottom-grid"
        >
          {/* DYING SOON */}
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--caption)",
                marginBottom: 12,
              }}
            >
              DYING SOON
            </div>

            {dying.length === 0 ? (
              <div style={{ fontFamily: "Lora, serif", fontSize: 16, color: "var(--caption)" }}>
                Nothing within 3 days.
              </div>
            ) : (
              <div style={{ borderTop: "2px solid #000" }}>
                {dying.slice(0, 8).map((it) => {
                  const d = daysUntil(it.expiryDate);
                  return (
                    <div
                      key={it.id}
                      style={{
                        borderBottom: "1px solid var(--hairline)",
                        padding: "12px 0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Source Serif 4', serif",
                          fontSize: 22,
                          fontWeight: 600,
                          color: "#000",
                          lineHeight: 1.1,
                        }}
                      >
                        {it.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          color: "#c8102e",
                        }}
                      >
                        {d < 0 ? "EXP" : `${d}D`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* THIS WEEK grid */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--caption)",
                }}
              >
                THIS WEEK
              </div>
              <Link
                href="/plan"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "var(--link)",
                  textDecoration: "none",
                }}
              >
                EDIT PLAN →
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                border: "2px solid #000",
              }}
              className="week-grid"
            >
              {days.map((label, i) => {
                const meals = byDay[i] ?? [];
                const isToday = i === todayIndex;
                return (
                  <div
                    key={i}
                    style={{
                      borderRight: i === 6 ? "none" : "1px solid var(--hairline)",
                      padding: 12,
                      minHeight: 140,
                      background: isToday ? "#000" : "var(--paper)",
                      color: isToday ? "#fff" : "#000",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        opacity: isToday ? 0.9 : 0.6,
                      }}
                    >
                      {label}
                    </div>
                    {meals.length === 0 ? (
                      <div
                        style={{
                          fontFamily: "Lora, serif",
                          fontSize: 12,
                          fontStyle: "italic",
                          color: isToday ? "rgba(255,255,255,0.6)" : "var(--caption)",
                        }}
                      >
                        —
                      </div>
                    ) : (
                      meals.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            fontFamily: "'Source Serif 4', serif",
                            fontSize: 14,
                            fontWeight: 600,
                            lineHeight: 1.2,
                          }}
                        >
                          {m.mealName}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SNAP CTA, footer */}
        <section
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid var(--hairline)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--caption)",
            }}
          >
            PANTRYOS.APP · PAIRED · KITCHEN TABLET
          </div>
          <Link
            href="/"
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "10px 18px",
              border: "2px solid #000",
              background: "#fff",
              color: "#000",
              textDecoration: "none",
            }}
          >
            ◎ SNAP FRIDGE
          </Link>
        </section>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .wall-headline { font-size: 40px !important; }
          .wall-tonight-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .wall-bottom-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .wall-container { padding: 20px 16px !important; }
          .ribbon { padding: 10px 16px !important; }
        }
        @media (max-width: 768px) {
          .wall-headline { font-size: 34px !important; }
        }
        @media (max-width: 600px) {
          .week-grid { grid-template-columns: repeat(7, minmax(80px, 1fr)) !important; overflow-x: auto; }
        }
      `}</style>
    </main>
  );
}

// Monday-anchored start of the week, normalized to 00:00 local time.
function startOfMondayWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // 0 = Mon
  x.setDate(x.getDate() - dow);
  return x;
}
