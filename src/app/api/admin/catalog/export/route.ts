import { NextResponse } from "next/server";
import { buildCatalogWorkbook } from "@/lib/cms/catalog-excel";
import { getAllProductsCached } from "@/lib/products";

export async function GET() {
  const products = await getAllProductsCached();
  const buffer = buildCatalogWorkbook(products);
  const filename = `bojleri-katalog-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}