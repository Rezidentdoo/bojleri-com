import "server-only";

import { hashContent } from "@/lib/disk-utils";
import { writeLocalMediaIfMissing } from "@/lib/cms/local-storage";
import {
  extensionFromUrl,
  fetchWithConditionals,
  type RemoteCacheHeaders,
} from "@/lib/conditional-fetch";

const SOURCE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; BojleriBot/1.0)",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  Referer: "https://www.aqualand.rs/",
};

export interface ImageMirrorCache {
  source_url: string;
  blob_url: string;
  sha256: string;
  etag?: string;
  last_modified?: string;
}

export function isLocalOrMirroredUrl(url: string): boolean {
  return url.startsWith("/uploads/");
}

export async function mirrorImageToCdn(
  sourceUrl: string,
  cache?: ImageMirrorCache,
): Promise<ImageMirrorCache | null> {
  if (isLocalOrMirroredUrl(sourceUrl)) {
    return {
      source_url: sourceUrl,
      blob_url: sourceUrl,
      sha256: cache?.sha256 || hashContent(sourceUrl),
      etag: cache?.etag,
      last_modified: cache?.last_modified,
    };
  }

  const remoteCache: RemoteCacheHeaders | undefined = cache
    ? { etag: cache.etag, last_modified: cache.last_modified }
    : undefined;

  if (cache?.sha256 && cache.blob_url && remoteCache) {
    const unchanged = await fetchWithConditionals(sourceUrl, {
      headers: SOURCE_HEADERS,
      remoteCache,
    });
    if (unchanged.unchanged) {
      return {
        source_url: sourceUrl,
        blob_url: cache.blob_url,
        sha256: cache.sha256,
        etag: unchanged.etag,
        last_modified: unchanged.lastModified,
      };
    }
  }

  const response = await fetch(sourceUrl, { headers: SOURCE_HEADERS });
  if (!response.ok) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = hashContent(bytes);
  const ext = extensionFromUrl(sourceUrl);
  const filename = `${sha256}${ext}`;
  const local = await writeLocalMediaIfMissing(filename, bytes);

  return {
    source_url: sourceUrl,
    blob_url: local.url,
    sha256,
    etag: response.headers.get("etag") || undefined,
    last_modified: response.headers.get("last-modified") || undefined,
  };
}

export async function mirrorImageList(
  sourceUrls: string[],
  previous: ImageMirrorCache[] = [],
): Promise<{ images: string[]; cache: ImageMirrorCache[]; downloaded: number }> {
  const bySource = new Map(previous.map((entry) => [entry.source_url, entry]));
  const cache: ImageMirrorCache[] = [];
  const images: string[] = [];
  let downloaded = 0;

  for (const sourceUrl of sourceUrls) {
    const prev = bySource.get(sourceUrl);
    const mirrored = await mirrorImageToCdn(sourceUrl, prev);
    if (!mirrored) continue;

    if (!prev || prev.sha256 !== mirrored.sha256) downloaded++;
    cache.push(mirrored);
    images.push(mirrored.blob_url);
  }

  return { images, cache, downloaded };
}

/** @deprecated use isLocalOrMirroredUrl */
export const isBlobCdnUrl = isLocalOrMirroredUrl;