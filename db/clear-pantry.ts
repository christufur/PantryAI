// Wipes all rows from pantry_items only (lookup tables and caches unchanged).
// Run: npm run db:clear-pantry
// Prefer stopping `npm run dev` first so this process is the only writer and the UI reloads a fresh state.

import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";

async function main() {
  await db.delete(pantryItems);
  console.log("Cleared pantry_items.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
