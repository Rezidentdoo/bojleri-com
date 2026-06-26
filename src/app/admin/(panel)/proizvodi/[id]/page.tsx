"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProductForm from "@/components/admin/ProductForm";
import type { Product } from "@/types/product";

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => setProduct(data))
      .catch(() => setError("Greška pri učitavanju proizvoda"));
  }, [id]);

  const save = async (draft: Product) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (!res.ok) return false;

    const updated = await res.json();
    setProduct(updated);
    router.refresh();
    return true;
  };

  const remove = async () => {
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
    router.push("/admin/proizvodi");
    router.refresh();
    return true;
  };

  if (error) {
    return <p className="text-red-700">{error}</p>;
  }

  if (!product) {
    return <p className="text-gray-600">Učitavanje proizvoda...</p>;
  }

  return (
    <div>
      <Link href="/admin/proizvodi" className="text-sm text-[#007185] hover:underline">
        ← Nazad na listu
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-[#131921]">Uredi proizvod</h1>
      <p className="mt-1 text-sm text-gray-500">ID: {product.id}</p>

      <div className="mt-6">
        <ProductForm mode="edit" product={product} onSave={save} onDelete={remove} />
      </div>
    </div>
  );
}