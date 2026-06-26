"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import type { Product } from "@/types/product";

const emptyProduct = (): Product => ({
  id: "",
  name: "",
  brand: "Ostalo",
  category: "Vertikalni bojleri",
  price: 0,
  price_formatted: "",
  original_price: null,
  original_price_formatted: null,
  on_sale: false,
  availability: "Na lageru",
  url: "",
  description: "",
  sku: "",
  capacity_liters: null,
  specifications: {},
  images: [],
  image_url: "",
  scraped_at: "",
  hidden: false,
  featured: false,
});

export default function AdminNewProductPage() {
  const router = useRouter();

  const save = async (product: Product) => {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });

    if (!res.ok) return false;

    const created = await res.json();
    router.push(`/admin/proizvodi/${created.id}`);
    router.refresh();
    return true;
  };

  return (
    <div>
      <Link href="/admin/proizvodi" className="text-sm text-[#007185] hover:underline">
        ← Nazad na listu
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-[#131921]">Novi proizvod</h1>
      <p className="mt-1 text-sm text-gray-500">
        Ručno dodajte proizvod koji nije na aqualand.rs — sve stavke možete podesiti.
      </p>

      <div className="mt-6">
        <ProductForm mode="create" product={emptyProduct()} onSave={save} />
      </div>
    </div>
  );
}