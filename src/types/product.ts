export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  price_formatted: string;
  original_price?: number | null;
  original_price_formatted?: string | null;
  on_sale?: boolean;
  availability: string;
  url: string;
  description: string;
  sku: string;
  capacity_liters: number | null;
  specifications: Record<string, string>;
  images: string[];
  image_url: string;
  scraped_at: string;
  price_updated_at?: string;
  hidden?: boolean;
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface FilterState {
  search: string;
  category: string;
  brand: string;
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
}