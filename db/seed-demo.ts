// Demo pantry seeder. Run with: `npm run db:seed:demo`
// Wipes pantry_items and inserts a realistic spread of items with
// staggered expiries so the dashboard has obvious "DYING", fresh, and
// expired rows to talk through during the pitch.

import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";

const day = 86_400_000;
const now = Date.now();
const inDays = (n: number) => new Date(now + n * day);

type DemoItem = {
  name: string;
  category: string;
  qty: number;
  unit: string;
  storageLocation: "fridge" | "freezer" | "pantry";
  expiryDate: Date;
  isLocal?: boolean;
};

// Mix: a few EXPIRED, several DYING (≤3d), a chunk fresh, a few long-shelf.
const demoItems: DemoItem[] = [
  // Expired (urgency theatre)
  { name: "Spinach", category: "leafy_greens", qty: 1, unit: "each", storageLocation: "fridge", expiryDate: inDays(-2) },

  // Dying (≤3 days) — the headline of the demo
  { name: "Strawberries", category: "berries", qty: 1, unit: "lb", storageLocation: "fridge", expiryDate: inDays(1) },
  { name: "Whole Milk", category: "dairy_milk", qty: 1, unit: "each", storageLocation: "fridge", expiryDate: inDays(2), isLocal: true },
  { name: "Ground Beef", category: "meat_ground", qty: 1, unit: "lb", storageLocation: "fridge", expiryDate: inDays(1) },
  { name: "Roma Tomatoes", category: "tomato", qty: 4, unit: "each", storageLocation: "fridge", expiryDate: inDays(3), isLocal: true },
  { name: "Hatch Green Chile", category: "chile_green", qty: 6, unit: "each", storageLocation: "fridge", expiryDate: inDays(3), isLocal: true },

  // Fresh (1–2 weeks)
  { name: "Eggs", category: "eggs", qty: 12, unit: "each", storageLocation: "fridge", expiryDate: inDays(14), isLocal: true },
  { name: "Cheddar", category: "dairy_cheese_hard", qty: 8, unit: "oz", storageLocation: "fridge", expiryDate: inDays(21) },
  { name: "Carrots", category: "carrot", qty: 1, unit: "lb", storageLocation: "fridge", expiryDate: inDays(10) },
  { name: "Bell Peppers", category: "bell_pepper", qty: 3, unit: "each", storageLocation: "fridge", expiryDate: inDays(7) },
  { name: "Bueno Flour Tortillas", category: "tortillas", qty: 1, unit: "each", storageLocation: "fridge", expiryDate: inDays(10), isLocal: true },

  // Long shelf (pantry staples)
  { name: "Bolita Beans", category: "beans_dry", qty: 1, unit: "lb", storageLocation: "pantry", expiryDate: inDays(365), isLocal: true },
  { name: "White Rice", category: "rice_dry", qty: 2, unit: "lb", storageLocation: "pantry", expiryDate: inDays(540) },
  { name: "Olive Oil", category: "oil_olive", qty: 1, unit: "each", storageLocation: "pantry", expiryDate: inDays(400) },
  { name: "Black Beans (canned)", category: "beans_canned", qty: 2, unit: "each", storageLocation: "pantry", expiryDate: inDays(800) },
];

async function main() {
  console.log("Wiping pantry_items…");
  await db.delete(pantryItems);

  console.log(`Inserting ${demoItems.length} demo pantry items…`);
  await db.insert(pantryItems).values(
    demoItems.map((i) => ({
      name: i.name,
      category: i.category,
      qty: i.qty,
      unit: i.unit,
      storageLocation: i.storageLocation,
      expiryDate: i.expiryDate,
      isLocal: i.isLocal ?? false,
    }))
  );

  console.log("Demo pantry ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
