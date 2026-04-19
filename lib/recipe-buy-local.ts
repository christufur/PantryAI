import { db } from "@/lib/db";
import { localSwaps as localSwapsTable } from "@/db/schema";

export type BuyLocalEntry = {
  ingredient: string;
  producer: string;
  product: string;
  store: string;
};

/** Match saved ingredient names against NM local producer swap rows. */
export function computeBuyLocal(savedItems: string[]): BuyLocalEntry[] {
  if (savedItems.length === 0) return [];
  const allSwaps = db.select().from(localSwapsTable).all();
  return savedItems.flatMap((name: string) => {
    const nameLower = name.toLowerCase();
    const match = allSwaps.find(
      (s) =>
        nameLower.includes(s.genericName.toLowerCase()) ||
        s.genericName.toLowerCase().includes(nameLower)
    );
    return match
      ? [{ ingredient: name, producer: match.localProducer, product: match.product, store: match.whereToBuy }]
      : [];
  });
}
