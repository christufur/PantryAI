// Seed runner. Run with: `npx tsx db/seed.ts`
// Idempotent: clears the three lookup tables first, then inserts.
// Does NOT touch pantry_items, meals_planned, or recipes_cache.

import { db } from "@/lib/db";
import { shelfLife, localSwaps, donationOrgs, userProfile, pantryItems } from "@/db/schema";
import shelfLifeData from "./seed/shelf_life.json";
import localSwapsData from "./seed/local_swaps.json";
import donationOrgsData from "./seed/donation_orgs.json";
import pantryItemsData from "./seed/pantry_items.json";

async function main() {
  console.log("Clearing tables…");
  await db.delete(pantryItems);
  await db.delete(shelfLife);
  await db.delete(localSwaps);
  await db.delete(donationOrgs);

  console.log(`Inserting ${shelfLifeData.length} shelf_life rows…`);
  await db.insert(shelfLife).values(shelfLifeData);

  console.log(`Inserting ${localSwapsData.length} local_swaps rows…`);
  await db.insert(localSwaps).values(localSwapsData);

  console.log(`Inserting ${donationOrgsData.length} donation_orgs rows…`);
  await db.insert(donationOrgs).values(donationOrgsData);

  const now = Date.now();
  const pantryRows = pantryItemsData.map(({ daysFromNow, ...item }) => ({
    ...item,
    expiryDate: new Date(now + daysFromNow * 86_400_000),
  }));
  console.log(`Inserting ${pantryRows.length} pantry_items rows…`);
  await db.insert(pantryItems).values(pantryRows);

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
