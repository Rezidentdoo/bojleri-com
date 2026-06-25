import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts } from "@/lib/products";
import CatalogClient from "@/components/CatalogClient";

export const metadata: Metadata = {
  title: "Katalog bojlera",
  description: "Kompletna ponuda bojlera sa filterima po brendu, kategoriji i ceni.",
};

export default async function KatalogPage() {
  const products = await getProducts();

  return (
    <Suspense fallback={<div className="p-8 text-center text-[#565959]">Učitavanje kataloga...</div>}>
      <CatalogClient products={products} />
    </Suspense>
  );
}