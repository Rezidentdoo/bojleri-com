import { syncPriceFormatted } from "@/lib/product-utils";
import type { Product } from "@/types/product";

export const PRODUCT_CATEGORIES = [
  "Vertikalni bojleri",
  "Horizontalni bojleri",
  "Protočni bojleri",
  "Bojleri za centralno grejanje",
  "Bojleri za kuhinju",
  "Prateći program",
];

export const PRODUCT_BRANDS = [
  "Electrolux",
  "Gorenje",
  "Ariston",
  "Metalac",
  "Bosch",
  "Termorad",
  "Končar",
  "Quadro",
  "Alfa Plam",
  "Tesy",
  "Thermex",
  "AEG",
  "Haier",
  "Clage",
  "Ostalo",
];

export function slugifyProductId(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "dj")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()
      .replace(/^-|-$/g, "") || "proizvod"
  );
}

export function uniqueProductId(base: string, existingIds: Iterable<string>): string {
  const ids = new Set(existingIds);
  let id = slugifyProductId(base);
  if (!ids.has(id)) return id;
  let n = 2;
  while (ids.has(`${id}-${n}`)) n++;
  return `${id}-${n}`;
}

export function specificationsToText(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([key, value]) => {
      const label = key.endsWith(":") ? key.slice(0, -1) : key;
      return `${label}: ${value}`;
    })
    .join("\n");
}

export function textToSpecifications(text: string): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx + 1).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) specs[key] = value;
  }
  return specs;
}

export function applyProductUpdate(current: Product, body: Record<string, unknown>): Product {
  const pickString = (key: keyof Product, fallback: string) =>
    typeof body[key] === "string" ? (body[key] as string) : fallback;

  const pickNumber = (key: keyof Product, fallback: number) =>
    typeof body[key] === "number" ? (body[key] as number) : fallback;

  const pickBool = (key: keyof Product, fallback: boolean | undefined) =>
    typeof body[key] === "boolean" ? (body[key] as boolean) : fallback;

  let images = current.images;
  if (Array.isArray(body.images)) {
    images = body.images.filter(
      (url): url is string => typeof url === "string" && url.trim() !== ""
    );
  }

  let specifications = current.specifications;
  if (
    body.specifications &&
    typeof body.specifications === "object" &&
    !Array.isArray(body.specifications)
  ) {
    specifications = body.specifications as Record<string, string>;
  }

  const capacity =
    body.capacity_liters === null
      ? null
      : typeof body.capacity_liters === "number"
        ? body.capacity_liters
        : current.capacity_liters;

  const originalPrice =
    body.original_price === null
      ? null
      : typeof body.original_price === "number"
        ? body.original_price
        : (current.original_price ?? null);

  const merged: Product = {
    ...current,
    name: pickString("name", current.name),
    brand: pickString("brand", current.brand),
    category: pickString("category", current.category),
    price: pickNumber("price", current.price),
    availability: pickString("availability", current.availability),
    description: pickString("description", current.description),
    url: pickString("url", current.url),
    sku: pickString("sku", current.sku),
    capacity_liters: capacity,
    images,
    image_url: pickString("image_url", current.image_url),
    hidden: pickBool("hidden", current.hidden) ?? false,
    featured: pickBool("featured", current.featured) ?? false,
    on_sale: pickBool("on_sale", current.on_sale),
    original_price: originalPrice,
    specifications,
  };

  return syncPriceFormatted(merged);
}

export function createManualProduct(
  body: Record<string, unknown>,
  existingIds: Iterable<string>
): Product {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    throw new Error("Naziv proizvoda je obavezan");
  }

  const requestedId = typeof body.id === "string" ? body.id.trim() : "";
  const ids = new Set(existingIds);
  const id = requestedId
    ? slugifyProductId(requestedId)
    : uniqueProductId(name, ids);

  if (ids.has(id)) {
    throw new Error("Proizvod sa ovim ID-om već postoji");
  }

  const now = new Date().toISOString();
  const base: Product = {
    id,
    name,
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
    scraped_at: now.slice(0, 10),
    price_updated_at: now,
    hidden: false,
    featured: false,
  };

  return applyProductUpdate(base, body);
}