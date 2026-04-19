"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type PastPlan = { planId: number; weekStart: unknown; mealCount: number };

function formatShort(value: unknown): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date((value as number) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PastPlans({ plans }: { plans: PastPlan[] }) {
  const router = useRouter();

  async function handleDelete(planId: number) {
    await fetch(`/api/plan/${planId}`, { method: "DELETE" });
    router.refresh();
  }

  if (plans.length === 0) return null;

  return (
    <section style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--hairline)" }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--caption)", marginBottom: 12,
      }}>
        PAST PLANS ({plans.length})
      </div>
      <div style={{ borderTop: "2px solid #000" }}>
        {plans.map((plan) => {
          const dayCount = Math.ceil((plan.mealCount as number) / 3);
          return (
            <div key={plan.planId} style={{
              borderBottom: "1px solid var(--hairline)", padding: "14px 0",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            }}>
              <Link href={`/plan/${plan.planId}/shopping`} style={{
                textDecoration: "none", color: "inherit", flex: 1,
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
              }}>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600 }}>
                  {dayCount}-Day Plan
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--caption)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {formatShort(plan.weekStart)} →
                </div>
              </Link>
              <button
                onClick={() => handleDelete(plan.planId)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
                  color: "#c8102e", letterSpacing: "0.08em", padding: "4px 8px",
                  textTransform: "uppercase",
                }}
                aria-label="Delete plan"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
