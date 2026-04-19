// Seed runner. Run with: `npx tsx db/seed.ts`
// Idempotent: clears the three lookup tables first, then inserts.
// Does NOT touch pantry_items, meals_planned, or recipes_cache.

import { db } from "@/lib/db";
import { shelfLife, localSwaps, donationOrgs, userProfile } from "@/db/schema";
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

  // Seed default user profile if none exists
  const existingProfile = db.select().from(userProfile).get();
  if (!existingProfile) {
    console.log("Inserting default user profile…");
    await db.insert(userProfile).values({
      dietary: "",
      allergies: "",
      nutritionalGoals: "",
      householdSize: 2,
      cookingSkill: "intermediate",
      aboutMe: "Based in Albuquerque, NM. I love New Mexico cuisine and try to support local producers when I can.",
    });
  } else {
    console.log("User profile already exists — skipping.");
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
