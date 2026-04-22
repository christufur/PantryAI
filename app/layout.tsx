import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import ScrollLockSafety from "@/components/ScrollLockSafety";

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-mono', display: 'swap' });

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
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {process.env.NODE_ENV === "production" ? (
          <Script id="pwa-sw-early" strategy="beforeInteractive">
            {`if(typeof navigator!=='undefined'&&'serviceWorker'in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){})}`}
          </Script>
        ) : null}
        {/*
          suppressHydrationWarning: some browser extensions (e.g. Dark Reader) mutate
          inline styles / attributes before React hydrates; class-based chrome reduces mismatch.
        */}
        <div className="utility-bar" suppressHydrationWarning>
          <Link className="utility-bar-logo" href="/">
            {/* Bare fridge mark — cutouts #000 (see .fridge-ico--bar in globals.css) */}
            <svg
              className="fridge-ico--bar"
              width="22"
              height="22"
              viewBox="0 0 120 120"
              aria-hidden="true"
              suppressHydrationWarning
            >
              <rect className="ico-body" x="30" y="12" width="60" height="96" rx="12" />
              <rect className="ico-cut" x="30" y="46" width="60" height="2" />
              <rect className="ico-cut" x="38" y="20" width="2.5" height="22" rx="1.25" />
              <rect className="ico-cut" x="38" y="52" width="2.5" height="48" rx="1.25" />
            </svg>
            pantry<span className="brand-tld">.ai</span>
          </Link>
          <div className="util-nav">
            <Link className="utility-bar-navlink" href="/">HOME</Link>
            <Link className="utility-bar-navlink" href="/wall">PLAN</Link>
            <Link className="utility-bar-navlink" href="/recipe">COOK</Link>
            <Link className="utility-bar-navlink utility-bar-navlink--impact" href="/impact">IMPACT</Link>
            <Link className="utility-bar-navlink" href="/chat">ASK THE FRIDGE</Link>
            <Link className="utility-bar-navlink utility-bar-navlink--settings" href="/settings">SETTINGS</Link>
          </div>
        </div>

        <div className="masthead" suppressHydrationWarning>
          <Link className="masthead-brand" href="/">
            <svg
              className="fridge-ico--masthead"
              width="64"
              height="64"
              viewBox="0 0 120 120"
              aria-hidden="true"
              suppressHydrationWarning
            >
              <rect className="ico-body" x="30" y="12" width="60" height="96" rx="12" />
              <rect className="ico-cut" x="30" y="46" width="60" height="2" />
              <rect className="ico-cut" x="38" y="20" width="2.5" height="22" rx="1.25" />
              <rect className="ico-cut" x="38" y="52" width="2.5" height="48" rx="1.25" />
            </svg>
            <div className="masthead-name">
              pantry<span className="brand-tld">.ai</span>
            </div>
          </Link>
          <div className="masthead-tagline">
            VISION-MODEL PANTRY TRACKER<br />
            SORT: DYING FIRST · ZERO WASTE
          </div>
        </div>

        <div className="page-content">
          {children}
        </div>

        <ScrollToTopButton />
        <PwaInstallBanner />
        <MobileBottomNav />
        <ScrollLockSafety />
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
              z-index: 170000 !important;
            }

            /* Android/Chrome: clip horizontal overflow only; keep vertical scrolling explicit
               so it isn’t accidentally suppressed when combined with modal scroll-lock. */
            html, body {
              overflow-x: hidden;
              overflow-y: auto;
              max-width: 100%;
              -webkit-overflow-scrolling: touch;
              touch-action: pan-y pinch-zoom;
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
