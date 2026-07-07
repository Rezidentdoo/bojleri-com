#!/usr/bin/env node
/**
 * Upoređuje lokalne podatke sa produkcijskim sajtom (read-only).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const products = JSON.parse(readFileSync(join(root, "src/data/products.json"), "utf-8"));

const res = await fetch("https://bojleri.com/katalog");
const html = await res.text();
const liveSlugs = new Set([...html.matchAll(/\/proizvod\/([a-z0-9-]+)/g)].map((m) => m[1]));
const localSlugs = new Set(products.map((p) => p.id));

const onlyLocal = [...localSlugs].filter((s) => !liveSlugs.has(s));
const onlyLive = [...liveSlugs].filter((s) => !localSlugs.has(s));

console.log("\n🔍 Provera: lokal vs bojleri.com (produkcija)\n");
console.log(`  Lokalnih proizvoda:     ${localSlugs.size}`);
console.log(`  Na live sajtu:          ${liveSlugs.size}`);
console.log(`  Samo lokalno:           ${onlyLocal.length}`);
console.log(`  Samo na live:           ${onlyLive.length}`);

if (onlyLocal.length) {
  console.log("\n  ⚠ Samo lokalno (prvih 5):", onlyLocal.slice(0, 5).join(", "));
}
if (onlyLive.length) {
  console.log("\n  ⚠ Samo na live (prvih 5):", onlyLive.slice(0, 5).join(", "));
}

const blobImages = products.filter((p) =>
  [...(p.images || []), p.image_url].some((u) => u && String(u).includes("blob.vercel-storage")),
).length;

console.log(`\n  Proizvodi sa Blob slikama: ${blobImages}`);
console.log(blobImages === 0 ? "  ✓ Sve slike su sa aqualand.rs ili lokalnih putanja" : "  ⚠ Potrebno preslikati Blob slike");

if (onlyLocal.length === 0 && onlyLive.length === 0) {
  console.log("\n✅ Lokalni products.json odgovara produkciji.\n");
} else {
  console.log("\n⚠ Postoje razlike — proveri pre migracije.\n");
}