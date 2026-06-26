"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/types/product";

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/products?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setPages(data.pages ?? 1);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#131921]">Proizvodi</h1>
          <p className="mt-1 text-sm text-gray-600">{total} proizvoda ukupno</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Link href="/admin/proizvodi/novi" className="admin-btn admin-btn-primary">
            + Dodaj proizvod
          </Link>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraži po nazivu, brendu..."
            className="admin-input w-64"
          />
          <button type="submit" className="admin-btn admin-btn-secondary">
            Traži
          </button>
        </form>
        </div>
      </div>

      <div className="admin-card mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Brend</th>
              <th className="px-4 py-3 font-medium">Cena</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Učitavanje...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Nema rezultata
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </td>
                  <td className="px-4 py-3">{p.brand}</td>
                  <td className="px-4 py-3">{p.price_formatted}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.hidden && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Sakriveno
                        </span>
                      )}
                      {p.featured && (
                        <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                          Izdvojeno
                        </span>
                      )}
                      {p.on_sale && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          Akcija
                        </span>
                      )}
                      {!p.hidden && !p.featured && !p.on_sale && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          Aktivno
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/proizvodi/${p.id}`}
                      className="text-[#007185] hover:underline"
                    >
                      Uredi
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="admin-btn admin-btn-secondary disabled:opacity-50"
          >
            Prethodna
          </button>
          <span className="text-sm text-gray-600">
            Strana {page} od {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="admin-btn admin-btn-secondary disabled:opacity-50"
          >
            Sledeća
          </button>
        </div>
      )}
    </div>
  );
}