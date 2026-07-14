import "server-only";

import { readBlobJson, writeBlobJsonIfChanged } from "@/lib/cms/blob-client";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { normalizeSiteSettings } from "@/lib/cms/guide-page";
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

async function readLocalJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeLocalJsonIfChanged<T>(filePath: string, data: T): Promise<boolean> {
  const next = JSON.stringify(data, null, 2);
  try {
    const current = await readFile(filePath, "utf-8");
    if (current === next) return false;
  } catch {
    // new file
  }
  await writeFile(filePath, next, "utf-8");
  return true;
}

export async function readAllProducts(): Promise<Product[]> {
  if (useBlob()) {
    const blob = await readBlobJson<Product[]>(PRODUCTS_BLOB);
    if (blob.data) return blob.data;
  }
  return readLocalJson<Product[]>(productsPath, productsSeed as unknown as Product[]);
}

export async function writeAllProducts(products: Product[]): Promise<boolean> {
  if (useBlob()) {
    return writeBlobJsonIfChanged(PRODUCTS_BLOB, products, { cacheControlMaxAge: 300 });
  }
  return writeLocalJsonIfChanged(productsPath, products);
}

export async function readSiteSettings(): Promise<SiteSettings> {
  if (useBlob()) {
    const blob = await readBlobJson<SiteSettings>(SETTINGS_BLOB);
    if (blob.data) return normalizeSiteSettings(blob.data);
  }
  return normalizeSiteSettings(
    await readLocalJson<SiteSettings>(settingsPath, siteSettingsSeed as SiteSettings),
  );
}

export async function writeSiteSettings(settings: SiteSettings): Promise<boolean> {
  if (useBlob()) {
    return writeBlobJsonIfChanged(SETTINGS_BLOB, settings, { cacheControlMaxAge: 300 });
  }
  return writeLocalJsonIfChanged(settingsPath, settings);
}

export async function seedBlobIfNeeded(): Promise<{ products: boolean; settings: boolean }> {
  if (!useBlob()) return { products: false, settings: false };

  const result = { products: false, settings: false };
  const existingProducts = await readBlobJson<Product[]>(PRODUCTS_BLOB);
  if (!existingProducts.data) {
    result.products = await writeBlobJsonIfChanged(PRODUCTS_BLOB, productsSeed as unknown as Product[], {
      cacheControlMaxAge: 300,
    });
  }

  const existingSettings = await readBlobJson<SiteSettings>(SETTINGS_BLOB);
  if (!existingSettings.data) {
    result.settings = await writeBlobJsonIfChanged(SETTINGS_BLOB, siteSettingsSeed as SiteSettings, {
      cacheControlMaxAge: 300,
    });
  }

  return result;
}