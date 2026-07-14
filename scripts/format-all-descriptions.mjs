#!/usr/bin/env node
/**
 * Formatira opise svih proizvoda prema prodajnom šablonu.
 * Pokreće se iz cron-a (run-sync.mjs) ili ručno:
 *   node scripts/format-all-descriptions.mjs
 *   node scripts/format-all-descriptions.mjs --limit 10
 *   node scripts/format-all-descriptions.mjs --force
 */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import {
  formatProductDescription,
  isFormattedProductDescription,
  migrateDescriptionHeadings,
  preprocessRawDescription,
  stripFormattedDescription,
} from "../src/lib/cms/format-product-description.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PRODUCTS_PATH = join(ROOT, "src/data/products.json");

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  "Accept-Language": "sr-RS,sr;q=0.9",
};

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJsonLdDescription(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.["@type"] === "Product" && item.description) {
          return stripHtml(String(item.description));
        }
      }
    } catch {}
  }
  return "";
}

function extractDescriptionFromHtml(html) {
  let best = extractJsonLdDescription(html);
  const patterns = [
    /id=["']description["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*product__description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /id=["']tab-description["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*tab-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const text = stripHtml(match[1]);
    if (text.length > best.length) best = text;
  }

  return best;
}

async function fetchDescription(url) {
  if (!url || !url.includes("aqualand.rs")) return "";
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return "";
    const html = await res.text();
    return extractDescriptionFromHtml(html);
  } catch {
    return "";
  }
}

function parseArgs(argv) {
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : 0;
  return {
    limit: limit > 0 ? limit : null,
    force: argv.includes("--force"),
    fetchMissing: !argv.includes("--no-fetch"),
    quiet: argv.includes("--quiet"),
  };
}

function descriptionFingerprint(raw, formatted) {
  return hashContent(`${preprocessRawDescription(raw)}::${formatted}`);
}

/**
 * @param {{ limit?: number|null, force?: boolean, fetchMissing?: boolean, quiet?: boolean }} [opts]
 */
export async function formatAllProductDescriptions(opts = {}) {
  const { limit = null, force = false, fetchMissing = true, quiet = false } = opts;
  const started = Date.now();
  const products = JSON.parse(readFileSync(PRODUCTS_PATH, "utf-8"));
  const total = limit ? Math.min(limit, products.length) : products.length;

  let formatted = 0;
  let skipped = 0;
  let fetched = 0;
  let failed = 0;
  let changed = false;
  const next = [...products];

  for (let i = 0; i < total; i++) {
    const product = next[i];
    const label = `[${i + 1}/${total}] ${product.name}`;

    try {
      let raw = String(product.description || "").trim();

      if (force && product.url) {
        const fetchedRaw = await fetchDescription(product.url);
        if (fetchedRaw) {
          raw = fetchedRaw;
          fetched++;
          if (!quiet) console.log(`${label}: ponovo preuzet sa Aqualand-a`);
        } else if (isFormattedProductDescription(raw)) {
          raw = stripFormattedDescription(raw);
          if (!quiet) console.log(`${label}: koristi raspetljen formatirani opis`);
        }
      } else if (!raw && fetchMissing && product.url) {
        raw = await fetchDescription(product.url);
        if (raw) {
          fetched++;
          if (!quiet) console.log(`${label}: preuzet opis sa Aqualand-a`);
        }
      } else if (force && isFormattedProductDescription(raw)) {
        raw = stripFormattedDescription(raw);
      }

      if (!raw) {
        const metaRaw = [product.name, product.category, product.brand]
          .filter(Boolean)
          .join(". ");
        const metaFormatted = formatProductDescription(metaRaw, {
          specifications: product.specifications || {},
          name: product.name || "",
          category: product.category || "",
        });

        if (metaFormatted) {
          const fp = descriptionFingerprint(metaRaw, metaFormatted);
          next[i] = {
            ...product,
            description: metaFormatted,
            description_raw_hash: hashContent(preprocessRawDescription(metaRaw)),
            description_fingerprint: fp,
            description_formatted_at: new Date().toISOString(),
          };
          formatted++;
          changed = true;
          if (!quiet) console.log(`${label}: generisan opis iz naziva`);
          continue;
        }

        skipped++;
        if (!quiet) console.log(`${label}: nema opisa`);
        continue;
      }

      let nextFormatted = formatProductDescription(raw, {
        specifications: product.specifications || {},
        name: product.name || "",
        category: product.category || "",
      });

      if (!nextFormatted && isFormattedProductDescription(product.description)) {
        nextFormatted = migrateDescriptionHeadings(product.description);
      }

      if (!nextFormatted) {
        skipped++;
        continue;
      }

      nextFormatted = migrateDescriptionHeadings(nextFormatted);

      const fp = descriptionFingerprint(raw, nextFormatted);
      const alreadyFormatted =
        isFormattedProductDescription(product.description) &&
        product.description_fingerprint === fp &&
        !product.description.includes("**Kratak uvod**") &&
        !product.description.includes("**Završna rečenica**");

      if (alreadyFormatted && !force) {
        skipped++;
        if (!quiet) console.log(`${label}: već formatiran`);
        continue;
      }

      if (!force && product.description === nextFormatted && product.description_fingerprint === fp) {
        skipped++;
        continue;
      }

      next[i] = {
        ...product,
        description: nextFormatted,
        description_raw_hash: hashContent(preprocessRawDescription(raw)),
        description_fingerprint: fp,
        description_formatted_at: new Date().toISOString(),
      };

      formatted++;
      changed = true;
      if (!quiet) console.log(`${label}: formatiran`);
    } catch (err) {
      failed++;
      console.log(`${label}: ERROR ${err.message}`);
    }
  }

  let wrote = false;
  if (changed) {
    const json = JSON.stringify(next, null, 2);
    const current = readFileSync(PRODUCTS_PATH, "utf-8");
    if (current !== json) {
      writeFileSync(PRODUCTS_PATH, json, "utf-8");
      wrote = true;
    }
  }

  const summary = {
    ok: true,
    formatted,
    skipped,
    fetched,
    failed,
    changed: wrote,
    processed: total,
    total: products.length,
    elapsed_s: Number(((Date.now() - started) / 1000).toFixed(1)),
  };

  if (!quiet) {
    console.log(`[descriptions] Done — ${JSON.stringify(summary)}`);
  }

  return summary;
}

async function revalidateSiteCache() {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  try {
    const res = await fetch("https://bojleri.com/api/cron/revalidate", {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const body = await res.json();
      console.log(`[descriptions] Cache revalidated at ${body.revalidated_at}`);
    }
  } catch (err) {
    console.log(`[descriptions] Cache revalidate error: ${err.message}`);
  }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  formatAllProductDescriptions(args)
    .then(async (summary) => {
      if (summary.changed) await revalidateSiteCache();
      process.exit(summary.failed > 0 && summary.formatted === 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("[descriptions] Fatal:", err);
      process.exit(1);
    });
}