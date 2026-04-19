import Link from "next/link";
import RecipeDishClient from "@/components/RecipeDishClient";

/**
 * Shell only: recipe data loads in `RecipeDishClient` via `/api/recipe` so Gemini latency
 * does not block this server component (avoids dev Performance.measure issues and surfaces 503 clearly).
 */
export default async function RecipeDishPage({
  searchParams,
}: {
  searchParams: Promise<{ ingredients?: string; bust?: string }>;
}) {
  const { ingredients: ingredientParam, bust } = await searchParams;

  if (!ingredientParam?.trim()) {
    return (
      <main style={{ background: "var(--paper)", minHeight: "100vh", padding: 40 }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-md)" }}>Missing ingredients.</p>
        <Link
          href="/recipe"
          style={{
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: "var(--text-ribbon)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginTop: 16,
            display: "inline-block",
            color: "#000",
          }}
        >
          ← BACK TO COOK
        </Link>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <RecipeDishClient ingredientsParam={ingredientParam} bust={bust === "1"} />
    </main>
  );
}
