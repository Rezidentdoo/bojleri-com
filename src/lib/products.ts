import "server-only";

import { unstable_cache } from "next/cache";
import { readAllProducts } from "@/lib/cms/store";
import type { Product } from "@/types/product";

export {
  filterProducts,
  formatRsd,
  getBrandsFrom,
  getCategoriesFrom,
  getMaxPriceFrom,
  syncPriceFormatted,
} from "@/lib/product-utils";

async function loadProducts(): Promise<Product[]> {
  return readAllProducts();
}

export const getProducts = unstable_cache(
  async () => {
    const all = await loadProducts();
    return all.filter((p) => !p.hidden);
  },
  ["cms-products-visible"],
  { revalidate: 300, tags: ["products"] }
);

export const getAllProductsCached = unstable_cache(
  async () => loadProducts(),
  ["cms-products-all"],
  { revalidate: 300, tags: ["products"] }
);

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.id === id);
}

export async function getProductByIdAdmin(id: string): Promise<Product | undefined> {
  const products = await getAllProductsCached();
  return products.find((p) => p.id === id);
}