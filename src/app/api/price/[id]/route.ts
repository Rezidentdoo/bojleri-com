import { NextResponse } from "next/server";
import { getProductById } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return NextResponse.json({ error: "Proizvod nije pronađen" }, { status: 404 });
  }

  return NextResponse.json({
    price: product.price,
    price_formatted: product.price_formatted,
    original_price: product.original_price ?? null,
    original_price_formatted: product.original_price_formatted ?? null,
    on_sale: product.on_sale ?? false,
    availability: product.availability,
    updated_at: product.price_updated_at || product.scraped_at,
    source: "cms",
  });
}