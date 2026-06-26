import "server-only";

import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { slugifyProductId } from "@/lib/cms/product-admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

function useBlob(): boolean {
  return Boolean(blobToken());
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function safeFilename(originalName: string, mime: string): string {
  const ext = extensionForMime(mime);
  const base =
    originalName
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "dj")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "slika";

  return `${base}-${Date.now()}.${ext}`;
}

export function normalizeUploadProductId(productId: string | null | undefined): string {
  const trimmed = productId?.trim();
  if (trimmed) return slugifyProductId(trimmed);
  return `temp-${Date.now()}`;
}

export async function uploadProductImage(
  file: File,
  productId: string
): Promise<{ url: string; path: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Dozvoljeni formati: JPG, PNG, WebP, GIF");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Slika je prevelika (maksimum 5 MB)");
  }

  const folderId = normalizeUploadProductId(productId);
  const filename = safeFilename(file.name, file.type);
  const storagePath = `cms/product-images/${folderId}/${filename}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (useBlob()) {
    const blob = await put(storagePath, bytes, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.type,
      cacheControlMaxAge: 31536000,
      token: blobToken(),
    });

    return { url: blob.url, path: storagePath };
  }

  const uploadDir = path.join(process.cwd(), "public/uploads/products", folderId);
  await mkdir(uploadDir, { recursive: true });
  const diskPath = path.join(uploadDir, filename);
  await writeFile(diskPath, bytes);

  return {
    url: `/uploads/products/${folderId}/${filename}`,
    path: storagePath,
  };
}