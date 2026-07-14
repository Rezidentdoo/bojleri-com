import { NextResponse } from "next/server";
import { PRICE_SYNC_DISABLED_MESSAGE, isAutoPriceSyncEnabled } from "@/lib/cms/price-sync-config";
import { getAllProductsCached } from "@/lib/products";
import { fetchLivePrice } from "@/lib/scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAutoPriceSyncEnabled()) {
    return NextResponse.json({
      ok: true,
      disabled: true,
      message: PRICE_SYNC_DISABLED_MESSAGE,
      updated_at: new Date().toISOString(),
    });
  }

  const products = await getAllProductsCached();
  const results: { id: string; name: string; price: number; ok: boolean }[] = [];

  for (const product of products) {
    try {
      const live = await fetchLivePrice(product.url);
      results.push({
        id: product.id,
        name: product.name,
        price: live?.price ?? product.price,
        ok: !!live,
      });
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      results.push({ id: product.id, name: product.name, price: product.price, ok: false });
    }
  }

  const updated = results.filter((r) => r.ok).length;

  return NextResponse.json({
    message: `Osveženo ${updated}/${products.length} cena`,
    updated_at: new Date().toISOString(),
    results: results.slice(0, 10),
    total: products.length,
  });
}