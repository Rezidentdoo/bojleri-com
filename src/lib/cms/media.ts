import "server-only";

import { hashContent } from "@/lib/disk-utils";
import { writeLocalMediaIfMissing } from "@/lib/cms/local-storage";
import { slugifyProductId } from "@/lib/cms/product-admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
  _productId: string,
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
  const sharedFilename = `${sha256}${ext}`;
  const shared = await writeLocalMediaIfMissing(sharedFilename, bytes);
  return { url: shared.url, path: shared.path, deduplicated: !shared.wrote };
}