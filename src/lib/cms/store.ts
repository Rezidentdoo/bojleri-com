import "server-only";

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { normalizeSiteSettings } from "@/lib/cms/guide-page";
import productsSeed from "@/data/products.json";
import siteSettingsSeed from "@/data/site-settings.json";
import type { Product } from "@/types/product";
import type { SiteSettings } from "@/types/site-settings";

const productsPath = path.join(process.cwd(), "src/data/products.json");
const settingsPath = path.join(process.cwd(), "src/data/site-settings.json");

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
  return readLocalJson<Product[]>(productsPath, productsSeed as unknown as Product[]);
}

export async function writeAllProducts(products: Product[]): Promise<boolean> {
  return writeLocalJsonIfChanged(productsPath, products);
}

export async function readSiteSettings(): Promise<SiteSettings> {
  return normalizeSiteSettings(
    await readLocalJson<SiteSettings>(settingsPath, siteSettingsSeed as SiteSettings),
  );
}

export async function writeSiteSettings(settings: SiteSettings): Promise<boolean> {
  return writeLocalJsonIfChanged(settingsPath, settings);
}