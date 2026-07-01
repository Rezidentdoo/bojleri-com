import "server-only";

import { hashContent, stableJson } from "@/lib/cms/blob-client";
import { readAllProducts, writeAllProducts } from "@/lib/cms/store";
import { syncPriceFormatted } from "@/lib/product-utils";
import { fetchLivePrice, type LivePriceData } from "@/lib/scraper";
import { isBlobCdnUrl, mirrorImageList } from "@/lib/image-mirror";
import type { Product } from "@/types/product";

const PRICE_DELAY_MS = Number(process.env.SYNC_DELAY_MS || 400);
const IMAGE_MIRROR_BATCH = Number(process.env.IMAGE_MIRROR_BATCH || 25);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function priceFingerprint(data: Pick<LivePriceData, "price" | "original_price" | "on_sale" | "availability">): string {
  return hashContent(
    stableJson({
      price: data.price,
      original_price: data.original_price ?? null,
      on_sale: data.on_sale ?? false,
      availability: data.availability,
    }),
  );
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
  total: number;
  changed: boolean;
  synced_at: string;
}

export async function syncCatalogPrices(): Promise<CatalogSyncResult> {
  const products = await readAllProducts();
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let mirrored = 0;
  let imageDownloads = 0;
  let catalogChanged = false;

  const nextProducts: Product[] = [];

  for (const product of products) {
    try {
      const live = await fetchLivePrice(product.url, {
        remoteCache: {
          etag: product.page_etag,
          last_modified: product.page_last_modified,
        },
      });

      if (live?.unchanged) {
        nextProducts.push(product);
        skipped++;
        await sleep(PRICE_DELAY_MS);
        continue;
      }

      if (!live) {
        nextProducts.push(product);
        failed++;
        await sleep(PRICE_DELAY_MS);
        continue;
      }

      const fingerprint = priceFingerprint(live);
      if (product.price_fingerprint === fingerprint) {
        const withHeaders: Product = {
          ...product,
          page_etag: live.etag || product.page_etag,
          page_last_modified: live.lastModified || product.page_last_modified,
        };
        nextProducts.push(withHeaders);
        skipped++;
        await sleep(PRICE_DELAY_MS);
        continue;
      }

      const merged = syncPriceFormatted({
        ...product,
        price: live.price,
        original_price: live.original_price ?? null,
        original_price_formatted: live.original_price_formatted ?? null,
        on_sale: live.on_sale ?? false,
        availability: live.availability,
        price_updated_at: live.updated_at,
        page_etag: live.etag,
        page_last_modified: live.lastModified,
        price_fingerprint: fingerprint,
      });

      nextProducts.push(merged);
      updated++;
      catalogChanged = true;
    } catch {
      nextProducts.push(product);
      failed++;
    }

    await sleep(PRICE_DELAY_MS);
  }

  const mirrorCandidates = nextProducts
    .filter((p) => p.images?.some((url) => url && !isBlobCdnUrl(url)))
    .slice(0, IMAGE_MIRROR_BATCH);

  for (const product of mirrorCandidates) {
    const sourceImages = (product.source_images?.length ? product.source_images : product.images).filter(Boolean);
    if (!sourceImages.length) continue;

    const sourceHash = hashContent(stableJson([...sourceImages].sort()));
    if (product.image_fingerprint === sourceHash && product.images.every(isBlobCdnUrl)) {
      continue;
    }

    const result = await mirrorImageList(sourceImages, product.image_cache || []);
    if (!result.images.length) continue;

    const index = nextProducts.findIndex((p) => p.id === product.id);
    if (index === -1) continue;

    nextProducts[index] = {
      ...nextProducts[index],
      source_images: sourceImages,
      image_cache: result.cache,
      images: result.images,
      image_url: result.images[0] || nextProducts[index].image_url,
      image_fingerprint: sourceHash,
      content_hash: productContentHash({
        ...nextProducts[index],
        images: result.images,
        image_url: result.images[0] || nextProducts[index].image_url,
      }),
    };

    mirrored++;
    imageDownloads += result.downloaded;
    catalogChanged = true;
  }

  const wrote = await writeAllProducts(nextProducts);
  const changed = catalogChanged || wrote;

  return {
    ok: true,
    updated,
    skipped,
    failed,
    mirrored,
    imageDownloads,
    total: products.length,
    changed,
    synced_at: new Date().toISOString(),
  };
}