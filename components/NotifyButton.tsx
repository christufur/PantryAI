"use client";

import { useEffect, useState } from "react";

const LAST_NOTIFIED_KEY = "fridgey_last_notified";
const THROTTLE_MS = 8 * 60 * 60 * 1000; // 8 hours

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.08em",
};

/** compact=true renders as a single inline button, no wrapper box */
export default function NotifyButton({ compact = false }: { compact?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [checking, setChecking] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);

    if (Notification.permission === "granted") {
      const last = Number(localStorage.getItem(LAST_NOTIFIED_KEY) ?? "0");
      if (Date.now() - last > THROTTLE_MS) {
        checkAndNotify();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function showNotification(title: string, body: string) {
    // Prefer SW notification (works on mobile PWA); fall back to Notification API.
    try {
      if ("serviceWorker" in navigator) {
        // Race SW ready against a 2s timeout so dev/HTTP doesn't hang forever.
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((res) => setTimeout(() => res(null), 2000)),
        ]);
        if (reg) {
          await (reg as ServiceWorkerRegistration).showNotification(title, {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: "fridgey-dying",
          });
          return;
        }
      }
      // Fallback: direct Notification API (works in dev / no SW)
      new Notification(title, { body, icon: "/icons/icon-192.png", tag: "fridgey-dying" });
    } catch {
      new Notification(title, { body, tag: "fridgey-dying" });
    }
  }

  async function checkAndNotify() {
    if (!("Notification" in window)) return;
    setChecking(true);
    try {
      const res = await fetch("/api/notify");
      const data: { dyingCount: number; names: string[] } = await res.json();
      if (data.dyingCount > 0) {
        const title = `🧊 Fridgey: ${data.dyingCount} item${data.dyingCount > 1 ? "s" : ""} dying soon`;
        const body = data.names.join(", ") + " — cook or donate before it's too late.";
        await showNotification(title, body);
        localStorage.setItem(LAST_NOTIFIED_KEY, String(Date.now()));
        setLastResult("Notified!");
      } else {
        setLastResult("All clear.");
      }
    } catch {
      setLastResult("Failed.");
    } finally {
      setChecking(false);
    }
  }

  async function requestAndNotify() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") checkAndNotify();
  }

  if (!mounted || typeof window === "undefined" || !("Notification" in window)) return null;

  if (compact) {
    if (permission === "denied") return (
      <span style={{ ...mono, fontSize: 10, color: "#c8102e" }}>ALERTS BLOCKED</span>
    );
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={permission === "granted" ? checkAndNotify : requestAndNotify}
          disabled={checking}
          style={{
            ...mono,
            padding: "10px 16px",
            border: "2px solid #000",
            background: "#000", color: "#fff",
            cursor: checking ? "default" : "pointer",
            opacity: checking ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {checking ? "CHECKING…" : permission === "granted" ? "🔔 TEST ALERT" : "🔔 ENABLE ALERTS"}
        </button>
        {lastResult && (
          <span style={{ ...mono, fontSize: 9, color: "var(--caption)" }}>{lastResult}</span>
        )}
      </div>
    );
  }

  // Full (non-compact) version — kept for any future use
  return (
    <div style={{ width: 280 }}>
      <div style={{ border: "2px solid #000", padding: "20px 20px" }}>
        <div style={{ ...mono, fontSize: 10, color: "var(--caption)", marginBottom: 8 }}>FRIDGEY ALERTS</div>
        <div style={{ fontFamily: "Lora, serif", fontSize: 14, color: "var(--ink)", marginBottom: 16, lineHeight: 1.5 }}>
          {permission === "granted"
            ? "Fridgey will notify you when food is about to die."
            : "Get notified when items are about to expire."}
        </div>
        {permission === "granted" ? (
          <button onClick={checkAndNotify} disabled={checking} style={{ ...mono, width: "100%", padding: "11px 0", border: "2px solid #000", background: "#000", color: "#fff", cursor: checking ? "default" : "pointer", opacity: checking ? 0.5 : 1 }}>
            {checking ? "CHECKING…" : "🔔 TEST ALERT NOW"}
          </button>
        ) : permission === "denied" ? (
          <div style={{ ...mono, fontSize: 10, color: "#c8102e" }}>NOTIFICATIONS BLOCKED</div>
        ) : (
          <button onClick={requestAndNotify} style={{ ...mono, width: "100%", padding: "11px 0", border: "2px solid #000", background: "#000", color: "#fff", cursor: "pointer" }}>
            🔔 ENABLE FRIDGEY ALERTS
          </button>
        )}
        {lastResult && <div style={{ ...mono, fontSize: 9, color: "var(--caption)", marginTop: 10 }}>{lastResult}</div>}
      </div>
      <div style={{ ...mono, fontSize: 9, color: "var(--caption)", marginTop: 8, lineHeight: 1.6 }}>
        Alerts fire once per day when items expire in ≤2 days.
      </div>
    </div>
  );
}
