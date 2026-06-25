import type { Product, FilterState } from "@/types/product";

export function getCategoriesFrom(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.category))].sort();
}

export function getBrandsFrom(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.brand))].sort();
}

export function getMaxPriceFrom(products: Product[]): number {
  return Math.max(...products.map((p) => p.price), 0);
}

export function filterProducts(products: Product[], filters: FilterState): Product[] {
  return products.filter((p) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${p.name} ${p.brand} ${p.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.category && p.category !== filters.category) return false;
    if (filters.brand && p.brand !== filters.brand) return false;
    if (p.price > 0) {
      if (filters.minPrice > 0 && p.price < filters.minPrice) return false;
      if (filters.maxPrice > 0 && p.price > filters.maxPrice) return false;
    }
    if (filters.inStockOnly && p.availability !== "Na lageru") return false;
    return true;
  });
}

export function formatRsd(price: number): string {
  if (price <= 0) return "Pozovite za cenu";
  return `${Math.round(price).toLocaleString("sr-RS")} RSD`;
}

export function syncPriceFormatted(product: Product): Product {
  return {
    ...product,
    price_formatted: formatRsd(product.price),
  };
}