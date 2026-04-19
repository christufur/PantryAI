export type PantryLike = { name: string; qty: number; unit: string };
export type ShoppingItem = { name: string; qty: number; unit: string };

const STOPWORDS = new Set([
  "fresh", "organic", "large", "small", "whole", "chopped", "diced", "sliced",
  "minced", "ground", "raw", "cooked", "dried", "canned", "frozen", "ripe",
  "baby", "mini", "extra", "virgin", "unsalted", "salted", "low", "fat",
  "reduced", "sodium", "boneless", "skinless",
]);

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t))
    .map((t) => {
      if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
      if (t.length > 3 && t.endsWith("es")) return t.slice(0, -2);
      if (t.length > 3 && t.endsWith("s")) return t.slice(0, -1);
      return t;
    });
}

function headNoun(name: string): string {
  const tokens = normalizeTokens(name);
  return tokens[tokens.length - 1] ?? "";
}

function sameHead(a: string, b: string): boolean {
  const ha = headNoun(a);
  const hb = headNoun(b);
  return ha.length >= 3 && ha === hb;
}

/**
 * Subtract pantry stock from a shopping list. Same-unit matches subtract qty.
 * Different-unit matches are left alone (we can't safely convert oz↔lb).
 */
export function reconcileShoppingList<T extends ShoppingItem>(
  list: T[],
  pantry: PantryLike[]
): T[] {
  const result: T[] = [];
  for (const item of list) {
    const matches = pantry.filter((p) => sameHead(p.name, item.name));
    if (matches.length === 0) { result.push(item); continue; }

    const sameUnitQty = matches
      .filter((p) => p.unit.toLowerCase() === item.unit.toLowerCase())
      .reduce((s, p) => s + p.qty, 0);

    if (sameUnitQty >= item.qty) continue;
    if (sameUnitQty > 0) {
      result.push({ ...item, qty: +(item.qty - sameUnitQty).toFixed(2) });
      continue;
    }
    result.push(item);
  }
  return result;
}
