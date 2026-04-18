import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <main style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      {/* Black ribbon */}
      <div style={{
        background: '#000', color: '#fff',
        padding: '10px 32px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>PANTRYOS · CHAT</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>ASK THE FRIDGE ANYTHING</span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 32px' }} className="chat-container">
        {/* Headline */}
        <div style={{ borderBottom: '2px solid #000', paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--caption)', marginBottom: 8 }}>
            VAR · 05 · WILDCARD
          </div>
          <h1 style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: 44, lineHeight: 1.0, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Hi. I&apos;m your fridge.
          </h1>
          <p style={{ fontFamily: 'Lora, serif', fontSize: 17, color: 'var(--caption)', margin: 0 }}>
            Snap me, or ask me anything.
          </p>
        </div>
        <ChatInterface />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chat-container { padding: 24px 16px !important; }
        }
      `}</style>
    </main>
  );
}
