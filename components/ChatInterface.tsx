"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  { role: "assistant", content: "Fridgey online. I've been watching your food. Some of it needs attention. What do you want to know?" },
];

const ICE_BG = "#e8f4f9";
const ICE_BORDER = "#7ec8e3";
const ICE_TEXT = "#1a3a4a";

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
        { role: "assistant", content: "Lost signal. Door probably open. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }} className="chat-interface">
      {/* Messages */}
      <div
        className="messages-container"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingBottom: 8,
        }}
      >
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{
                border: "2px solid #000",
                background: "#000",
                color: "#fff",
                padding: "10px 14px",
                fontFamily: "Lora, serif",
                fontSize: 15,
                lineHeight: 1.45,
                maxWidth: "75%",
              }}>
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              {/* Fridgey avatar */}
              <div style={{
                flexShrink: 0,
                width: 32, height: 32,
                background: "#1a3a4a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14, color: "#4fc3f7",
                marginTop: 2,
              }}>
                ❄
              </div>
              <div style={{
                border: `2px solid ${ICE_BORDER}`,
                background: ICE_BG,
                color: ICE_TEXT,
                padding: "10px 14px",
                fontFamily: "Lora, serif",
                fontSize: 15,
                lineHeight: 1.45,
                maxWidth: "75%",
              }}>
                {msg.content}
              </div>
            </div>
          )
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              flexShrink: 0,
              width: 32, height: 32,
              background: "#1a3a4a",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#4fc3f7",
            }}>
              ❄
            </div>
            <div style={{
              border: `2px solid ${ICE_BORDER}`,
              background: ICE_BG,
              padding: "10px 14px",
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#4fc3f7",
                letterSpacing: "0.12em",
              }}>
                CHILLING...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick-reply chips */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
          {[
            "What's about to die?",
            "What should I cook tonight?",
            "Roast my pantry.",
          ].map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "7px 12px",
                border: `2px solid ${ICE_BORDER}`,
                background: ICE_BG,
                color: ICE_TEXT,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="chat-input-area"
        style={{
          borderTop: `2px solid #1a3a4a`,
          paddingTop: 16,
          display: "flex",
          gap: 8,
          alignItems: "stretch",
          marginTop: 16,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask Fridgey anything..."
          style={{
            flex: 1,
            border: `2px solid #1a3a4a`,
            padding: "10px 14px",
            fontFamily: "Lora, serif",
            fontSize: 15,
            background: ICE_BG,
            color: ICE_TEXT,
            outline: "none",
            minHeight: 44,
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "10px 18px",
            border: "2px solid #1a3a4a",
            background: loading ? ICE_BG : "#1a3a4a",
            color: loading ? "#4fc3f7" : "#4fc3f7",
            cursor: loading ? "not-allowed" : "pointer",
            minHeight: 44,
          }}
        >
          {loading ? "..." : "SEND"}
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chat-interface { flex: 1; min-height: 0; }
          .chat-input-area { padding-bottom: 16px; }
          .chat-input-area > input { font-size: 16px !important; }
        }
        @media (min-width: 769px) {
          .messages-container { height: 480px; flex: none; }
        }
      `}</style>
    </div>
  );
}
