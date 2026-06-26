#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isCatalogProduct } from "./lib/filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "products.json");

const products = JSON.parse(readFileSync(path, "utf-8"));
const kept = [];
const removed = [];

for (const p of products) {
  if (isCatalogProduct(p)) kept.push(p);
  else removed.push(p);
}

writeFileSync(path, JSON.stringify(kept, null, 2), "utf-8");
console.log(`Uklonjeno: ${removed.length}`);
for (const p of removed) console.log(`  - [${p.category}] ${p.name}`);
console.log(`Ostalo: ${kept.length} proizvoda`);