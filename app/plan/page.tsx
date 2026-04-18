import WeeklyPlanForm from "@/components/WeeklyPlanForm";

export default function PlanPage() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 32px",
      }}
    >
      {/* Black ribbon */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "14px 20px",
          marginBottom: 40,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        WEEKLY MEAL PLANNER
      </div>

      <style>{`
        @media (max-width: 600px) {
          .plan-page-main {
            padding: 24px 16px !important;
          }
        }
      `}</style>

      <WeeklyPlanForm />
    </main>
  );
}
