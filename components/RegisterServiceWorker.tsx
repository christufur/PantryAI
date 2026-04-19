"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so Chrome/Android can offer “Install app” (needs HTTPS).
 * Production: always (when secure). Dev: only if NEXT_PUBLIC_PWA_DEV=1 (e.g. npm run dev:https) so HMR isn’t disrupted by default.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    const allowInDev = process.env.NEXT_PUBLIC_PWA_DEV === "1";
    if (process.env.NODE_ENV !== "production" && !allowInDev) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
