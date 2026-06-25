import { NextResponse } from "next/server";
import { readAllProducts } from "@/lib/cms/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));

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