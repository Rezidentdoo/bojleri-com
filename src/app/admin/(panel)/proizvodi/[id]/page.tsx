"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Product } from "@/types/product";

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data) => setProduct(data))
      .catch(() => setMessage("Greška pri učitavanju"));
  }, [id]);

  const save = async () => {
    if (!product) return;
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });

    setSaving(false);

    if (!res.ok) {
      setMessage("Greška pri čuvanju");
      return;
    }

    const updated = await res.json();
    setProduct(updated);
    setMessage("Sačuvano!");
    router.refresh();
  };

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

      <div className="admin-card mt-6 space-y-5 p-6">
        <div>
          <label className="admin-label">Naziv</label>
          <input
            className="admin-input"
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-label">Brend</label>
            <input
              className="admin-input"
              value={product.brand}
              onChange={(e) => setProduct({ ...product, brand: e.target.value })}
            />
          </div>
          <div>
            <label className="admin-label">Kategorija</label>
            <input
              className="admin-input"
              value={product.category}
              onChange={(e) => setProduct({ ...product, category: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-label">Cena (RSD)</label>
            <input
              type="number"
              className="admin-input"
              value={product.price}
              onChange={(e) =>
                setProduct({ ...product, price: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <label className="admin-label">Dostupnost</label>
            <select
              className="admin-input"
              value={product.availability}
              onChange={(e) => setProduct({ ...product, availability: e.target.value })}
            >
              <option value="Na lageru">Na lageru</option>
              <option value="Nije na lageru">Nije na lageru</option>
              <option value="Pozovite za cenu">Pozovite za cenu</option>
            </select>
          </div>
        </div>

        <div>
          <label className="admin-label">Opis</label>
          <textarea
            className="admin-input min-h-32"
            value={product.description}
            onChange={(e) => setProduct({ ...product, description: e.target.value })}
          />
        </div>

        <div>
          <label className="admin-label">URL slike</label>
          <input
            className="admin-input"
            value={product.image_url}
            onChange={(e) => setProduct({ ...product, image_url: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(product.hidden)}
              onChange={(e) => setProduct({ ...product, hidden: e.target.checked })}
            />
            Sakrij sa sajta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(product.featured)}
              onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
            />
            Izdvojeni proizvod
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="admin-btn admin-btn-primary disabled:opacity-60"
          >
            {saving ? "Čuvanje..." : "Sačuvaj izmene"}
          </button>
          <Link
            href={`/proizvod/${product.id}`}
            target="_blank"
            className="admin-btn admin-btn-secondary"
          >
            Pogledaj na sajtu ↗
          </Link>
          {message && <span className="text-sm text-green-700">{message}</span>}
        </div>
      </div>
    </div>
  );
}