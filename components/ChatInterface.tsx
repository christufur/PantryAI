"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  { role: "assistant", content: "PantryOS online. What do you want to cook?" },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: messages }),
      });
      const data = await res.json();
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Connection lost. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Messages area */}
      <div
        className="messages-container"
        style={{
          height: 480,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingBottom: 8,
        }}
      >
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div
              key={i}
              style={{
                border: '1px solid #000',
                background: '#000',
                color: '#fff',
                padding: '8px 12px',
                fontFamily: 'Lora, serif',
                fontSize: 15,
                lineHeight: 1.4,
                maxWidth: '75%',
                marginLeft: 'auto',
              }}
            >
              {msg.content}
            </div>
          ) : (
            <div
              key={i}
              style={{
                border: '1px solid #000',
                background: 'var(--paper-2)',
                color: 'var(--ink)',
                padding: '8px 12px',
                fontFamily: 'Lora, serif',
                fontSize: 15,
                lineHeight: 1.4,
                maxWidth: '75%',
              }}
            >
              {msg.content}
            </div>
          )
        )}

        {loading && (
          <div style={{
            border: '1px solid var(--hairline)',
            background: 'var(--paper-2)',
            padding: '8px 12px',
            maxWidth: '75%',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--caption)',
              letterSpacing: '0.1em',
            }}>
              ANALYZING...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick-reply chips — shown only before any user message */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
          {["What's dying?", "What should I cook?", "What do I have?"].map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '6px 12px',
                border: '2px solid #000',
                background: '#fff',
                color: '#000',
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className="chat-input-area"
        style={{
          borderTop: '2px solid #000',
          paddingTop: 16,
          display: 'flex',
          gap: 8,
          alignItems: 'stretch',
          marginTop: 16,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask your fridge anything..."
          style={{
            flex: 1,
            border: '2px solid #000',
            padding: '10px 14px',
            fontFamily: 'Lora, serif',
            fontSize: 15,
            background: 'var(--paper)',
            color: 'var(--ink)',
            outline: 'none',
            minHeight: 44,
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '10px 18px',
            border: '2px solid #000',
            background: loading ? 'var(--caption)' : '#000',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            minHeight: 44,
          }}
        >
          {loading ? '...' : 'SEND'}
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .messages-container { height: calc(100vh - 300px) !important; min-height: 300px; }
          .chat-input-area > input { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
}
