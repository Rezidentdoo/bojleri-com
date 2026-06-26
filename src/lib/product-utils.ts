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
  const onSale = Boolean(product.on_sale);
  const originalPrice =
    onSale && typeof product.original_price === "number" && product.original_price > 0
      ? product.original_price
      : null;

  const images = Array.isArray(product.images)
    ? product.images.filter((url) => typeof url === "string" && url.trim())
    : [];
  const imageUrl = product.image_url?.trim() || images[0] || "";

  return {
    ...product,
    price_formatted: formatRsd(product.price),
    on_sale: onSale,
    original_price: originalPrice,
    original_price_formatted: originalPrice ? formatRsd(originalPrice) : null,
    images,
    image_url: imageUrl,
    specifications:
      product.specifications && typeof product.specifications === "object"
        ? product.specifications
        : {},
    capacity_liters:
      typeof product.capacity_liters === "number" ? product.capacity_liters : null,
  };
}