"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 320);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="scroll-to-top-btn"
      style={{
        position: "fixed",
        bottom: 22,
        right: 16,
        zIndex: 99990,
        width: 44,
        height: 44,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        color: "#000",
        border: "2px solid #000",
        borderRadius: 0,
        cursor: "pointer",
        boxShadow: "4px 4px 0 rgba(0,0,0,0.12)",
      }}
    >
      <ChevronUp size={22} strokeWidth={2.25} aria-hidden />
    </button>
  );
}
