// Seed runner. Run with: `npx tsx db/seed.ts`
// Idempotent: clears the three lookup tables first, then inserts.
// Does NOT touch pantry_items, meals_planned, or recipes_cache.

import { db } from "@/lib/db";
import { shelfLife, localSwaps, donationOrgs } from "@/db/schema";
import shelfLifeData from "./seed/shelf_life.json";
import localSwapsData from "./seed/local_swaps.json";
import donationOrgsData from "./seed/donation_orgs.json";

async function main() {
  console.log("Clearing lookup tables…");
  await db.delete(shelfLife);
  await db.delete(localSwaps);
  await db.delete(donationOrgs);

  console.log(`Inserting ${shelfLifeData.length} shelf_life rows…`);
  await db.insert(shelfLife).values(shelfLifeData);

  console.log(`Inserting ${localSwapsData.length} local_swaps rows…`);
  await db.insert(localSwaps).values(localSwapsData);

  console.log(`Inserting ${donationOrgsData.length} donation_orgs rows…`);
  await db.insert(donationOrgs).values(donationOrgsData);

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
