#!/usr/bin/env node
/**
 * Brza provera da self-hosted mod može da čita/piše lokalne fajlove.
 * Ne menja .env.local — koristi env iz .env.selfhosted ako postoji.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const selfhostedEnv = loadEnvFile(join(root, ".env.selfhosted"));
for (const [key, value] of Object.entries(selfhostedEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

if (process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("\n❌ BLOB_READ_WRITE_TOKEN je podešen — self-hosted test zahteva disk mod.\n");
  process.exit(1);
}

const required = [
  "src/data/products.json",
  "src/data/site-settings.json",
  "src/data/orders.json",
];

console.log("\n🧪 Self-hosted provera\n");

for (const rel of required) {
  const full = join(root, rel);
  if (!existsSync(full)) {
    console.error(`  ❌ Nedostaje: ${rel}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(full, "utf-8"));
  const count = Array.isArray(data) ? data.length : 1;
  console.log(`  ✓ ${rel} (${count} stavki)`);
}

const products = JSON.parse(readFileSync(join(root, "src/data/products.json"), "utf-8"));
const blobImages = products.filter((p) =>
  [...(p.images || []), p.image_url].some((u) => u && String(u).includes("blob.vercel-storage")),
).length;

console.log(`  ✓ Blob slike u katalogu: ${blobImages}`);
console.log("\n✅ Self-hosted storage je spreman za lokalni test.\n");
console.log("Sledeće:");
console.log("  cp .env.selfhosted .env.local");
console.log("  npm run dev\n");