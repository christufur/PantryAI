// Impact calculations for rescued pantry items.
// Prices are US grocery averages per "each" unit (2024).
// Weights are in lbs per typical single unit.
// CO₂ factor: ~3.8 lbs CO₂e per lb food waste avoided (EPA).
// Water factor: ~65 gallons per lb food (rough global average).

type CategoryData = { priceUsd: number; weightLbs: number };

const CATEGORY_DATA: Record<string, CategoryData> = {
  leafy_greens:       { priceUsd: 3.50, weightLbs: 0.50 },
  berries:            { priceUsd: 4.00, weightLbs: 0.75 },
  apple:              { priceUsd: 0.75, weightLbs: 0.33 },
  banana:             { priceUsd: 0.25, weightLbs: 0.25 },
  citrus:             { priceUsd: 1.00, weightLbs: 0.50 },
  tomato:             { priceUsd: 3.00, weightLbs: 0.50 },
  avocado:            { priceUsd: 1.50, weightLbs: 0.33 },
  onion:              { priceUsd: 0.75, weightLbs: 0.25 },
  potato:             { priceUsd: 0.75, weightLbs: 0.25 },
  garlic:             { priceUsd: 0.50, weightLbs: 0.10 },
  carrot:             { priceUsd: 2.00, weightLbs: 0.50 },
  bell_pepper:        { priceUsd: 1.25, weightLbs: 0.33 },
  cucumber:           { priceUsd: 1.50, weightLbs: 0.50 },
  broccoli:           { priceUsd: 3.00, weightLbs: 0.75 },
  mushroom:           { priceUsd: 3.00, weightLbs: 0.50 },
  chile_green:        { priceUsd: 2.00, weightLbs: 0.25 },
  dairy_milk:         { priceUsd: 4.50, weightLbs: 0.50 },
  dairy_yogurt:       { priceUsd: 1.50, weightLbs: 0.25 },
  dairy_cheese_hard:  { priceUsd: 4.00, weightLbs: 0.50 },
  dairy_cheese_soft:  { priceUsd: 4.00, weightLbs: 0.50 },
  dairy_butter:       { priceUsd: 5.00, weightLbs: 0.25 },
  eggs:               { priceUsd: 4.00, weightLbs: 1.50 },
  meat_raw_chicken:   { priceUsd: 8.00, weightLbs: 2.00 },
  meat_raw_beef:      { priceUsd: 10.00, weightLbs: 1.00 },
  meat_ground:        { priceUsd: 6.00, weightLbs: 1.00 },
  meat_deli:          { priceUsd: 5.00, weightLbs: 0.50 },
  fish_raw:           { priceUsd: 12.00, weightLbs: 1.00 },
  bread:              { priceUsd: 4.00, weightLbs: 1.00 },
  tortillas:          { priceUsd: 3.00, weightLbs: 0.75 },
  rice_dry:           { priceUsd: 2.00, weightLbs: 2.00 },
  rice_cooked:        { priceUsd: 1.00, weightLbs: 0.50 },
  pasta_dry:          { priceUsd: 2.00, weightLbs: 1.00 },
  pasta_cooked:       { priceUsd: 1.50, weightLbs: 0.50 },
  beans_dry:          { priceUsd: 2.00, weightLbs: 1.00 },
  beans_canned:       { priceUsd: 1.50, weightLbs: 0.50 },
  canned_vegetable:   { priceUsd: 1.00, weightLbs: 0.50 },
  canned_fruit:       { priceUsd: 1.50, weightLbs: 0.50 },
  canned_soup:        { priceUsd: 2.50, weightLbs: 0.75 },
  cereal:             { priceUsd: 4.50, weightLbs: 1.00 },
  flour:              { priceUsd: 3.00, weightLbs: 2.00 },
  sugar:              { priceUsd: 3.00, weightLbs: 2.00 },
  oil_olive:          { priceUsd: 8.00, weightLbs: 1.00 },
  leftovers:          { priceUsd: 5.00, weightLbs: 0.50 },
  unknown:            { priceUsd: 3.00, weightLbs: 0.50 },
};

const CO2_PER_LB = 3.8;   // lbs CO₂e per lb food waste avoided
const WATER_PER_LB = 65;  // gallons per lb food

export type ImpactEvent = {
  category: string;
  qty: number;
  unit: string;
};

export type ImpactTotals = {
  itemsRescued: number;
  dollarsSaved: number;
  lbsSaved: number;
  co2Lbs: number;
  gallonsSaved: number;
};

export function computeImpact(events: ImpactEvent[]): ImpactTotals {
  let dollarsSaved = 0;
  let lbsSaved = 0;

  for (const e of events) {
    const data = CATEGORY_DATA[e.category] ?? CATEGORY_DATA.unknown;
    // qty is the number of "each" / standard units — multiply straight through
    dollarsSaved += data.priceUsd * e.qty;
    lbsSaved += data.weightLbs * e.qty;
  }

  return {
    itemsRescued: events.length,
    dollarsSaved,
    lbsSaved,
    co2Lbs: lbsSaved * CO2_PER_LB,
    gallonsSaved: lbsSaved * WATER_PER_LB,
  };
}
