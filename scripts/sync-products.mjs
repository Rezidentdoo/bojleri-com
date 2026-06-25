import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "../../scraper/products.json");
const dest = join(__dirname, "../src/data/products.json");

import { existsSync } from "fs";

if (!existsSync(src)) {
  console.log("Scraper data not found, using bundled products.json");
  process.exit(0);
}

try {
  const data = readFileSync(src, "utf-8");
  const products = JSON.parse(data);
  writeFileSync(dest, JSON.stringify(products, null, 2), "utf-8");
  console.log(`Synced ${products.length} products to ${dest}`);
} catch (e) {
  console.error("Sync failed:", e.message);
  process.exit(1);
}