import { NextResponse } from "next/server";
import { readAllProducts, writeAllProducts } from "@/lib/cms/store";
import { revalidateProducts } from "@/lib/cms/revalidate";
import { syncPriceFormatted } from "@/lib/product-utils";
import { fetchLivePrice } from "@/lib/scraper";
import type { Product } from "@/types/product";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorize(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await readAllProducts();
  let updated = 0;
  let failed = 0;

  const nextProducts: Product[] = [];

  for (const product of products) {
    try {
      const live = await fetchLivePrice(product.url, { noCache: true });
      if (!live) {
        nextProducts.push(product);
        failed++;
        continue;
      }

      nextProducts.push(
        syncPriceFormatted({
          ...product,
          price: live.price,
          original_price: live.original_price ?? null,
          original_price_formatted: live.original_price_formatted ?? null,
          on_sale: live.on_sale ?? false,
          availability: live.availability,
          price_updated_at: live.updated_at,
        })
      );
      updated++;
      await new Promise((r) => setTimeout(r, 400));
    } catch {
      nextProducts.push(product);
      failed++;
    }
  }

  await writeAllProducts(nextProducts);
  revalidateProducts();

  return NextResponse.json({
    ok: true,
    message: `Katalog osvežen: ${updated}/${products.length}`,
    updated,
    failed,
    total: products.length,
    synced_at: new Date().toISOString(),
  });
}