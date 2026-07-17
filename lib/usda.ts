// USDA Local Food Portal API wrapper.
// API key: USDA_LOCALFOOD_API_KEY in .env.local
// Docs: https://www.usdalocalfoodportal.com/

const BASE = "https://www.usdalocalfoodportal.com/api";

export type Kind = "csa" | "farmers_market" | "food_hub" | "on_farm_market" | "agritourism";

export type LocalOutlet = {
  name: string;
  website?: string;
  city: string;
  zip: string;
  kind: Kind;
};

export type NearbyOutlets = {
  csa: LocalOutlet[];
  farmersMarket: LocalOutlet[];
  foodHub: LocalOutlet[];
  onFarmMarket: LocalOutlet[];
  agritourism: LocalOutlet[];
};

const EMPTY: NearbyOutlets = {
  csa: [],
  farmersMarket: [],
  foodHub: [],
  onFarmMarket: [],
  agritourism: [],
};

// 1h in-memory cache — data changes slowly, no need to hammer the endpoint
const cache = new Map<string, { data: NearbyOutlets; expiresAt: number }>();

const DIRECTORIES: { endpoint: string; kind: Kind; key: keyof NearbyOutlets }[] = [
  { endpoint: "csa",           kind: "csa",            key: "csa" },
  { endpoint: "farmersmarket", kind: "farmers_market",  key: "farmersMarket" },
  { endpoint: "foodhub",       kind: "food_hub",        key: "foodHub" },
  { endpoint: "onfarmmarket",  kind: "on_farm_market",  key: "onFarmMarket" },
  { endpoint: "agritourism",   kind: "agritourism",     key: "agritourism" },
];

function normalize(raw: Record<string, any>, kind: Kind): LocalOutlet {
  return {
    name:    String(raw.listing_name ?? raw.name ?? "Unknown"),
    website: raw.media_website ? String(raw.media_website) : undefined,
    city:    String(raw.location_city ?? raw.city ?? ""),
    zip:     String(raw.location_zipcode ?? raw.zip ?? ""),
    kind,
  };
}

async function fetchDirectory(
  endpoint: string,
  kind: Kind,
  zip: string,
  radius: number,
  apiKey: string
): Promise<LocalOutlet[]> {
  const url = `${BASE}/${endpoint}/?apikey=${apiKey}&zip=${encodeURIComponent(zip)}&radius=${radius}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const data: any = await res.json();
    const items: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
    return items.map((item) => normalize(item as Record<string, unknown>, kind));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Downtown ABQ zip — used as default when no user location is available
export const ABQ_DEFAULT_ZIP = "87102";

export async function fetchNearbyLocalOutlets(
  zip = ABQ_DEFAULT_ZIP,
  radiusMi = 30
): Promise<NearbyOutlets> {
  const apiKey = process.env.USDA_LOCALFOOD_API_KEY;
  if (!apiKey) {
    console.warn("[usda] USDA_LOCALFOOD_API_KEY not set — skipping local outlets fetch");
    return { ...EMPTY };
  }

  const cacheKey = `${zip}:${radiusMi}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  const settled = await Promise.allSettled(
    DIRECTORIES.map(({ endpoint, kind }) =>
      fetchDirectory(endpoint, kind, zip, radiusMi, apiKey)
    )
  );

  const outlets: NearbyOutlets = { ...EMPTY };
  for (let i = 0; i < DIRECTORIES.length; i++) {
    const { key } = DIRECTORIES[i];
    const result = settled[i];
    outlets[key] = result.status === "fulfilled" ? result.value : [];
  }

  cache.set(cacheKey, { data: outlets, expiresAt: Date.now() + 60 * 60 * 1000 });
  return outlets;
}
