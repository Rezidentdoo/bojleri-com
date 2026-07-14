#!/usr/bin/env node
/**
 * Sinhronizuje slike i specifikacije sa Aqualand.rs (bez cena).
 *
 * Usage:
 *   node scripts/sync-content.mjs
 *   node scripts/sync-content.mjs --limit 20
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  ensureThreeImages,
  extractGalleryImages,
  extractSpecificationsFromHtml,
} from "../scraper/lib/extract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PRODUCTS_PATH = join(ROOT, "src/data/products.json");
const MEDIA_DIR = join(ROOT, "public/uploads/cms-media");

const PAGE_DELAY_MS = Number(process.env.SYNC_DELAY_MS || 400);
const IMAGE_DELAY_MS = Number(process.env.GALLERY_IMAGE_DELAY_MS || 80);

const PAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  "Accept-Language": "sr-RS,sr;q=0.9",
};

const IMAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  Referer: "https://www.aqualand.rs/",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hashContent(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(data) {
  return JSON.stringify(data);
}

function specsFingerprint(specs) {
  const sorted = Object.fromEntries(
    Object.entries(specs || {}).sort(([a], [b]) => a.localeCompare(b, "sr")),
  );
  return hashContent(stableJson(sorted));
}

function extensionFromUrl(url) {
  const match = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (!match) return ".jpg";
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? ".jpg" : `.${ext}`;
}

function localUrl(filename) {
  return `/uploads/cms-media/${filename}`;
}

function parseArgs(argv) {
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : 0;
  return { limit: limit > 0 ? limit : null, quiet: argv.includes("--quiet") };
}

async function mirrorSourceUrl(sourceUrl, cache) {
  const cached = cache.get(sourceUrl);
  if (cached) return cached;

  await sleep(IMAGE_DELAY_MS);
  const res = await fetch(sourceUrl, { headers: IMAGE_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const bytes = Buffer.from(await res.arrayBuffer());
  const sha256 = hashContent(bytes);
  const ext = extensionFromUrl(sourceUrl);
  const filename = `${sha256}${ext}`;
  const diskPath = join(MEDIA_DIR, filename);

  if (!existsSync(diskPath)) {
    writeFileSync(diskPath, bytes);
  }

  const entry = {
    source_url: sourceUrl,
    blob_url: localUrl(filename),
    sha256,
  };
  cache.set(sourceUrl, entry);
  return entry;
}

/**
 * @param {{ limit?: number|null, quiet?: boolean }} [opts]
 */
export async function syncAllProductContent(opts = {}) {
  const { limit = null, quiet = false } = opts;
  mkdirSync(MEDIA_DIR, { recursive: true });

  const products = JSON.parse(readFileSync(PRODUCTS_PATH, "utf-8"));
  const total = limit ? Math.min(limit, products.length) : products.length;
  const urlCache = new Map();

  for (const product of products) {
    for (const entry of product.image_cache || []) {
      if (entry?.source_url && entry?.blob_url) {
        urlCache.set(entry.source_url, entry);
      }
    }
  }

  const stats = {
    updated: 0,
    skipped: 0,
    failed: 0,
    specsUpdated: 0,
    imagesUpdated: 0,
    changed: false,
    total: products.length,
    processed: total,
  };

  if (!quiet) {
    console.log(`[content] Sync ${total}/${products.length} products (slike + specifikacije, bez cena)...`);
  }

  for (let i = 0; i < total; i++) {
    const product = products[i];
    const label = `[${i + 1}/${total}] ${product.name}`;

    if (!product.url?.includes("aqualand.rs")) {
      stats.skipped++;
      continue;
    }

    try {
      await sleep(PAGE_DELAY_MS);
      const headers = { ...PAGE_HEADERS };
      if (product.page_etag) headers["If-None-Match"] = product.page_etag;
      if (product.page_last_modified) headers["If-Modified-Since"] = product.page_last_modified;

      const res = await fetch(product.url, { headers, signal: AbortSignal.timeout(25_000) });

      if (res.status === 304) {
        stats.skipped++;
        if (!quiet) console.log(`${label}: unchanged (304)`);
        continue;
      }

      if (!res.ok) throw new Error(`page ${res.status}`);

      const html = await res.text();
      const gallery = extractGalleryImages(html);
      const sourceImages = ensureThreeImages(
        gallery.length
          ? gallery
          : product.source_images?.length
            ? product.source_images
            : [product.image_url].filter(Boolean),
      );
      const specifications = extractSpecificationsFromHtml(html);

      let changed = false;
      let specsChanged = false;
      let imagesChanged = false;

      if (Object.keys(specifications).length > 0) {
        const nextFp = specsFingerprint(specifications);
        const prevFp = specsFingerprint(product.specifications || {});
        if (nextFp !== prevFp) {
          product.specifications = specifications;
          specsChanged = true;
          changed = true;
        }
      }

      product.page_etag = res.headers.get("etag") || product.page_etag;
      product.page_last_modified = res.headers.get("last-modified") || product.page_last_modified;

      const sourceHash = hashContent(stableJson([...sourceImages].sort()));
      const imageCache = [];
      const localImages = [];

      for (const sourceUrl of sourceImages) {
        if (!sourceUrl?.includes("aqualand")) continue;
        try {
          const entry = await mirrorSourceUrl(sourceUrl, urlCache);
          imageCache.push(entry);
          localImages.push(entry.blob_url);
        } catch (err) {
          if (!quiet) console.log(`${label} — slika preskočena: ${err.message}`);
        }
      }

      if (localImages.length) {
        const prevImages = (product.images || []).join("|");
        const nextImages = localImages.join("|");
        const prevHash = product.image_fingerprint;

        product.source_images = sourceImages;
        product.image_cache = imageCache;
        product.images = localImages;
        product.image_url = localImages[0];
        product.image_fingerprint = sourceHash;

        if (prevImages !== nextImages || prevHash !== sourceHash) {
          imagesChanged = true;
          changed = true;
        }
      }

      if (changed) {
        stats.updated++;
        if (specsChanged) stats.specsUpdated++;
        if (imagesChanged) stats.imagesUpdated++;
        if (!quiet) {
          const parts = [];
          if (specsChanged) parts.push("specifikacije");
          if (imagesChanged) parts.push(`${localImages.length} slika`);
          console.log(`${label}: ${parts.join(", ") || "meta"}`);
        }
      } else {
        stats.skipped++;
      }
    } catch (err) {
      stats.failed++;
      if (!quiet) console.log(`${label} — ERROR: ${err.message}`);
    }
  }

  if (stats.updated > 0) {
    const json = JSON.stringify(products, null, 2) + "\n";
    const current = readFileSync(PRODUCTS_PATH, "utf-8");
    if (current !== json) {
      writeFileSync(PRODUCTS_PATH, json, "utf-8");
      stats.changed = true;
    }
  }

  if (!quiet) {
    console.log(`[content] Done — ${JSON.stringify(stats)}`);
  }

  return stats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stats = await syncAllProductContent(args);
  process.exit(stats.failed > 0 && stats.updated === 0 ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error("[content] Fatal:", err);
    process.exit(1);
  });
}