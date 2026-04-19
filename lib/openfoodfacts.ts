// Open Food Facts — free, open product database (ODbL). No API key.
// https://openfoodfacts.github.io/openfoodfacts-server/api/

const OFF_USER_AGENT = "PantryOS/0.1 (https://world.openfoodfacts.org/contributor)";

export type ParsedOffProduct = {
  name: string;
  category: string;
  qty: number;
  unit: string;
};

type OffApiProduct = {
  product_name?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
};

type OffApiResponse = {
  status: number;
  product?: OffApiProduct;
};

function mapOffTagsToCategory(tags: string[] | undefined): string {
  if (!tags?.length) return "unknown";
  const s = tags.join(" ").toLowerCase();

  if (/\byogurt\b|yoghurt|fermented-milk|fromage-blanc/.test(s)) return "dairy_yogurt";
  if (/\bmilks?\b|:milk|uht-milk|raw-milk/.test(s) && !/chocolate|condensed|coconut|almond|soy|oat-/.test(s))
    return "dairy_milk";
  if (/\bcheese\b|fromages?/.test(s)) return "dairy_cheese_soft";
  if (/\bbutter\b|margarine/.test(s)) return "dairy_butter";
  if (/\bbread\b|breads|baguette|croissant/.test(s)) return "bread";
  if (/\btortilla\b|wraps?/.test(s)) return "tortillas";
  if (/\brice\b|rices/.test(s) && !/rice-milk/.test(s)) return "rice_dry";
  if (/\bpasta\b|pastas|noodles?|spaghetti|macaroni/.test(s)) return "pasta_dry";
  if (/\begg\b|eggs/.test(s)) return "eggs";
  if (/\bcanned-beans|beans-canned|baked-beans/.test(s)) return "beans_canned";
  if (/\bdry-beans|lentils?|chickpeas?/.test(s)) return "beans_dry";
  if (/\bcanned-vegetable|pickle|canned-tomato/.test(s)) return "canned_vegetable";
  if (/\bcanned-fruit/.test(s)) return "canned_fruit";
  if (/\bsoups?|canned-soup/.test(s)) return "canned_soup";
  if (/\bcereal\b|cereals|muesli|granola/.test(s)) return "cereal";
  if (/\bflour\b|farines?/.test(s)) return "flour";
  if (/\bsugar\b|sugars/.test(s)) return "sugar";
  if (/\bolive-oil|vegetable-oil|sunflower-oil|canola-oil|cooking-oil/.test(s)) return "oil_olive";
  if (/\bfrozen-vegetable|frozen-fruits?/.test(s)) return "unknown";
  if (/\bchicken\b|poulet/.test(s)) return "meat_raw_chicken";
  if (/\bbeef\b|steak|ground-beef/.test(s)) return "meat_raw_beef";
  if (/\bground-meat|minced-meat/.test(s)) return "meat_ground";
  if (/\bdeli|ham\b|sausage|charcuterie/.test(s)) return "meat_deli";
  if (/\bfish\b|seafood|salmon|tuna/.test(s)) return "fish_raw";
  if (/\bberries\b|strawberr|raspberr|blueberr/.test(s)) return "berries";
  if (/\bapples?\b/.test(s)) return "apple";
  if (/\bbanana/.test(s)) return "banana";
  if (/\borange\b|lemon|lime|citrus|grapefruit/.test(s)) return "citrus";
  if (/\btomato/.test(s)) return "tomato";
  if (/\bavocado/.test(s)) return "avocado";
  if (/\bonion|shallot|scallion/.test(s)) return "onion";
  if (/\bpotato/.test(s)) return "potato";
  if (/\bgarlic/.test(s)) return "garlic";
  if (/\bcarrot/.test(s)) return "carrot";
  if (/\bpepper\b|capsicum|bell-pepper/.test(s)) return "bell_pepper";
  if (/\bcucumber|gherkin/.test(s)) return "cucumber";
  if (/\bbroccoli/.test(s)) return "broccoli";
  if (/\bmushroom/.test(s)) return "mushroom";
  if (/\bchili|chile|jalapeno|habanero|hot-pepper/.test(s)) return "chile_green";
  if (/\bsalad|lettuce|spinach|kale|leafy|greens?/.test(s)) return "leafy_greens";

  return "unknown";
}

function parseQuantityField(raw: string | undefined): { qty: number; unit: string } {
  if (!raw?.trim()) return { qty: 1, unit: "each" };
  const cleaned = raw.replace(/\s+e\s*$/i, "").trim();
  const m = cleaned.match(/^([\d.,]+)\s*(g|kg|ml|l|cl|dl|oz|lb|fl\s*oz)\b/i);
  if (!m) return { qty: 1, unit: "each" };
  const qty = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(qty) || qty <= 0) return { qty: 1, unit: "each" };
  let u = m[2].toLowerCase().replace(/\s+/g, "");
  if (u === "fl oz" || u === "floz") u = "oz";
  if (u === "l" || u === "kg") {
    return { qty, unit: u };
  }
  if (u === "cl") return { qty: qty * 10, unit: "ml" };
  if (u === "dl") return { qty: qty * 100, unit: "ml" };
  return { qty, unit: u };
}

function buildDisplayName(p: OffApiProduct): string {
  const name = (p.product_name ?? "").trim();
  const brands = (p.brands ?? "").trim();
  if (name && brands) return `${name} (${brands})`;
  return name || brands || "Unknown product";
}

export async function fetchOpenFoodFactsProduct(
  barcode: string
): Promise<ParsedOffProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,quantity,categories_tags`;
  const res = await fetch(url, {
    headers: { "User-Agent": OFF_USER_AGENT },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as OffApiResponse;
  if (data.status !== 1 || !data.product) return null;

  const { qty, unit } = parseQuantityField(data.product.quantity);
  return {
    name: buildDisplayName(data.product),
    category: mapOffTagsToCategory(data.product.categories_tags),
    qty,
    unit,
  };
}
