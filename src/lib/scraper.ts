import { fetchWithConditionals, type RemoteCacheHeaders } from "@/lib/conditional-fetch";

export function parsePrice(value: unknown): number {
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export function formatRsd(price: number): string {
  if (price <= 0) return "Pozovite za cenu";
  return `${Math.round(price).toLocaleString("sr-RS")} RSD`;
}

export function parseAvailability(avail: unknown): string {
  const s = String(avail || "");
  if (s.includes("InStock")) return "Na lageru";
  if (s.includes("OutOfStock")) return "Nema na lageru";
  if (s.includes("PreOrder")) return "Prednarudžbina";
  return "Nepoznato";
}

export function extractJsonLd(html: string): Record<string, unknown> | null {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.["@type"] === "Product") return item;
      }
    } catch {}
  }
  return null;
}

export interface LivePriceData {
  price: number;
  price_formatted: string;
  original_price?: number | null;
  original_price_formatted?: string | null;
  on_sale?: boolean;
  availability: string;
  updated_at: string;
  unchanged?: boolean;
  etag?: string;
  lastModified?: string;
}

export function extractSalePrices(html: string, jsonLdPrice: unknown = 0) {
  const currentFromLd = parsePrice(jsonLdPrice);
  const boxMatch = html.match(
    /class="product__details--info__price[^"]*"[^>]*>[\s\S]*?class="current__price"[^>]*>([^<]+)</i,
  );
  const oldMatch = html.match(
    /class="product__details--info__price[^"]*"[\s\S]*?class="old__price"[^>]*>([^<]+)</i,
  );

  let current = parsePrice(boxMatch?.[1]);
  const original = parsePrice(oldMatch?.[1]);
  if (!current) current = currentFromLd;

  const onSale = original > 0 && current > 0 && original > current;
  return {
    price: current,
    price_formatted: formatRsd(current),
    original_price: onSale ? original : null,
    original_price_formatted: onSale ? formatRsd(original) : null,
    on_sale: onSale,
  };
}

export function extractLivePrice(html: string): LivePriceData | null {
  const ld = extractJsonLd(html);
  if (!ld) return null;
  const offers = (ld.offers as Record<string, unknown>) || {};
  const pricing = extractSalePrices(html, offers.price);
  return {
    ...pricing,
    availability: parseAvailability(offers.availability),
    updated_at: new Date().toISOString(),
  };
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  "Accept-Language": "sr-RS,sr;q=0.9",
};

export async function fetchLivePrice(
  sourceUrl: string,
  options?: { noCache?: boolean; remoteCache?: RemoteCacheHeaders },
): Promise<LivePriceData | null> {
  if (options?.noCache) {
    const res = await fetch(sourceUrl, {
      headers: FETCH_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const live = extractLivePrice(html);
    if (!live) return null;
    return {
      ...live,
      etag: res.headers.get("etag") || undefined,
      lastModified: res.headers.get("last-modified") || undefined,
    };
  }

  const page = await fetchWithConditionals(sourceUrl, {
    headers: FETCH_HEADERS,
    remoteCache: options?.remoteCache,
    next: { revalidate: 3600 },
  });

  if (page.unchanged) {
    return {
      price: 0,
      price_formatted: "",
      availability: "",
      updated_at: new Date().toISOString(),
      unchanged: true,
      etag: page.etag,
      lastModified: page.lastModified,
    };
  }

  if (!page.body) return null;
  const live = extractLivePrice(page.body);
  if (!live) return null;

  return {
    ...live,
    etag: page.etag,
    lastModified: page.lastModified,
  };
}