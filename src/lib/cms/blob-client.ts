import "server-only";

import { createHash } from "crypto";
import { head, put } from "@vercel/blob";

type MemoryEntry = {
  etag: string;
  data: unknown;
  contentHash: string;
  expiresAt: number;
};

const memory = new Map<string, MemoryEntry>();
const MEMORY_TTL_MS = 120_000;

export function hashContent(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function stableJson(data: unknown): string {
  return JSON.stringify(data);
}

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export function getCachedContentHash(path: string): string | undefined {
  return memory.get(path)?.contentHash;
}

export async function readBlobJson<T>(
  blobPath: string,
): Promise<{ data: T | null; contentHash?: string; url?: string }> {
  const token = blobToken();
  if (!token) return { data: null };

  const cached = memory.get(blobPath);
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data as T, contentHash: cached.contentHash };
  }

  try {
    const meta = await head(blobPath, { token });
    const etag = meta.etag || `${meta.uploadedAt.getTime()}-${meta.size}`;

    if (cached?.etag === etag) {
      cached.expiresAt = Date.now() + MEMORY_TTL_MS;
      return { data: cached.data as T, contentHash: cached.contentHash, url: meta.url };
    }

    const version = encodeURIComponent(etag);
    const url = `${meta.url}${meta.url.includes("?") ? "&" : "?"}v=${version}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return { data: null };

    const text = await res.text();
    const data = JSON.parse(text) as T;
    const contentHash = hashContent(text);

    memory.set(blobPath, {
      etag,
      data,
      contentHash,
      expiresAt: Date.now() + MEMORY_TTL_MS,
    });

    return { data, contentHash, url: meta.url };
  } catch {
    return { data: null };
  }
}

export async function writeBlobJsonIfChanged<T>(
  blobPath: string,
  data: T,
  options: { cacheControlMaxAge?: number } = {},
): Promise<boolean> {
  const token = blobToken();
  if (!token) return false;

  const content = stableJson(data);
  const contentHash = hashContent(content);
  const cached = memory.get(blobPath);

  if (cached?.contentHash === contentHash) {
    return false;
  }

  await put(blobPath, content, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: options.cacheControlMaxAge ?? 300,
    token,
  });

  memory.set(blobPath, {
    etag: contentHash,
    data,
    contentHash,
    expiresAt: Date.now() + MEMORY_TTL_MS,
  });

  return true;
}

export async function readBlobBinary(path: string): Promise<{ url: string } | null> {
  const token = blobToken();
  if (!token) return null;

  try {
    const meta = await head(path, { token });
    return { url: meta.url };
  } catch {
    return null;
  }
}

export async function writeBlobBinaryIfMissing(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ url: string; wrote: boolean }> {
  const token = blobToken();
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN nije podešen");

  const existing = await readBlobBinary(path);
  if (existing) {
    return { url: existing.url, wrote: false };
  }

  const blob = await put(path, bytes, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType,
    cacheControlMaxAge: 31536000,
    token,
  });

  return { url: blob.url, wrote: true };
}