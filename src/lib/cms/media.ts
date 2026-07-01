import "server-only";

import { hashContent, writeBlobBinaryIfMissing } from "@/lib/cms/blob-client";
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
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}

export function normalizeUploadProductId(productId: string | null | undefined): string {
  const trimmed = productId?.trim();
  if (trimmed) return slugifyProductId(trimmed);
  return `temp-${Date.now()}`;
}

export async function uploadProductImage(
  file: File,
  productId: string,
): Promise<{ url: string; path: string; deduplicated: boolean }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Dozvoljeni formati: JPG, PNG, WebP, GIF");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Slika je prevelika (maksimum 5 MB)");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = hashContent(bytes);
  const ext = extensionForMime(file.type);

  if (useBlob()) {
    const contentPath = `cms/media/${sha256}${ext}`;
    const { url, wrote } = await writeBlobBinaryIfMissing(contentPath, bytes, file.type);
    return { url, path: contentPath, deduplicated: !wrote };
  }

  const folderId = normalizeUploadProductId(productId);
  const filename = `${sha256.slice(0, 16)}${ext}`;
  const uploadDir = path.join(process.cwd(), "public/uploads/products", folderId);
  await mkdir(uploadDir, { recursive: true });
  const diskPath = path.join(uploadDir, filename);
  await writeFile(diskPath, bytes);

  return {
    url: `/uploads/products/${folderId}/${filename}`,
    path: `cms/product-images/${folderId}/${filename}`,
    deduplicated: false,
  };
}