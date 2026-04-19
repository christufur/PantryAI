import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", flexDirection: "column" }} className="chat-page">
      {/* Ribbon */}
      <div style={{
        background: "#1a3a4a",
        color: "#a8d8ea",
        padding: "10px 32px",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-ribbon)", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }} className="ribbon">
        <span style={{ color: "#fff" }}>FRIDGEY · <span style={{ color: "#4fc3f7" }}>ONLINE</span></span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>YOUR FRIDGE, PERSONIFIED</span>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 32px", flex: 1, display: "flex", flexDirection: "column", width: "100%" }} className="chat-container">
        {/* Header */}
        <div style={{
          borderBottom: "2px solid #1a3a4a",
          paddingBottom: 14,
          marginBottom: 18,
        }}>
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "#4fc3f7",
            marginBottom: 8,
          }}>
            ❄ APPLIANCE INTELLIGENCE · ALWAYS WATCHING
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600, fontSize: "var(--text-title)",
            lineHeight: 1.0, letterSpacing: "-0.02em",
            margin: "0 0 8px", color: "#1a3a4a",
          }}>
            Hi. I&apos;m Fridgey.
          </h1>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-md)",
            color: "var(--caption)",
            margin: 0,
          }}>
            I know what&apos;s in here. Ask me anything — or brace yourself.
          </p>
        </div>

        <ChatInterface />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chat-page { height: 100svh; }
          .chat-container { padding: 10px 16px 0 !important; flex: 1; min-height: 0; }
        }
        @media (min-width: 769px) {
          .ribbon { padding: 10px 32px; }
        }
        @media (max-width: 768px) {
          .ribbon { padding: 10px 16px !important; }
        }
      `}</style>
    </main>
  );
}
