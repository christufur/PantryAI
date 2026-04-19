"use client";

import PhotoUploadDialog from "@/components/PhotoUploadDialog";
import PantryKitchenBoard from "@/components/PantryKitchenBoard";
import type { PlainItem } from "@/components/pantry-types";

export type { PlainItem } from "@/components/pantry-types";

export default function PantryViewSwitcher({
  items,
  nowMs,
}: {
  items: PlainItem[];
  /** Server time for first paint — avoids SSR/client `Date.now()` hydration mismatch. */
  nowMs: number;
}) {
  if (items.length === 0) {
    return (
      <div
        style={{ maxWidth: 560, margin: "0 auto", padding: "48px 32px 80px", textAlign: "center" }}
        className="page-grid-outer pantry-empty"
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(var(--text-subtitle), 6vw, var(--text-subtitle-max))",
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Nothing here yet.
        </div>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-md)",
            color: "var(--caption)",
            margin: "0 auto 28px",
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          Add a photo of your fridge or pantry and we&apos;ll line everything up on the board.
        </p>
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <PhotoUploadDialog fullWidthTrigger triggerVariant="outline" />
        </div>
        <style>{`
          @media (max-width: 768px) {
            .pantry-empty { padding: 36px 20px 72px !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-grid-outer">
      <PantryKitchenBoard items={items} nowMs={nowMs} />
      <style>{`
        @media (max-width: 768px) {
          .page-grid-outer { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
