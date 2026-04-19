import { db } from "@/lib/db";
import { pantryItems, mealsPlanned, recipesCache } from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { generateRecipe, ingredientsHash } from "@/lib/gemini";
import WeekGrid, { type DayData } from "./WeekGrid";
import PastPlans from "./PastPlans";

function formatShort(value: unknown): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date((value as number) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function PlanPage() {
  // ---- Pantry + dying ----
  let items: (typeof pantryItems.$inferSelect)[] = [];
  try {
    items = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
  } catch {}
  const now = Date.now();
  const daysUntil = (d: Date) => Math.floor((d.getTime() - now) / 86_400_000);
  const dying = items.filter((i) => daysUntil(i.expiryDate) <= 3);

  // ---- Active plan = most recent planId ----
  let activePlanId: number | null = null;
  let activeRows: (typeof mealsPlanned.$inferSelect)[] = [];
  try {
    const latest = db
      .select({ planId: mealsPlanned.planId })
      .from(mealsPlanned)
      .orderBy(desc(mealsPlanned.planId))
      .limit(1)
      .get();
    if (latest) {
      activePlanId = latest.planId;
      activeRows = db
        .select()
        .from(mealsPlanned)
        .where(eq(mealsPlanned.planId, latest.planId))
        .all();
    }
  } catch {}

  const weekStart = activeRows[0]?.weekStart ?? null;
  const dayMap = new Map<number, DayData>();
  for (const row of activeRows) {
    if (!dayMap.has(row.dayIndex)) {
      const base =
        weekStart instanceof Date
          ? weekStart
          : new Date((weekStart as unknown as number) * 1000);
      const d = new Date(base);
      d.setDate(d.getDate() + row.dayIndex);
      dayMap.set(row.dayIndex, {
        dayIndex: row.dayIndex,
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        meals: [],
      });
    }
    const parsed = row.ingredientsJson ? JSON.parse(row.ingredientsJson) : {};
    dayMap.get(row.dayIndex)!.meals.push({
      id: row.id,
      mealType: row.mealType,
      mealName: row.mealName,
      estimatedCalories: row.estimatedCalories,
      usesFromPantry: parsed.uses_from_pantry ?? [],
      needsToBuy: parsed.needs_to_buy ?? [],
    });
  }
  const mealOrder: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2 };
  const days: DayData[] = Array.from(dayMap.values())
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((d) => ({
      ...d,
      meals: d.meals.sort((a, b) => (mealOrder[a.mealType] ?? 9) - (mealOrder[b.mealType] ?? 9)),
    }));

  let todayIndex = (new Date().getDay() + 6) % 7;
  if (weekStart) {
    const startMs =
      weekStart instanceof Date ? weekStart.getTime() : (weekStart as unknown as number) * 1000;
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const start0 = new Date(startMs);
    start0.setHours(0, 0, 0, 0);
    todayIndex = Math.floor((today0.getTime() - start0.getTime()) / 86_400_000);
  }

  // ---- Tonight ----
  const todayDinner =
    todayIndex >= 0 && todayIndex <= 6
      ? days.find((d) => d.dayIndex === todayIndex)?.meals.find((m) => m.mealType === "dinner") ?? null
      : null;

  let tonight: { title: string; saves?: string[]; timeMinutes?: number; fromPlan?: boolean } | null = null;

  if (todayDinner) {
    const pantryNames = todayDinner.usesFromPantry.map((i) => i.name.toLowerCase());
    const savedDying = dying.filter((d) =>
      pantryNames.some((n) => d.name.toLowerCase().includes(n) || n.includes(d.name.toLowerCase()))
    );
    tonight = { title: todayDinner.mealName, saves: savedDying.map((d) => d.name), fromPlan: true };
  } else if (dying.length > 0) {
    const seed = dying.slice(0, 4).map((i) => i.name);
    try {
      const hash = ingredientsHash(seed);
      const cached = db.select().from(recipesCache).where(eq(recipesCache.ingredientsHash, hash)).get();
      if (cached) tonight = JSON.parse(cached.recipeJson);
      else {
        const fresh = await generateRecipe(seed);
        db.insert(recipesCache).values({ ingredientsHash: hash, recipeJson: JSON.stringify(fresh) }).run();
        tonight = fresh;
      }
    } catch {}
  }

  // ---- Past plans (exclude active) ----
  let pastPlans: { planId: number; weekStart: unknown; mealCount: number }[] = [];
  try {
    const allPlans = db
      .select({ planId: mealsPlanned.planId, weekStart: mealsPlanned.weekStart, mealCount: sql<number>`count(*)` })
      .from(mealsPlanned)
      .groupBy(mealsPlanned.planId)
      .orderBy(sql`${mealsPlanned.planId} DESC`)
      .all();
    pastPlans = allPlans.filter((p) => p.planId !== activePlanId).slice(0, 3);
  } catch {}

  const ctaHref = todayDinner
    ? `/plan/${activePlanId}/shopping`
    : dying.length > 0
    ? `/recipe?ingredients=${encodeURIComponent(dying.slice(0, 4).map((i) => i.name).join(","))}`
    : "/plan/new";
  const ctaLabel = todayDinner ? "SHOPPING LIST →" : dying.length > 0 ? "START COOKING →" : "GENERATE PLAN →";
  const weekRangeLabel = weekStart ? `WEEK OF ${formatShort(weekStart).toUpperCase()}` : "NO ACTIVE PLAN";

  return (
    <main style={{ background: "var(--paper)", minHeight: "100dvh" }}>
      {/* Black ribbon */}
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
          flexWrap: "wrap",
          gap: 8,
        }}
        className="ribbon"
      >
        <span>WEEKLY PLAN · TONIGHT &amp; THIS WEEK</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }} className="wall-container">
        {/* Action bar */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-ribbon)", fontWeight: 700, letterSpacing: "0.14em", color: "var(--caption)" }}>
            {weekRangeLabel}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {activePlanId && (
              <Link href={`/plan/${activePlanId}/shopping`} style={{
                fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                padding: "10px 16px", border: "2px solid #000", background: "#fff", color: "#000", textDecoration: "none",
              }}>
                🛒 SHOPPING LIST
              </Link>
            )}
            <Link href="/plan/new" style={{
              fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "10px 16px", border: "2px solid #000", background: "#000", color: "#fff", textDecoration: "none",
            }}>
              + GENERATE NEW PLAN
            </Link>
          </div>
        </section>

        {/* TONIGHT */}
        <section style={{ borderBottom: "2px solid #000", paddingBottom: 32, marginBottom: 32 }}>
          <div style={{
            fontFamily: "var(--font-ui)", fontSize: "var(--text-ribbon)", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.14em",
            color: tonight ? "#c8102e" : "var(--caption)", marginBottom: 12,
          }}>
            {tonight
              ? tonight.fromPlan
                ? tonight.saves && tonight.saves.length > 0
                  ? `TONIGHT · FROM YOUR PLAN · RESCUES ${tonight.saves.length} DYING`
                  : "TONIGHT · FROM YOUR PLAN"
                : `TONIGHT · SAVES ${tonight.saves?.length ?? dying.length} DYING · ${tonight.timeMinutes ?? 25} MIN`
              : "TONIGHT · NOTHING DYING"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 32, alignItems: "end" }} className="wall-tonight-grid">
            <div>
              <h1 style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: "var(--text-title)", lineHeight: 1.0, letterSpacing: "-0.02em", margin: 0, color: "var(--ink)",
              }} className="wall-headline">
                {tonight ? tonight.title : "Pantry's clean."}
              </h1>
              {tonight && (tonight.saves?.length ?? 0) > 0 && (
                <div style={{
                  marginTop: 16, fontFamily: "var(--font-ui)",
                  fontSize: "var(--text-2xs)", fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: "var(--caption)",
                }}>
                  {tonight.saves!.join(" · ")}
                </div>
              )}
            </div>
            <Link href={ctaHref} style={{
              fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "var(--text-ribbon)",
              textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "18px 22px", border: "2px solid #000",
              background: "#000", color: "#fff", textDecoration: "none",
              textAlign: "center", alignSelf: "end",
            }}>
              {ctaLabel}
            </Link>
          </div>
        </section>

        {/* DYING SOON · THIS WEEK */}
        <section style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 40 }} className="wall-bottom-grid">
          <div>
            <div style={{
              fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 12,
            }}>
              DYING SOON
            </div>
            {dying.length === 0 ? (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)", color: "var(--caption)" }}>Nothing within 3 days.</div>
            ) : (
              <div style={{ borderTop: "2px solid #000" }}>
                {dying.slice(0, 8).map((it) => {
                  const d = daysUntil(it.expiryDate);
                  return (
                    <div key={it.id} style={{
                      borderBottom: "1px solid var(--hairline)", padding: "12px 0",
                      display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12,
                    }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-card-name)", fontWeight: 600, color: "#000", lineHeight: 1.1 }}>
                        {it.name}
                      </span>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-2xs)", fontWeight: 700, letterSpacing: "0.08em", color: "#c8102e" }}>
                        {d < 0 ? "EXP" : `${d}D`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div style={{
                fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)",
              }}>
                THIS WEEK {days.length > 0 ? "· TAP A DAY FOR DETAIL" : ""}
              </div>
            </div>

            {days.length === 0 ? (
              <div style={{ border: "2px dashed var(--hairline)", padding: "48px 24px", textAlign: "center" }}>
<<<<<<< HEAD
                <p style={{ fontFamily: "Lora, serif", fontSize: 18, color: "var(--caption)", margin: 0 }}>
                  No plan yet. Use &ldquo;+ Generate New Plan&rdquo; above to see your week.
                </p>
=======
                <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-lg)", color: "var(--caption)", margin: "0 0 16px" }}>
                  No plan yet. Generate one to see your week.
                </p>
                <Link href="/plan/new" style={{
                  fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  padding: "12px 22px", border: "2px solid #000",
                  background: "#000", color: "#fff", textDecoration: "none", display: "inline-block",
                }}>
                  + GENERATE PLAN
                </Link>
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84
              </div>
            ) : (
              <WeekGrid days={days} todayIndex={todayIndex} planId={activePlanId!} />
            )}
          </div>
        </section>

<<<<<<< HEAD
        <PastPlans plans={pastPlans} />
=======
        {/* PAST PLANS */}
        {pastPlans.length > 0 && (
          <section style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--hairline)" }}>
            <div style={{
              fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 12,
            }}>
              PAST PLANS ({pastPlans.length})
            </div>
            <div style={{ borderTop: "2px solid #000" }}>
              {pastPlans.slice(0, 8).map((plan) => {
                const dayCount = Math.ceil((plan.mealCount as number) / 3);
                return (
                  <Link key={plan.planId} href={`/plan/${plan.planId}/shopping`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{
                      borderBottom: "1px solid var(--hairline)", padding: "14px 0",
                      display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-md)", fontWeight: 600 }}>
                        {dayCount}-Day Plan
                      </div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--caption)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {formatShort(plan.weekStart)} →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
>>>>>>> 9ccb2acbcbf2f620324df75cf69fb1a765498a84

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
          .week-grid { grid-template-columns: repeat(7, minmax(110px, 1fr)) !important; overflow-x: auto; }
        }
      `}</style>
    </main>
  );
}
