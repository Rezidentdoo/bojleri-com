#!/usr/bin/env node
/**
 * Sinhronizuje broj i URL slika sa Aqualand.rs, preuzima na disk,
 * ažurira src/data/products.json (1–3 slike po proizvodu).
 *
 * Usage:
 *   node scripts/sync-gallery.mjs
 *   node scripts/sync-gallery.mjs --limit 20
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { extractGalleryImages, ensureThreeImages } from "../scraper/lib/extract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PRODUCTS_PATH = join(ROOT, "src/data/products.json");
const MEDIA_DIR = join(ROOT, "public/uploads/cms-media");

const PAGE_DELAY_MS = Number(process.env.GALLERY_PAGE_DELAY_MS || 350);
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

function hashContent(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function stableJson(data) {
  return JSON.stringify(data);
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
  return { limit: limit > 0 ? limit : null };
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

async function main() {
  const { limit } = parseArgs(process.argv.slice(2));
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

  const stats = { updated: 0, unchanged: 0, failed: 0, counts: { 1: 0, 2: 0, 3: 0 } };

  console.log(`[gallery] Sync ${total}/${products.length} products from Aqualand...`);

  for (let i = 0; i < total; i++) {
    const product = products[i];
    const label = `[${i + 1}/${total}] ${product.name}`;

    if (!product.url?.includes("aqualand.rs")) {
      const count = (product.images || []).length;
      if (count >= 1 && count <= 3) stats.counts[count]++;
      stats.unchanged++;
      continue;
    }

    try {
      await sleep(PAGE_DELAY_MS);
      const res = await fetch(product.url, { headers: PAGE_HEADERS });
      if (!res.ok) throw new Error(`page ${res.status}`);

      const html = await res.text();
      const gallery = extractGalleryImages(html);
      const sourceImages = ensureThreeImages(
        gallery.length ? gallery : product.source_images?.length ? product.source_images : [product.image_url].filter(Boolean),
      );

      const imageCache = [];
      const localImages = [];

      for (const sourceUrl of sourceImages) {
        if (!sourceUrl || !sourceUrl.includes("aqualand")) continue;
        try {
          const entry = await mirrorSourceUrl(sourceUrl, urlCache);
          imageCache.push(entry);
          localImages.push(entry.blob_url);
        } catch (err) {
          console.log(`${label} — slika preskočena: ${err.message}`);
        }
      }

      if (!localImages.length) {
        stats.failed++;
        console.log(`${label} — nema slika`);
        continue;
      }

      const sourceHash = hashContent(stableJson([...sourceImages].sort()));
      const prevCount = (product.images || []).length;
      const nextCount = localImages.length;

      product.source_images = sourceImages;
      product.image_cache = imageCache;
      product.images = localImages;
      product.image_url = localImages[0];
      product.image_fingerprint = sourceHash;

      stats.counts[nextCount] = (stats.counts[nextCount] || 0) + 1;

      if (prevCount !== nextCount || product.images.some((u, idx) => u !== localImages[idx])) {
        stats.updated++;
        console.log(`${label}: ${nextCount} slika`);
      } else {
        stats.unchanged++;
      }
    } catch (err) {
      stats.failed++;
      console.log(`${label} — ERROR: ${err.message}`);
    }
  }

  writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + "\n", "utf-8");

  console.log(`[gallery] Done — ${JSON.stringify(stats)}`);
  process.exit(stats.failed > 0 && stats.updated === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[gallery] Fatal:", err);
  process.exit(1);
});