import "server-only";

import * as XLSX from "xlsx";
import { syncPriceFormatted } from "@/lib/product-utils";
import type { Product } from "@/types/product";

export const CATALOG_EXCEL_HEADERS = ["sifra", "naziv", "akcijska_cena", "cena"] as const;

export type CatalogExcelRow = {
  sifra: string;
  naziv: string;
  akcijska_cena: number | "";
  cena: number | "";
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function parsePriceCell(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function productToCatalogRow(product: Product): CatalogExcelRow {
  const onSale =
    Boolean(product.on_sale) &&
    typeof product.original_price === "number" &&
    product.original_price > 0 &&
    product.price > 0 &&
    product.original_price > product.price;

  return {
    sifra: String(product.sku || "").trim(),
    naziv: product.name,
    cena: onSale ? product.original_price! : product.price > 0 ? product.price : "",
    akcijska_cena: onSale ? product.price : "",
  };
}

export function buildCatalogWorkbook(products: Product[]): Buffer {
  const rows = products.map((p) => {
    const row = productToCatalogRow(p);
    return {
      sifra: row.sifra,
      naziv: row.naziv,
      akcijska_cena: row.akcijska_cena === "" ? "" : row.akcijska_cena,
      cena: row.cena === "" ? "" : row.cena,
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...CATALOG_EXCEL_HEADERS] });
  sheet["!cols"] = [{ wch: 14 }, { wch: 48 }, { wch: 14 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Katalog");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function mapHeaderIndexes(headers: string[]): Partial<Record<(typeof CATALOG_EXCEL_HEADERS)[number], number>> {
  const map: Partial<Record<(typeof CATALOG_EXCEL_HEADERS)[number], number>> = {};
  const aliases: Record<string, (typeof CATALOG_EXCEL_HEADERS)[number]> = {
    sifra: "sifra",
    šifra: "sifra",
    sku: "sifra",
    naziv: "naziv",
    name: "naziv",
    akcijska_cena: "akcijska_cena",
    akcijska: "akcijska_cena",
    cena: "cena",
    price: "cena",
  };

  headers.forEach((header, index) => {
    const key = aliases[header];
    if (key && map[key] === undefined) map[key] = index;
  });

  return map;
}

export type CatalogPriceImportResult = {
  updated: number;
  skipped: number;
  notFound: string[];
  errors: string[];
};

export function applyCatalogPriceUpload(
  fileBuffer: Buffer,
  products: Product[],
): { products: Product[]; result: CatalogPriceImportResult } {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      products,
      result: { updated: 0, skipped: 0, notFound: [], errors: ["Excel fajl nema listova"] },
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
  if (!matrix.length) {
    return {
      products,
      result: { updated: 0, skipped: 0, notFound: [], errors: ["Excel fajl je prazan"] },
    };
  }

  const headerRow = (matrix[0] || []).map(normalizeHeader);
  const columns = mapHeaderIndexes(headerRow);

  if (columns.sifra === undefined) {
    return {
      products,
      result: {
        updated: 0,
        skipped: 0,
        notFound: [],
        errors: ["Nedostaje kolona 'sifra' (šifra / SKU)"],
      },
    };
  }
  if (columns.cena === undefined && columns.akcijska_cena === undefined) {
    return {
      products,
      result: {
        updated: 0,
        skipped: 0,
        notFound: [],
        errors: ["Nedostaje kolona 'cena' ili 'akcijska_cena'"],
      },
    };
  }

  const bySku = new Map<string, number>();
  for (let i = 0; i < products.length; i++) {
    const sku = String(products[i].sku || "").trim();
    if (sku) bySku.set(sku.toLowerCase(), i);
  }

  const next = [...products];
  const result: CatalogPriceImportResult = {
    updated: 0,
    skipped: 0,
    notFound: [],
    errors: [],
  };

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex] || [];
    const sku = String(row[columns.sifra!] ?? "").trim();
    if (!sku) {
      result.skipped++;
      continue;
    }

    const productIndex = bySku.get(sku.toLowerCase());
    if (productIndex === undefined) {
      result.notFound.push(sku);
      continue;
    }

    const cena =
      columns.cena !== undefined ? parsePriceCell(row[columns.cena]) : null;
    const akcijska =
      columns.akcijska_cena !== undefined
        ? parsePriceCell(row[columns.akcijska_cena])
        : null;

    if (cena === null && akcijska === null) {
      result.skipped++;
      continue;
    }

    const current = next[productIndex];
    let merged: Product;

    if (akcijska !== null && cena !== null && akcijska < cena) {
      merged = {
        ...current,
        on_sale: true,
        price: akcijska,
        original_price: cena,
      };
    } else if (akcijska !== null && (cena === null || akcijska >= cena)) {
      merged = {
        ...current,
        on_sale: false,
        price: akcijska,
        original_price: null,
      };
    } else if (cena !== null) {
      merged = {
        ...current,
        on_sale: false,
        price: cena,
        original_price: null,
      };
    } else {
      result.skipped++;
      continue;
    }

    next[productIndex] = syncPriceFormatted({
      ...merged,
      price_updated_at: new Date().toISOString(),
    });
    result.updated++;
  }

  return { products: next, result };
}