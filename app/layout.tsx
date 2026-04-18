import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import Link from "next/link";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "pantry.ai",
  description: "Vision-model pantry tracker. Sort: dying first. Zero waste.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        {/* Utility bar */}
        <div style={{
          background: '#000', color: '#fff',
          padding: '14px 40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.10em'
        }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>PANTRYOS.APP</Link>
          <div className="util-nav" style={{ display: 'flex', gap: 28 }}>
            <Link href="/wall" style={{ color: '#fff', textDecoration: 'none' }}>WALL</Link>
            <Link href="/recipe" style={{ color: '#fff', textDecoration: 'none' }}>COOK</Link>
            <Link href="/plan" style={{ color: '#fff', textDecoration: 'none' }}>PLAN</Link>
            <Link href="/donate" style={{ color: '#fff', textDecoration: 'none' }}>DONATE</Link>
            <Link href="/chat" style={{ color: '#fff', textDecoration: 'none' }}>ASK THE FRIDGE</Link>
          </div>
        </div>

        {/* Masthead */}
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

        {children}

        <style>{`
          @media (max-width: 768px) {
            .util-nav { display: none !important; }
            .masthead-name { font-size: 36px !important; }
            .masthead-tagline { display: none !important; }
            .masthead { padding: 20px 16px 16px !important; }
          }
        `}</style>
      </body>
    </html>
  );
}
