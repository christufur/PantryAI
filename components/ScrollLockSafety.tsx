"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Base UI modal dialogs use a global scroll lock (`@base-ui/utils/useScrollLock`) that
 * sets inline overflow/position styles on `html`/`body`. On Android Chrome, cleanup can
 * occasionally race (navigation, bfcache, rapid open/close), leaving the page non-scrollable.
 * Clearing these artifacts on route change and `pageshow` is a safe recovery valve.
 */
function clearDocumentScrollLockArtifacts() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const { body } = document;

  html.removeAttribute("data-base-ui-scroll-locked");

  html.style.overflow = "";
  html.style.overflowX = "";
  html.style.overflowY = "";
  html.style.scrollbarGutter = "";
  html.style.scrollBehavior = "";

  body.style.position = "";
  body.style.height = "";
  body.style.width = "";
  body.style.boxSizing = "";
  body.style.overflow = "";
  body.style.overflowX = "";
  body.style.overflowY = "";
  body.style.scrollBehavior = "";
}

export default function ScrollLockSafety() {
  const pathname = usePathname();

  useEffect(() => {
    clearDocumentScrollLockArtifacts();
  }, [pathname]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) clearDocumentScrollLockArtifacts();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      requestAnimationFrame(() => {
        if (!document.documentElement.hasAttribute("data-base-ui-scroll-locked")) return;
        if (!document.querySelector('[role="dialog"][aria-modal="true"]')) {
          clearDocumentScrollLockArtifacts();
        }
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return null;
}
