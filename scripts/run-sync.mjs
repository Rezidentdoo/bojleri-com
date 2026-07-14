#!/usr/bin/env node
/**
 * Standalone price sync for cron (no Next.js / HTTP).
 * Reads src/data/products.json, fetches live prices from Aqualand, writes back if changed.
 *
 * Usage:
 *   node scripts/run-sync.mjs
 *   node scripts/run-sync.mjs --limit 5
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PRODUCTS_PATH = join(ROOT, "src/data/products.json");

const DELAY_MS = Number(process.env.SYNC_DELAY_MS || 400);
const PRICE_SYNC_ENABLED = process.env.PRICE_SYNC_ENABLED === "true";
const PRICE_SYNC_DISABLED_MESSAGE =
  "Automatsko ažuriranje cena je isključeno. Cene se menjaju ručno u CMS-u ili Excel uploadom.";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  "Accept-Language": "sr-RS,sr;q=0.9",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

function stableJson(data) {
  return JSON.stringify(data);
}

function parsePrice(value) {
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function formatRsd(price) {
  if (price <= 0) return "Pozovite za cenu";
  return `${Math.round(price).toLocaleString("sr-RS")} RSD`;
}

function parseAvailability(avail) {
  const s = String(avail || "");
  if (s.includes("InStock")) return "Na lageru";
  if (s.includes("OutOfStock")) return "Nema na lageru";
  if (s.includes("PreOrder")) return "Prednarudžbina";
  return "Nepoznato";
}

function extractJsonLd(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
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

function extractSalePrices(html, jsonLdPrice = 0) {
  const boxMatch = html.match(
    /class="product__details--info__price[^"]*"[^>]*>[\s\S]*?class="current__price"[^>]*>([^<]+)</i,
  );
  const oldMatch = html.match(
    /class="product__details--info__price[^"]*"[\s\S]*?class="old__price"[^>]*>([^<]+)</i,
  );

  let current = parsePrice(boxMatch?.[1]);
  const original = parsePrice(oldMatch?.[1]);
  if (!current) current = parsePrice(jsonLdPrice);

  const onSale = original > 0 && current > 0 && original > current;
  return {
    price: current,
    price_formatted: formatRsd(current),
    original_price: onSale ? original : null,
    original_price_formatted: onSale ? formatRsd(original) : null,
    on_sale: onSale,
  };
}

function extractLivePrice(html) {
  const ld = extractJsonLd(html);
  if (!ld) return null;
  const offers = ld.offers || {};
  const pricing = extractSalePrices(html, offers.price);
  return {
    ...pricing,
    availability: parseAvailability(offers.availability),
    updated_at: new Date().toISOString(),
  };
}

async function fetchWithConditionals(url, remoteCache = {}) {
  const headers = { ...FETCH_HEADERS };
  if (remoteCache.etag) headers["If-None-Match"] = remoteCache.etag;
  if (remoteCache.last_modified) headers["If-Modified-Since"] = remoteCache.last_modified;

  const res = await fetch(url, { headers });

  if (res.status === 304) {
    return {
      status: 304,
      body: null,
      etag: remoteCache.etag,
      lastModified: remoteCache.last_modified,
      unchanged: true,
    };
  }

  if (!res.ok) {
    return { status: res.status, body: null, unchanged: false };
  }

  return {
    status: res.status,
    body: await res.text(),
    etag: res.headers.get("etag") || remoteCache.etag || undefined,
    lastModified: res.headers.get("last-modified") || remoteCache.last_modified || undefined,
    unchanged: false,
  };
}

async function fetchLivePrice(sourceUrl, remoteCache = {}) {
  const page = await fetchWithConditionals(sourceUrl, remoteCache);

  if (page.unchanged) {
    return {
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

function priceFingerprint(data) {
  return hashContent(
    stableJson({
      price: data.price,
      original_price: data.original_price ?? null,
      on_sale: data.on_sale ?? false,
      availability: data.availability,
    }),
  );
}

function syncPriceFormatted(product) {
  const onSale = Boolean(product.on_sale);
  const originalPrice =
    onSale && typeof product.original_price === "number" && product.original_price > 0
      ? product.original_price
      : null;

  return {
    ...product,
    price_formatted: formatRsd(product.price),
    on_sale: onSale,
    original_price: originalPrice,
    original_price_formatted: originalPrice ? formatRsd(originalPrice) : null,
  };
}

function parseArgs(argv) {
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : 0;
  return { limit: limit > 0 ? limit : null };
}

async function runContentSync(limit = null) {
  try {
    const { syncAllProductContent } = await import("./sync-content.mjs");
    const summary = await syncAllProductContent({ quiet: true, limit });
    if (summary.updated > 0 || summary.specsUpdated > 0 || summary.imagesUpdated > 0) {
      console.log(`[sync] Content — ${JSON.stringify(summary)}`);
    }
    return Boolean(summary.changed);
  } catch (err) {
    console.log(`[sync] Content sync skipped: ${err.message}`);
    return false;
  }
}

async function runDescriptionSync(limit = null) {
  try {
    const { formatAllProductDescriptions } = await import("./format-all-descriptions.mjs");
    const descSummary = await formatAllProductDescriptions({
      quiet: true,
      fetchMissing: true,
      limit,
    });
    if (descSummary.formatted > 0 || descSummary.fetched > 0) {
      console.log(`[sync] Descriptions — ${JSON.stringify(descSummary)}`);
    }
    return Boolean(descSummary.changed);
  } catch (err) {
    console.log(`[sync] Description format skipped: ${err.message}`);
    return false;
  }
}

async function main() {
  const started = new Date();
  const { limit } = parseArgs(process.argv.slice(2));

  const products = JSON.parse(readFileSync(PRODUCTS_PATH, "utf-8"));

  if (!PRICE_SYNC_ENABLED) {
    console.log(`[sync] ${PRICE_SYNC_DISABLED_MESSAGE}`);
    const contentChanged = await runContentSync(limit);
    const descriptionsChanged = await runDescriptionSync(limit);
    if (contentChanged || descriptionsChanged) {
      await revalidateSiteCache();
    }
    process.exit(0);
  }

  const total = limit ? Math.min(limit, products.length) : products.length;

  console.log(`[sync] Started ${started.toISOString()} — ${total}/${products.length} products`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let catalogChanged = false;
  const nextProducts = [...products];

  for (let i = 0; i < total; i++) {
    const product = nextProducts[i];
    const label = `[${i + 1}/${total}] ${product.name}`;

    try {
      const live = await fetchLivePrice(product.url, {
        etag: product.page_etag,
        last_modified: product.page_last_modified,
      });

      if (live?.unchanged) {
        skipped++;
        console.log(`${label}: unchanged (304)`);
        await sleep(DELAY_MS);
        continue;
      }

      if (!live) {
        failed++;
        console.log(`${label}: fetch failed`);
        await sleep(DELAY_MS);
        continue;
      }

      const fingerprint = priceFingerprint(live);
      if (product.price_fingerprint === fingerprint) {
        nextProducts[i] = {
          ...product,
          page_etag: live.etag || product.page_etag,
          page_last_modified: live.lastModified || product.page_last_modified,
        };
        skipped++;
        console.log(`${label}: no price change`);
        await sleep(DELAY_MS);
        continue;
      }

      nextProducts[i] = syncPriceFormatted({
        ...product,
        price: live.price,
        original_price: live.original_price ?? null,
        original_price_formatted: live.original_price_formatted ?? null,
        on_sale: live.on_sale ?? false,
        availability: live.availability,
        price_updated_at: live.updated_at,
        page_etag: live.etag,
        page_last_modified: live.lastModified,
        price_fingerprint: fingerprint,
      });

      updated++;
      catalogChanged = true;
      console.log(`${label}: ${nextProducts[i].price_formatted}`);
    } catch (err) {
      failed++;
      console.log(`${label}: ERROR ${err.message}`);
    }

    await sleep(DELAY_MS);
  }

  let wrote = false;
  if (catalogChanged) {
    const json = JSON.stringify(nextProducts, null, 2);
    const current = readFileSync(PRODUCTS_PATH, "utf-8");
    if (current !== json) {
      writeFileSync(PRODUCTS_PATH, json, "utf-8");
      wrote = true;
    }
  }

  const elapsed = ((Date.now() - started.getTime()) / 1000).toFixed(1);
  const summary = {
    ok: true,
    updated,
    skipped,
    failed,
    total: products.length,
    processed: total,
    changed: catalogChanged && wrote,
    synced_at: new Date().toISOString(),
    elapsed_s: Number(elapsed),
  };

  console.log(`[sync] Done in ${elapsed}s — ${JSON.stringify(summary)}`);

  const contentChanged = await runContentSync(limit);
  const descriptionsChanged = await runDescriptionSync(limit);

  if (wrote || contentChanged || descriptionsChanged) {
    await revalidateSiteCache();
  }

  process.exit(failed > 0 && updated === 0 ? 1 : 0);
}

async function revalidateSiteCache() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.log("[sync] Cache revalidate skipped (CRON_SECRET not set)");
    return;
  }

  try {
    const res = await fetch("https://bojleri.com/api/cron/revalidate", {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const body = await res.json();
      console.log(`[sync] Cache revalidated at ${body.revalidated_at}`);
    } else {
      console.log(`[sync] Cache revalidate failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`[sync] Cache revalidate error: ${err.message}`);
  }
}

main().catch((err) => {
  console.error("[sync] Fatal:", err);
  process.exit(1);
});