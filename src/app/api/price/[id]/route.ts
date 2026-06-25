import { NextResponse } from "next/server";
import { getProductById } from "@/lib/products";
import { fetchLivePrice } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product?.url) {
    return NextResponse.json({ error: "Proizvod nije pronađen" }, { status: 404 });
  }

  try {
    const live = await fetchLivePrice(product.url);
    if (!live) {
      return NextResponse.json({
        price: product.price,
        price_formatted: product.price_formatted,
        availability: product.availability,
        updated_at: product.price_updated_at || product.scraped_at,
        source: "static",
      });
    }

    return NextResponse.json(
      { ...live, source: "live" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch {
    return NextResponse.json({
      price: product.price,
      price_formatted: product.price_formatted,
      availability: product.availability,
      updated_at: product.scraped_at,
      source: "fallback",
    });
  }
}