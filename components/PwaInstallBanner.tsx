"use client";

import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Android Chrome: captures `beforeinstallprompt` so we can offer a real **Install** flow.
 * Menu → “Add to Home screen” is often a bookmark shortcut that still opens in-browser with the omnibox.
 */
export default function PwaInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!window.isSecureContext) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* private mode */
    }
    if (isStandalone()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = useCallback(() => {
    setHidden(true);
    setPromptEvent(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => {});
    setPromptEvent(null);
    setHidden(true);
  }, [promptEvent]);

  if (hidden || !promptEvent) return null;

  return (
    <div
      className="pwa-install-banner"
      role="region"
      aria-label="Install app"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 24,
        zIndex: 160000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "#fff",
        border: "2px solid #000",
        boxShadow: "4px 4px 0 rgba(0,0,0,0.15)",
      }}
    >
      <p
        style={{
          flex: 1,
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#000",
          lineHeight: 1.35,
        }}
      >
        Install for full-screen app (no Chrome bar)
      </p>
      <button
        type="button"
        onClick={install}
        style={{
          flexShrink: 0,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "8px 12px",
          border: "2px solid #000",
          background: "#000",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          border: "2px solid #000",
          background: "#fff",
          color: "#000",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
