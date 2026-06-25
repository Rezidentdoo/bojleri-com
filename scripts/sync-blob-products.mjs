#!/usr/bin/env node
/**
 * Sinhronizuje src/data/products.json u Vercel Blob (cms/products.json).
 * Pokreni sa BLOB_READ_WRITE_TOKEN u okruženju.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = join(__dirname, "../src/data/products.json");
const BLOB_PATH = "cms/products.json";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.log("BLOB_READ_WRITE_TOKEN not set, skipping blob sync");
  process.exit(0);
}

const products = JSON.parse(readFileSync(productsPath, "utf-8"));
await put(BLOB_PATH, JSON.stringify(products, null, 2), {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

console.log(`Blob updated: ${products.length} products -> ${BLOB_PATH}`);