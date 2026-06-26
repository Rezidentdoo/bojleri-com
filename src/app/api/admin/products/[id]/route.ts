import { NextResponse } from "next/server";
import { applyProductUpdate } from "@/lib/cms/product-admin";
import { readAllProducts, writeAllProducts } from "@/lib/cms/store";
import { revalidateProducts } from "@/lib/cms/revalidate";

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
  const updated = applyProductUpdate(current, body);
  updated.price_updated_at = new Date().toISOString();

  products[index] = updated;
  await writeAllProducts(products);
  revalidateProducts();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const products = await readAllProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Proizvod nije pronađen" }, { status: 404 });
  }

  products.splice(index, 1);
  await writeAllProducts(products);
  revalidateProducts();

  return NextResponse.json({ ok: true });
}