import * as cheerio from "cheerio";

import { extractJsonLd } from "@/lib/scraper";

function toHiRes(url: string): string {
  return url.replace(/\/images\/(\d+)\/\d+\//, "/images/$1/1300/");
}

export function extractGalleryImages(html: string, baseUrl = "https://www.aqualand.rs"): string[] {
  const $ = cheerio.load(html);
  const images = new Set<string>();

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
    for (const img of imgs) {
      if (typeof img === "string") images.add(toHiRes(img));
    }
  }

  return [...images];
}

export function ensureThreeImages(images: string[]): string[] {
  return [...new Set(images.filter(Boolean))].slice(0, 3);
}

export function extractSpecificationsFromHtml(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const specs: Record<string, string> = {};

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