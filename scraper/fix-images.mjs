#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  extractGalleryImages,
  ensureThreeImages,
  extractPriceData,
  formatPrice,
} from "./lib/extract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = join(__dirname, "products.json");
const WEB_PATH = join(__dirname, "../web/src/data/products.json");
const DELAY = 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  "Accept-Language": "sr-RS,sr;q=0.9",
};

async function fetchHtml(url) {
  await sleep(DELAY);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function main() {
  const products = JSON.parse(readFileSync(PRODUCTS_PATH, "utf-8"));
  console.log(`Updating ${products.length} products (images + prices)...`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`[${i + 1}/${products.length}] ${p.name}`);
    try {
      const html = await fetchHtml(p.url);
      const gallery = extractGalleryImages(html);
      const images = ensureThreeImages(gallery.length ? gallery : [p.image_url].filter(Boolean));
      const priceData = extractPriceData(html);

      p.images = images;
      p.image_url = images[0] || p.image_url;
      if (priceData) {
        p.price = priceData.price;
        p.price_formatted = priceData.price_formatted;
        p.availability = priceData.availability;
        p.price_updated_at = priceData.scraped_at;
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      if (p.image_url) {
        p.images = ensureFiveImages([p.image_url]);
      }
    }
  }

  const json = JSON.stringify(products, null, 2);
  writeFileSync(PRODUCTS_PATH, json, "utf-8");
  writeFileSync(WEB_PATH, json, "utf-8");

  const with5 = products.filter((p) => p.images?.length >= 5).length;
  console.log(`\nDone! ${with5}/${products.length} products have 5 images`);
}

main().catch((e) => { console.error(e); process.exit(1); });