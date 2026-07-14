import { NextResponse } from "next/server";
import { applyCatalogPriceUpload } from "@/lib/cms/catalog-excel";
import { writeAllProducts } from "@/lib/cms/store";
import { revalidateProducts } from "@/lib/cms/revalidate";
import { getAllProductsCached } from "@/lib/products";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Priložite Excel fajl (.xlsx)" }, { status: 400 });
    }

    const name = "name" in file ? String(file.name || "") : "";
    if (name && !/\.xlsx?$/i.test(name)) {
      return NextResponse.json({ error: "Podržan je samo .xlsx format" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const products = await getAllProductsCached();
    const { products: next, result } = applyCatalogPriceUpload(buffer, products);

    if (result.errors.length) {
      return NextResponse.json({ error: result.errors[0], result }, { status: 400 });
    }

    if (result.updated === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nijedna cena nije ažurirana. Proverite kolone i šifre (SKU).",
          result,
        },
        { status: 400 },
      );
    }

    await writeAllProducts(next);
    revalidateProducts();

    return NextResponse.json({
      ok: true,
      message: `Ažurirano ${result.updated} proizvoda.`,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Greška pri uploadu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}