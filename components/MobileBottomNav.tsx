"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChefHat, CalendarDays, MessageCircle, Settings } from "lucide-react";

const NAV = [
  { href: "/",        label: "HOME",  Icon: Home         },
  { href: "/recipe",  label: "COOK",  Icon: ChefHat      },
  { href: "/plan",    label: "PLAN",  Icon: CalendarDays },
  { href: "/chat",    label: "CHAT",  Icon: MessageCircle },
  { href: "/settings",label: "ME",   Icon: Settings      },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#000", borderTop: "2px solid #222",
      display: "flex",
      zIndex: 99999,
      paddingBottom: "env(safe-area-inset-bottom)",
    }} className="mobile-bottom-nav">
      {NAV.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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
