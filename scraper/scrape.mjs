#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import {
  extractGalleryImages,
  ensureThreeImages,
  parsePrice,
  formatPrice,
  parseAvailability,
  extractJsonLd,
  extractProductDescription,
  extractSalePrices,
} from "./lib/extract.mjs";
import { isCatalogProduct } from "./lib/filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://www.aqualand.rs";
const BOJLERI_HUB = `${BASE}/category/bojleri/45/`;
const DELAY = 1200;
const IMAGES_DIR = join(__dirname, "images");

const TYPE_SUBCATEGORIES = [
  ["Vertikalni bojleri", `${BASE}/category/vertikalni-bojleri/46/`],
  ["Horizontalni bojleri", `${BASE}/category/horizontalni-bojleri/47/`],
  ["Protočni bojleri", `${BASE}/category/protocni-bojleri/48/`],
  ["Bojleri za centralno grejanje", `${BASE}/category/bojleri-za-centralno-grejanje/50/`],
  ["Bojleri za kuhinju", `${BASE}/category/kuhinjski-bojleri/82/`],
  ["Prateći program", `${BASE}/category/7-prateci-program/172/`],
];

const BRANDS = [
  "Electrolux", "Gorenje", "Ariston", "Metalac", "Bosch", "Termorad",
  "Končar", "Quadro", "Alfa Plam", "Tesy", "Thermex", "AEG", "Haier", "Clage",
];

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

function normalizeUrl(href) {
  let url = href || "";
  if (!url.startsWith("http")) url = BASE + url;
  return url.split("?")[0].replace(/^http:/, "https:");
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "dj")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "") || "proizvod";
}

function detectBrand(name, fromPage) {
  if (fromPage) return fromPage;
  const u = name.toUpperCase();
  for (const b of BRANDS) if (u.includes(b.toUpperCase())) return b;
  return "Ostalo";
}

function extractCapacity(name, desc) {
  const m = `${name} ${desc}`.match(/(\d+)\s*L\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractSpecifications($) {
  const specs = {};
  $("table tr").each((_, row) => {
    const cells = $(row).find("th, td");
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim();
      const val = $(cells[1]).text().trim();
      if (key && val) specs[key] = val;
    }
  });
  return specs;
}

function extractProductLinks(html) {
  const $ = cheerio.load(html);
  const urls = new Set();

  // Kartice u listingu (h4 naslovi) — tačan broj kao na aqualand.rs
  $("h4").each((_, el) => {
    const href = $(el).find('a[href*="/product/"]').first().attr("href");
    if (href) urls.add(normalizeUrl(href));
  });

  if (!urls.size) {
    $('a[href*="/product/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) urls.add(normalizeUrl(href));
    });
  }

  return urls;
}

function extractPaginationUrls(html, categoryUrl) {
  const $ = cheerio.load(html);
  const pages = new Set([normalizeUrl(categoryUrl)]);
  const base = normalizeUrl(categoryUrl).replace(/\/$/, "");

  $('a[href]').each((_, el) => {
    const href = normalizeUrl($(el).attr("href") || "");
    if (!href.startsWith(base)) return;
    const rest = href.slice(base.length);
    if (/^\/\d+\/?$/.test(rest)) pages.add(href.endsWith("/") ? href : `${href}/`);
  });

  return [...pages].sort((a, b) => {
    const num = (u) => {
      const m = u.replace(/\/$/, "").match(/\/(\d+)$/);
      return m ? parseInt(m[1], 10) : 1;
    };
    return num(a) - num(b);
  });
}

async function getCategoryProductUrls(categoryUrl, categoryName) {
  const firstHtml = await fetchHtml(categoryUrl);
  const pageUrls = extractPaginationUrls(firstHtml, categoryUrl);
  const productUrls = new Set();

  console.log(`  Category: ${categoryName} (${pageUrls.length} pages)`);
  for (const pageUrl of pageUrls) {
    console.log(`    Listing: ${pageUrl}`);
    const html = pageUrl === categoryUrl ? firstHtml : await fetchHtml(pageUrl);
    for (const u of extractProductLinks(html)) productUrls.add(u);
  }

  return productUrls;
}

async function scrapeProduct(url, category) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const ld = extractJsonLd(html);

  let name = ld?.name?.trim();
  let description = extractProductDescription(html, ld?.description || "");
  let brand = typeof ld?.brand === "object" ? ld.brand.name : ld?.brand;
  const pricing = extractSalePrices(html, ld?.offers?.price);
  let availability = parseAvailability(ld?.offers?.availability);

  if (!name) name = $("h1").first().text().trim();
  if (!name) return null;

  const slug = slugify(name);
  const gallery = extractGalleryImages(html, BASE);
  const remoteImages = ensureThreeImages(gallery);
  const specifications = extractSpecifications($);

  const product = {
    id: slug,
    name,
    brand: detectBrand(name, brand),
    category,
    price: pricing.price,
    price_formatted: pricing.price_formatted,
    original_price: pricing.original_price,
    original_price_formatted: pricing.original_price_formatted,
    on_sale: pricing.on_sale,
    availability,
    url,
    description,
    sku: ld?.sku || ld?.mpn || "",
    capacity_liters: extractCapacity(name, description),
    specifications,
    images: remoteImages,
    image_url: remoteImages[0] || "",
    scraped_at: new Date().toISOString().slice(0, 10),
    price_updated_at: new Date().toISOString(),
  };

  if (!isCatalogProduct(product)) return null;
  return product;
}

function pickCategory(existing, next) {
  if (!existing || existing === "Bojleri") return next;
  if (next === "Bojleri") return existing;
  return next;
}

async function main() {
  mkdirSync(IMAGES_DIR, { recursive: true });

  console.log(`Hub: ${BOJLERI_HUB}`);
  const sources = TYPE_SUBCATEGORIES;

  const productMap = new Map();
  for (const [catName, catUrl] of sources) {
    const urls = await getCategoryProductUrls(catUrl, catName);
    console.log(`  Found ${urls.size} links`);
    for (const u of urls) {
      productMap.set(u, pickCategory(productMap.get(u), catName));
    }
  }

  console.log(`\nTotal unique products: ${productMap.size}`);
  const products = [];
  const entries = [...productMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (let i = 0; i < entries.length; i++) {
    const [url, category] = entries[i];
    console.log(`[${i + 1}/${entries.length}] ${url}`);
    try {
      const p = await scrapeProduct(url, category);
      if (p) products.push(p);
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  products.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, "sr"));
  const out = join(__dirname, "products.json");
  writeFileSync(out, JSON.stringify(products, null, 2), "utf-8");
  console.log(`\nDone! ${products.length} proizvoda -> ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });