import "server-only";

import { PRICE_SYNC_DISABLED_MESSAGE, isAutoPriceSyncEnabled } from "@/lib/cms/price-sync-config";
import { hashContent, stableJson } from "@/lib/cms/blob-client";
import { readAllProducts, writeAllProducts } from "@/lib/cms/store";
import { syncPriceFormatted } from "@/lib/product-utils";
import {
  ensureThreeImages,
  extractGalleryImages,
  extractSpecificationsFromHtml,
} from "@/lib/aqualand-content";
import { extractLivePrice } from "@/lib/scraper";
import { fetchWithConditionals } from "@/lib/conditional-fetch";
import { isBlobCdnUrl, mirrorImageList } from "@/lib/image-mirror";
import type { Product } from "@/types/product";

const SYNC_DELAY_MS = Number(process.env.SYNC_DELAY_MS || 400);
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  "Accept-Language": "sr-RS,sr;q=0.9",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function priceFingerprint(data: {
  price: number;
  original_price?: number | null;
  on_sale?: boolean;
  availability: string;
}): string {
  return hashContent(
    stableJson({
      price: data.price,
      original_price: data.original_price ?? null,
      on_sale: data.on_sale ?? false,
      availability: data.availability,
    }),
  );
}

function specsFingerprint(specs: Record<string, string>): string {
  const sorted = Object.fromEntries(
    Object.entries(specs).sort(([a], [b]) => a.localeCompare(b, "sr")),
  );
  return hashContent(stableJson(sorted));
}

function productContentHash(product: Product): string {
  return hashContent(
    stableJson({
      price: product.price,
      original_price: product.original_price,
      on_sale: product.on_sale,
      availability: product.availability,
      images: product.images,
      image_url: product.image_url,
      name: product.name,
      description: product.description,
      specifications: product.specifications,
    }),
  );
}

export interface CatalogSyncResult {
  ok: boolean;
  updated: number;
  skipped: number;
  failed: number;
  mirrored: number;
  imageDownloads: number;
  specsUpdated: number;
  total: number;
  changed: boolean;
  synced_at: string;
  disabled?: boolean;
  message?: string;
}

export async function syncCatalogContent(): Promise<CatalogSyncResult> {
  const products = await readAllProducts();

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let mirrored = 0;
  let imageDownloads = 0;
  let specsUpdated = 0;
  let catalogChanged = false;

  const nextProducts = products.map((product) => ({ ...product }));

  for (let i = 0; i < nextProducts.length; i++) {
    const product = nextProducts[i];

    if (!product.url?.includes("aqualand.rs")) {
      skipped++;
      continue;
    }

    try {
      const page = await fetchWithConditionals(product.url, {
        headers: FETCH_HEADERS,
        remoteCache: {
          etag: product.page_etag,
          last_modified: product.page_last_modified,
        },
      });

      if (page.unchanged) {
        skipped++;
        await sleep(SYNC_DELAY_MS);
        continue;
      }

      if (!page.body) {
        failed++;
        await sleep(SYNC_DELAY_MS);
        continue;
      }

      const html = page.body;
      const gallery = extractGalleryImages(html);
      const sourceImages = ensureThreeImages(
        gallery.length
          ? gallery
          : product.source_images?.length
            ? product.source_images
            : [product.image_url].filter(Boolean),
      );
      const specifications = extractSpecificationsFromHtml(html);

      let merged: Product = {
        ...product,
        page_etag: page.etag || product.page_etag,
        page_last_modified: page.lastModified || product.page_last_modified,
      };
      let changed = false;

      if (Object.keys(specifications).length > 0) {
        const nextFp = specsFingerprint(specifications);
        const prevFp = specsFingerprint(product.specifications || {});
        if (nextFp !== prevFp) {
          merged.specifications = specifications;
          specsUpdated++;
          changed = true;
        }
      }

      if (sourceImages.length) {
        const sourceHash = hashContent(stableJson([...sourceImages].sort()));
        const needsMirror =
          merged.image_fingerprint !== sourceHash ||
          !merged.images?.every(isBlobCdnUrl);

        if (needsMirror) {
          const result = await mirrorImageList(sourceImages, product.image_cache || []);
          if (result.images.length) {
            merged = {
              ...merged,
              source_images: sourceImages,
              image_cache: result.cache,
              images: result.images,
              image_url: result.images[0] || merged.image_url,
              image_fingerprint: sourceHash,
            };
            mirrored++;
            imageDownloads += result.downloaded;
            changed = true;
          }
        } else if (merged.image_fingerprint !== sourceHash) {
          merged.source_images = sourceImages;
          merged.image_fingerprint = sourceHash;
          changed = true;
        }
      }

      if (changed) {
        merged.content_hash = productContentHash(merged);
        nextProducts[i] = merged;
        updated++;
        catalogChanged = true;
      } else if (
        merged.page_etag !== product.page_etag ||
        merged.page_last_modified !== product.page_last_modified
      ) {
        nextProducts[i] = merged;
        catalogChanged = true;
        skipped++;
      } else {
        skipped++;
      }
    } catch {
      failed++;
    }

    await sleep(SYNC_DELAY_MS);
  }

  const wrote = await writeAllProducts(nextProducts);

  return {
    ok: true,
    updated,
    skipped,
    failed,
    mirrored,
    imageDownloads,
    specsUpdated,
    total: products.length,
    changed: catalogChanged || wrote,
    synced_at: new Date().toISOString(),
  };
}

export async function syncCatalogPrices(): Promise<CatalogSyncResult> {
  const contentResult = await syncCatalogContent();

  if (!isAutoPriceSyncEnabled()) {
    return {
      ...contentResult,
      disabled: true,
      message: `${PRICE_SYNC_DISABLED_MESSAGE} Slike i specifikacije se i dalje automatski sinhronizuju.`,
    };
  }

  const products = await readAllProducts();
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let catalogChanged = false;
  const nextProducts = products.map((product) => ({ ...product }));

  for (let i = 0; i < nextProducts.length; i++) {
    const product = nextProducts[i];

    if (!product.url?.includes("aqualand.rs")) {
      skipped++;
      continue;
    }

    try {
      const page = await fetchWithConditionals(product.url, {
        headers: FETCH_HEADERS,
        remoteCache: {
          etag: product.page_etag,
          last_modified: product.page_last_modified,
        },
      });

      if (page.unchanged) {
        skipped++;
        await sleep(SYNC_DELAY_MS);
        continue;
      }

      if (!page.body) {
        failed++;
        await sleep(SYNC_DELAY_MS);
        continue;
      }

      const live = extractLivePrice(page.body);
      if (!live) {
        failed++;
        await sleep(SYNC_DELAY_MS);
        continue;
      }

      const fingerprint = priceFingerprint(live);
      if (product.price_fingerprint === fingerprint) {
        nextProducts[i] = {
          ...product,
          page_etag: page.etag || product.page_etag,
          page_last_modified: page.lastModified || product.page_last_modified,
        };
        skipped++;
        await sleep(SYNC_DELAY_MS);
        continue;
      }

      nextProducts[i] = syncPriceFormatted({
        ...product,
        price: live.price,
        original_price: live.original_price ?? null,
        original_price_formatted: live.original_price_formatted ?? null,
        on_sale: live.on_sale ?? false,
        availability: live.availability,
        price_updated_at: live.updated_at,
        page_etag: page.etag,
        page_last_modified: page.lastModified,
        price_fingerprint: fingerprint,
      });

      updated++;
      catalogChanged = true;
    } catch {
      failed++;
    }

    await sleep(SYNC_DELAY_MS);
  }

  const wrote = await writeAllProducts(nextProducts);
  const changed = contentResult.changed || catalogChanged || wrote;

  return {
    ok: true,
    updated: contentResult.updated + updated,
    skipped: contentResult.skipped + skipped,
    failed: contentResult.failed + failed,
    mirrored: contentResult.mirrored,
    imageDownloads: contentResult.imageDownloads,
    specsUpdated: contentResult.specsUpdated,
    total: products.length,
    changed,
    synced_at: new Date().toISOString(),
  };
}