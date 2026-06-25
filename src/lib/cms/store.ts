import "server-only";

import { head, put } from "@vercel/blob";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import productsSeed from "@/data/products.json";
import siteSettingsSeed from "@/data/site-settings.json";
import type { Product } from "@/types/product";
import type { SiteSettings } from "@/types/site-settings";

const PRODUCTS_BLOB = "cms/products.json";
const SETTINGS_BLOB = "cms/site-settings.json";

const productsPath = path.join(process.cwd(), "src/data/products.json");
const settingsPath = path.join(process.cwd(), "src/data/site-settings.json");

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBlobJson<T>(blobPath: string): Promise<T | null> {
  try {
    const meta = await head(blobPath);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function writeBlobJson<T>(blobPath: string, data: T): Promise<void> {
  await put(blobPath, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readLocalJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeLocalJson<T>(filePath: string, data: T): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readAllProducts(): Promise<Product[]> {
  if (useBlob()) {
    const blob = await readBlobJson<Product[]>(PRODUCTS_BLOB);
    if (blob) return blob;
  }
  return readLocalJson<Product[]>(productsPath, productsSeed as Product[]);
}

export async function writeAllProducts(products: Product[]): Promise<void> {
  if (useBlob()) {
    await writeBlobJson(PRODUCTS_BLOB, products);
    return;
  }
  await writeLocalJson(productsPath, products);
}

export async function readSiteSettings(): Promise<SiteSettings> {
  if (useBlob()) {
    const blob = await readBlobJson<SiteSettings>(SETTINGS_BLOB);
    if (blob) return blob;
  }
  return readLocalJson<SiteSettings>(settingsPath, siteSettingsSeed as SiteSettings);
}

export async function writeSiteSettings(settings: SiteSettings): Promise<void> {
  if (useBlob()) {
    await writeBlobJson(SETTINGS_BLOB, settings);
    return;
  }
  await writeLocalJson(settingsPath, settings);
}

export async function seedBlobIfNeeded(): Promise<{ products: boolean; settings: boolean }> {
  if (!useBlob()) return { products: false, settings: false };

  const result = { products: false, settings: false };
  const existingProducts = await readBlobJson<Product[]>(PRODUCTS_BLOB);
  if (!existingProducts) {
    await writeBlobJson(PRODUCTS_BLOB, productsSeed as Product[]);
    result.products = true;
  }

  const existingSettings = await readBlobJson<SiteSettings>(SETTINGS_BLOB);
  if (!existingSettings) {
    await writeBlobJson(SETTINGS_BLOB, siteSettingsSeed as SiteSettings);
    result.settings = true;
  }

  return result;
}