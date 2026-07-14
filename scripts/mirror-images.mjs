#!/usr/bin/env node
/**
 * Preuzima sve slike proizvoda na lokalni disk (public/uploads/cms-media)
 * i ažurira src/data/products.json da koristi /uploads/ putanje.
 *
 * Usage:
 *   node scripts/mirror-images.mjs
 *   node scripts/mirror-images.mjs --limit 10
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PRODUCTS_PATH = join(ROOT, "src/data/products.json");
const MEDIA_DIR = join(ROOT, "public/uploads/cms-media");

const SOURCE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  Referer: "https://www.aqualand.rs/",
};

const DELAY_MS = Number(process.env.MIRROR_DELAY_MS || 150);

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

function isRemoteUrl(url) {
  return (
    typeof url === "string" &&
    (url.includes("aqualand.rs") || url.includes("blob.vercel-storage.com"))
  );
}

function isLocalUrl(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

async function downloadImage(sourceUrl) {
  const res = await fetch(sourceUrl, { headers: SOURCE_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length) throw new Error("empty body");
  return bytes;
}

function parseArgs(argv) {
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx !== -1 ? Number(argv[limitIdx + 1]) : 0;
  return { limit: limit > 0 ? limit : null };
}

async function main() {
  const { limit } = parseArgs(process.argv.slice(2));
  mkdirSync(MEDIA_DIR, { recursive: true });

  const products = JSON.parse(readFileSync(PRODUCTS_PATH, "utf-8"));
  const urlCache = new Map();

  // Pre-fill cache from existing image_cache metadata
  for (const product of products) {
    for (const entry of product.image_cache || []) {
      if (entry?.source_url && entry?.blob_url && entry?.sha256) {
        urlCache.set(entry.source_url, {
          source_url: entry.source_url,
          blob_url: entry.blob_url,
          sha256: entry.sha256,
        });
      }
    }
    for (const img of product.images || []) {
      if (isLocalUrl(img)) {
        const sha = img.split("/").pop()?.replace(/\.[^.]+$/, "");
        if (!sha) continue;
        const sources = product.source_images?.length ? product.source_images : [];
        for (const src of sources) {
          if (!urlCache.has(src)) {
            urlCache.set(src, { source_url: src, blob_url: img, sha256: sha });
          }
        }
      }
    }
  }

  const pendingUrls = [];
  for (const product of products) {
    const sources = (product.source_images?.length ? product.source_images : product.images || []).filter(
      isRemoteUrl,
    );
    for (const url of sources) {
      if (!urlCache.has(url)) pendingUrls.push(url);
    }
  }

  const uniquePending = [...new Set(pendingUrls)];
  const toFetch = limit ? uniquePending.slice(0, limit) : uniquePending;

  console.log(
    `[mirror] ${products.length} products, ${uniquePending.length} remote images to fetch (${toFetch.length} this run)`,
  );

  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const sourceUrl = toFetch[i];
    const label = `[${i + 1}/${toFetch.length}]`;

    try {
      const filenameFromCache = [...urlCache.values()].find((e) => e.source_url === sourceUrl)?.sha256;
      const ext = extensionFromUrl(sourceUrl);
      const guessedName = filenameFromCache ? `${filenameFromCache}${ext}` : null;

      if (guessedName && existsSync(join(MEDIA_DIR, guessedName))) {
        urlCache.set(sourceUrl, {
          source_url: sourceUrl,
          blob_url: localUrl(guessedName),
          sha256: guessedName.replace(ext, ""),
        });
        skipped++;
        console.log(`${label} skip existing ${guessedName}`);
        continue;
      }

      await sleep(DELAY_MS);
      const bytes = await downloadImage(sourceUrl);
      const sha256 = hashContent(bytes);
      const filename = `${sha256}${ext}`;
      const diskPath = join(MEDIA_DIR, filename);

      if (!existsSync(diskPath)) {
        writeFileSync(diskPath, bytes);
        downloaded++;
      } else {
        skipped++;
      }

      urlCache.set(sourceUrl, {
        source_url: sourceUrl,
        blob_url: localUrl(filename),
        sha256,
      });

      console.log(`${label} OK ${filename} (${bytes.length} B)`);
    } catch (err) {
      failed++;
      console.log(`${label} FAIL ${sourceUrl} — ${err.message}`);
    }
  }

  let productsUpdated = 0;

  for (const product of products) {
    const sourceImages = (product.source_images?.length ? product.source_images : product.images || []).filter(
      Boolean,
    );
    const remoteSources = sourceImages.filter(isRemoteUrl);
    if (!remoteSources.length && (product.images || []).every(isLocalUrl)) continue;

    const cache = [];
    const images = [];

    for (const src of sourceImages) {
      if (isLocalUrl(src)) {
        images.push(src);
        continue;
      }
      const entry = urlCache.get(src);
      if (!entry) continue;
      cache.push(entry);
      images.push(entry.blob_url);
    }

    if (!images.length) continue;

    const sourceHash = hashContent(stableJson([...sourceImages].sort()));

    product.source_images = sourceImages.filter((u) => isRemoteUrl(u) || isLocalUrl(u));
    product.image_cache = cache;
    product.images = images;
    product.image_url = images[0] || product.image_url;
    product.image_fingerprint = sourceHash;
    productsUpdated++;
  }

  writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2) + "\n", "utf-8");

  const summary = {
    downloaded,
    skipped,
    failed,
    productsUpdated,
    totalFiles: readdirSync(MEDIA_DIR).length,
  };

  console.log(`[mirror] Done — ${JSON.stringify(summary)}`);
  process.exit(failed > 0 && downloaded === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[mirror] Fatal:", err);
  process.exit(1);
});