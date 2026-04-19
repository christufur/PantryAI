import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import Link from "next/link";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import PwaInstallBanner from "@/components/PwaInstallBanner";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "pantry.ai",
  description: "Vision-model pantry tracker. Sort: dying first. Zero waste.",
  applicationName: "pantry.ai",
  openGraph: {
    title: "pantry.ai",
    description: "Vision-model pantry tracker. Sort: dying first. Zero waste.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  /** Legacy Android hint alongside manifest (Chrome still reads manifest for install UI). */
  other: {
    "mobile-web-app-capable": "yes",
  },
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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
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
        {process.env.NODE_ENV === "production" ? (
          <Script id="pwa-sw-early" strategy="beforeInteractive">
            {`if(typeof navigator!=='undefined'&&'serviceWorker'in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){})}`}
          </Script>
        ) : null}
        {/* Utility bar */}
        <div className="utility-bar" style={{
          background: '#000', color: '#fff',
          padding: '14px 40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.10em'
        }}>
          <Link
            href="/"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Bare fridge mark — no tile bg, body inherits white, cutouts match black nav */}
            <svg width="22" height="22" viewBox="0 0 120 120" aria-hidden="true" style={{ flexShrink: 0 }}>
              <rect x="30" y="12" width="60" height="96" rx="12" fill="currentColor"/>
              <rect x="30" y="46" width="60" height="2" fill="#000"/>
              <rect x="38" y="20" width="2.5" height="22" rx="1.25" fill="#000"/>
              <rect x="38" y="52" width="2.5" height="48" rx="1.25" fill="#000"/>
            </svg>
            pantry<span style={{ color: '#888', fontWeight: 400 }}>.ai</span>
          </Link>
          <div className="util-nav" style={{ display: 'flex', gap: 28 }}>
            <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>HOME</Link>
            <Link href="/plan" style={{ color: '#fff', textDecoration: 'none' }}>PLAN</Link>
            <Link href="/recipe" style={{ color: '#fff', textDecoration: 'none' }}>COOK</Link>
            <Link href="/impact" style={{ color: '#c8102e', textDecoration: 'none', fontWeight: 700 }}>IMPACT</Link>
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
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static app mark from /public */}
            <img
              src="/icons/icon.svg"
              alt=""
              width={64}
              height={64}
              aria-hidden
              style={{ flexShrink: 0, borderRadius: 14 }}
            />
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
        <PwaInstallBanner />
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

          /* Shell breakpoint: tablets in landscape often exceed 960px; keep tab bar + slim header until large desktop. */
          @media (max-width: 1280px) {
            /* Show bottom nav, hide desktop util-nav links */
            .mobile-bottom-nav {
              display: flex !important;
              z-index: 150000 !important;
            }

            /* Android/Chrome: wide content (e.g. week grid) must not widen the document or fixed chrome drifts horizontally. */
            html, body {
              overflow-x: hidden;
              max-width: 100%;
            }
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

            /* Install banner sits above the tab bar (Android PWA prompt) */
            .pwa-install-banner {
              bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px)) !important;
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
