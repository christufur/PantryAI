"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Home, ChefHat, CalendarDays, MessageCircle, Settings } from "lucide-react";

const NAV = [
  { href: "/",        label: "HOME",  Icon: Home         },
  { href: "/recipe",  label: "COOK",  Icon: ChefHat      },
  { href: "/wall",    label: "PLAN",  Icon: CalendarDays, match: "plan" as const },
  { href: "/chat",    label: "CHAT",  Icon: MessageCircle },
  { href: "/settings",label: "ME",   Icon: Settings      },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  /** Android Chrome: fixed bottom:0 stays on the *layout* viewport; the keyboard shrinks the *visual* viewport and hides the bar. Pin to the visible bottom. */
  const [visualBottomGap, setVisualBottomGap] = useState(0);

  useLayoutEffect(() => {
    // --- Visual viewport: keeps nav above Android soft keyboard ---
    const vv = window.visualViewport;
    if (vv) {
      const sync = () => {
        // Clamp offsetTop to >=0: iOS rubber-band bounce makes offsetTop negative,
        // which would otherwise push the nav upward.
        const gap = window.innerHeight - vv.height - Math.max(0, vv.offsetTop);
        setVisualBottomGap(Math.max(0, gap));
      };
      sync();
      vv.addEventListener("resize", sync);
      vv.addEventListener("scroll", sync);
      const cleanup = () => {
        vv.removeEventListener("resize", sync);
        vv.removeEventListener("scroll", sync);
      };

      // --- touchmove guard: iOS 15 and older don't support overscroll-behavior.
      //     Prevent the rubber-band bounce by cancelling touchmove when already
      //     at the top of the page and the user is still pulling down. ---
      let lastY = 0;
      const onTouchStart = (e: TouchEvent) => { lastY = e.touches[0].clientY; };
      const onTouchMove = (e: TouchEvent) => {
        const dy = e.touches[0].clientY - lastY;
        const atTop = window.scrollY === 0;
        if (atTop && dy > 0 && e.cancelable) e.preventDefault();
      };
      document.addEventListener("touchstart", onTouchStart, { passive: true });
      document.addEventListener("touchmove", onTouchMove, { passive: false });

      return () => {
        cleanup();
        document.removeEventListener("touchstart", onTouchStart);
        document.removeEventListener("touchmove", onTouchMove);
      };
    }
  }, []);

  return (
    <nav style={{
      position: "fixed",
      left: 0,
      right: 0,
      width: "100%",
      boxSizing: "border-box",
      bottom: visualBottomGap,
      background: "#000", borderTop: "2px solid #222",
      display: "flex",
      zIndex: 150000,
      paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
      transform: "translateZ(0)",
      willChange: "transform",
    }} className="mobile-bottom-nav">
      {NAV.map(({ href, label, Icon, match }) => {
        const active =
          match === "plan"
            ? pathname === "/wall" || pathname.startsWith("/plan")
            : href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
        return (
          <Link key={href} href={href} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "10px 0 8px",
            color: active ? "#fff" : "#666",
            textDecoration: "none",
            gap: 3,
          }}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
