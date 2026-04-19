import type { IdentifiedItem } from "@/lib/gemini";
import demoItems from "@/data/demo-photo-identified.json";

/**
 * Demo / conference builds: skip Gemini for photo ingest (slow, flaky on venue Wi‑Fi).
 * Default: on. Set env `DEMO_PHOTO_MOCK=false` (or `0`) to use real Gemini vision.
 */
export const DEMO_PHOTO_MOCK_ENABLED = (() => {
  const v = process.env.DEMO_PHOTO_MOCK?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return true;
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
