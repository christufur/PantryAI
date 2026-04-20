import type { IdentifiedItem } from "@/lib/gemini";
import demoItems from "@/data/demo-photo-identified.json";

/**
 * Demo / conference builds: skip Gemini for photo ingest (slow, flaky on venue Wi‑Fi).
 * Default: off (real vision). Set `DEMO_PHOTO_MOCK=true` to use the pre-seeded JSON.
 */
export const DEMO_PHOTO_MOCK_ENABLED = (() => {
  const v = process.env.DEMO_PHOTO_MOCK?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
})();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Random delay so loading hints feel plausible (client shows animations while fetch is in flight). */
export async function delayDemoPhotoMock(): Promise<void> {
  await sleep(5000 + Math.random() * 5000);
}

export function getDemoPhotoIdentifiedItems(): IdentifiedItem[] {
  return demoItems as IdentifiedItem[];
}
