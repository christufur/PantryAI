import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "pantry.ai",
  description: "Vision-model pantry tracker. Sort: dying first. Zero waste.",
  applicationName: "pantry.ai",
  appleWebApp: {
    capable: true,
    title: "pantry.ai",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Utility bar */}
        <div className="utility-bar" style={{
          background: '#000', color: '#fff',
          padding: '14px 40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.10em'
        }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
            pantry<span style={{ color: '#888', fontWeight: 400 }}>.ai</span>
          </Link>
          <div className="util-nav" style={{ display: 'flex', gap: 28 }}>
            <Link href="/wall" style={{ color: '#fff', textDecoration: 'none' }}>WALL</Link>
            <Link href="/recipe" style={{ color: '#fff', textDecoration: 'none' }}>COOK</Link>
            <Link href="/donate" style={{ color: '#fff', textDecoration: 'none' }}>DONATE</Link>
            <Link href="/chat" style={{ color: '#fff', textDecoration: 'none' }}>ASK THE FRIDGE</Link>
            <Link href="/settings" style={{ color: '#888', textDecoration: 'none' }}>SETTINGS</Link>
          </div>
        </div>

        {/* Masthead — desktop only */}
        <div className="masthead" style={{
          padding: '48px 40px 36px',
          borderBottom: '2px solid #000',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          gap: 40, flexWrap: 'wrap'
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div className="masthead-name" style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontWeight: 700, fontSize: 72, lineHeight: 0.9,
              letterSpacing: '-0.03em', color: '#000'
            }}>
              pantry<span style={{ color: 'var(--caption)', fontWeight: 400 }}>.ai</span>
            </div>
          </Link>
          <div className="masthead-tagline" style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--caption)', lineHeight: 1.9, textAlign: 'right'
          }}>
            VISION-MODEL PANTRY TRACKER<br/>
            SORT: DYING FIRST · ZERO WASTE
          </div>
        </div>

        {/* Page content — add bottom padding on mobile for the tab bar */}
        <div className="page-content">
          {children}
        </div>

        <ScrollToTopButton />
        <MobileBottomNav />
        <RegisterServiceWorker />

        <style>{`
          .mobile-bottom-nav { display: none !important; }

          .pantry-snap-bar {
            display: flex;
            justify-content: center;
            width: 100%;
            padding: 0 0 24px;
            box-sizing: border-box;
          }
          .pantry-snap-bar-inner {
            width: 100%;
            max-width: 480px;
          }

          /* Shell breakpoint: must exceed phone landscape width (~844–932px) or the bottom tab bar stays hidden while the top links are already hidden. */
          @media (max-width: 960px) {
            /* Show bottom nav, hide desktop util-nav links */
            .mobile-bottom-nav { display: flex !important; }
            .util-nav { display: none !important; }

            /* Slim top bar — just the logo */
            .utility-bar {
              padding: 12px 16px !important;
              justify-content: center !important;
            }

            /* Hide masthead entirely on mobile — logo is in top bar */
            .masthead { display: none !important; }

            /* Room for fixed tab bar + home indicator */
            .page-content {
              padding-bottom: calc(5.75rem + env(safe-area-inset-bottom, 0px));
            }

            /* Keep “back to top” above the tab bar so it doesn’t cover CHAT */
            .scroll-to-top-btn {
              bottom: calc(5.25rem + env(safe-area-inset-bottom, 0px)) !important;
            }

            .pantry-snap-bar { padding: 0 0 20px; }
            .pantry-snap-bar-inner { max-width: 360px; }

            .sidebar-add-snap { display: none !important; }
            .empty-state-desktop-snap { display: none !important; }
            .desktop-only-snap-aux { display: none !important; }
          }
        `}</style>
      </body>
    </html>
  );
}
