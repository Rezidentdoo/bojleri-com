#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { extractPriceData } from "./lib/extract.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = join(__dirname, "products.json");
const WEB_PATH = join(__dirname, "../src/data/products.json");
const DELAY = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)" };

async function main() {
  const products = JSON.parse(readFileSync(PRODUCTS_PATH, "utf-8"));
  console.log(`Refreshing prices for ${products.length} products...`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      await sleep(DELAY);
      const res = await fetch(p.url, { headers });
      if (!res.ok) continue;
      const html = await res.text();
      const data = extractPriceData(html);
      if (data) {
        p.price = data.price;
        p.price_formatted = data.price_formatted;
        p.availability = data.availability;
        p.price_updated_at = data.scraped_at;
        console.log(`[${i + 1}] ${p.name}: ${p.price_formatted}`);
      }
    } catch (e) {
      console.log(`[${i + 1}] ERROR ${p.name}: ${e.message}`);
    }
  }

  const json = JSON.stringify(products, null, 2);
  writeFileSync(PRODUCTS_PATH, json, "utf-8");
  writeFileSync(WEB_PATH, json, "utf-8");
  console.log("\nPrices updated.");
}

main().catch((e) => { console.error(e); process.exit(1); });