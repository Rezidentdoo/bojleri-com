import { NextResponse } from "next/server";
import { readAllProducts, writeAllProducts } from "@/lib/cms/store";
import { revalidateProducts } from "@/lib/cms/revalidate";
import { syncPriceFormatted } from "@/lib/product-utils";
import type { Product } from "@/types/product";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const products = await readAllProducts();
  const product = products.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ error: "Proizvod nije pronađen" }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const products = await readAllProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Proizvod nije pronađen" }, { status: 404 });
  }

  const current = products[index];
  const updated: Product = syncPriceFormatted({
    ...current,
    name: typeof body.name === "string" ? body.name : current.name,
    brand: typeof body.brand === "string" ? body.brand : current.brand,
    category: typeof body.category === "string" ? body.category : current.category,
    price: typeof body.price === "number" ? body.price : current.price,
    availability: typeof body.availability === "string" ? body.availability : current.availability,
    description: typeof body.description === "string" ? body.description : current.description,
    hidden: typeof body.hidden === "boolean" ? body.hidden : current.hidden,
    featured: typeof body.featured === "boolean" ? body.featured : current.featured,
    image_url: typeof body.image_url === "string" ? body.image_url : current.image_url,
  });

  products[index] = updated;
  await writeAllProducts(products);
  revalidateProducts();

  return NextResponse.json(updated);
}