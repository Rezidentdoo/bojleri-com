"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
import {
  filterProducts,
  getBrandsFrom,
  getCategoriesFrom,
  getMaxPriceFrom,
} from "@/lib/product-utils";
import ProductGrid from "./ProductGrid";

export default function CatalogClient({ products }: { products: Product[] }) {
  const searchParams = useSearchParams();
  const categories = getCategoriesFrom(products);
  const brands = getBrandsFrom(products);
  const maxPrice = getMaxPriceFrom(products);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    const kat = searchParams.get("kategorija");
    if (q) setSearch(q);
    if (kat) setCategory(kat);
  }, [searchParams]);
  const [brand, setBrand] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState(maxPrice || 0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("name-asc");

  const filtered = useMemo(() => {
    let result = filterProducts(products, {
      search,
      category,
      brand,
      minPrice,
      maxPrice: maxPriceFilter,
      inStockOnly,
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return (a.price || 999999) - (b.price || 999999);
        case "price-desc":
          return (b.price || 0) - (a.price || 0);
        case "name-desc":
          return b.name.localeCompare(a.name, "sr");
        default:
          return a.name.localeCompare(b.name, "sr");
      }
    });
    return result;
  }, [search, category, brand, minPrice, maxPriceFilter, inStockOnly, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Katalog bojlera</h1>
        <p className="mt-2 text-slate-600">
          {filtered.length} proizvoda — filtrirajte po brendu, kategoriji i ceni
        </p>
      </div>

      <div className="mb-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          placeholder="Pretraži proizvode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-sm border border-[#d5d9d9] px-4 py-2.5 text-sm outline-none focus:border-[#ff9900]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        >
          <option value="">Sve kategorije</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        >
          <option value="">Svi brendovi</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        >
          <option value="name-asc">Naziv A-Z</option>
          <option value="name-desc">Naziv Z-A</option>
          <option value="price-asc">Cena rastuće</option>
          <option value="price-desc">Cena opadajuće</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="rounded"
          />
          Samo na lageru
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span>Cena:</span>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(Number(e.target.value))}
            className="w-24 rounded-lg border border-slate-300 px-2 py-1"
            placeholder="Od"
          />
          <span>—</span>
          <input
            type="number"
            value={maxPriceFilter}
            onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
            className="w-24 rounded-lg border border-slate-300 px-2 py-1"
            placeholder="Do"
          />
        </div>
      </div>

      <ProductGrid products={filtered} />
    </div>
  );
}