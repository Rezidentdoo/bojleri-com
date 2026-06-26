import { NextResponse } from "next/server";
import { createManualProduct } from "@/lib/cms/product-admin";
import { readAllProducts, writeAllProducts } from "@/lib/cms/store";
import { revalidateProducts } from "@/lib/cms/revalidate";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? "20")));

  let products = await readAllProducts();

  if (q) {
    products = products.filter((p) => {
      const hay = `${p.name} ${p.brand} ${p.category} ${p.id}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const total = products.length;
  const start = (page - 1) * limit;
  const items = products.slice(start, start + limit);

  return NextResponse.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const products = await readAllProducts();
    const product = createManualProduct(body, products.map((p) => p.id));
    products.push(product);
    await writeAllProducts(products);
    revalidateProducts();
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Greška pri kreiranju";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}