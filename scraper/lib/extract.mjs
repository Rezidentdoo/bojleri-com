import * as cheerio from "cheerio";

export function toHiRes(url) {
  return url.replace(/\/images\/(\d+)\/\d+\//, "/images/$1/1300/");
}

export function extractJsonLd(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product") return item;
      }
    } catch {}
  }
  return null;
}

export function extractGalleryImages(html, baseUrl = "https://www.aqualand.rs") {
  const $ = cheerio.load(html);
  const images = new Set();

  $('a[href*="/images/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const full = href.startsWith("http") ? href : baseUrl + href;
    if (full.includes("/1300/") || full.includes("/800/")) {
      images.add(toHiRes(full));
    }
  });

  const ld = extractJsonLd(html);
  if (ld?.image) {
    const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
    for (const img of imgs) images.add(toHiRes(img));
  }

  return [...images];
}

export function ensureThreeImages(images) {
  const unique = [...new Set(images.filter(Boolean))];
  return unique.slice(0, 3);
}

/** @deprecated use ensureThreeImages */
export function ensureFiveImages(images) {
  return ensureThreeImages(images);
}

export function decodeHtmlEntities(text) {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&times;/g, "×")
    .replace(/&ndash;/g, "–")
    .replace(/&ldquo;/g, "\"")
    .replace(/&rdquo;/g, "\"")
    .replace(/&Scaron;/g, "Š")
    .replace(/&scaron;/g, "š")
    .replace(/&ccaron;/g, "č")
    .replace(/&Ccaron;/g, "Č")
    .replace(/&cacute;/g, "ć")
    .replace(/&Cacute;/g, "Ć")
    .replace(/&zcaron;/g, "ž")
    .replace(/&Zcaron;/g, "Ž")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function cleanDescription(html) {
  if (!html) return "";
  const $ = cheerio.load(`<div>${html}</div>`, null, false);
  const text = $("div").text().replace(/\s+/g, " ").trim();
  return decodeHtmlEntities(text);
}

export function extractProductDescription(html, jsonLdDescription = "") {
  const $ = cheerio.load(html);
  let best = cleanDescription(jsonLdDescription || "");

  for (const sel of [
    "#description",
    ".product__description",
    "#tab-description",
    ".tab-content",
    ".product-description",
  ]) {
    const raw = $(sel).first().html() || "";
    const text = cleanDescription(raw);
    if (text.length > best.length) best = text;
  }

  return best;
}

export function parsePrice(value) {
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export function formatPrice(price) {
  if (price <= 0) return "Pozovite za cenu";
  return `${Math.round(price).toLocaleString("sr-RS")} RSD`;
}

export function parseAvailability(avail) {
  const s = String(avail || "");
  if (s.includes("InStock")) return "Na lageru";
  if (s.includes("OutOfStock")) return "Nema na lageru";
  if (s.includes("PreOrder")) return "Prednarudžbina";
  return "Nepoznato";
}

export function extractSalePrices(html, jsonLdPrice = 0) {
  const $ = cheerio.load(html);
  const box = $(".product__details--info__price").first();
  let current = parsePrice(box.find(".current__price").first().text());
  const original = parsePrice(box.find(".old__price").first().text());

  if (!current) current = parsePrice(jsonLdPrice);
  if (!current) current = parsePrice($(".product__details--info__price .current__price").first().text());

  const onSale = original > 0 && current > 0 && original > current;
  return {
    price: current,
    price_formatted: formatPrice(current),
    original_price: onSale ? original : null,
    original_price_formatted: onSale ? formatPrice(original) : null,
    on_sale: onSale,
  };
}

export function extractSpecificationsFromHtml(html) {
  const $ = cheerio.load(html);
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

export function extractPriceData(html) {
  const ld = extractJsonLd(html);
  if (!ld) return null;
  const offers = ld.offers || {};
  const pricing = extractSalePrices(html, offers.price);
  return {
    ...pricing,
    availability: parseAvailability(offers.availability),
    name: ld.name,
    scraped_at: new Date().toISOString(),
  };
}