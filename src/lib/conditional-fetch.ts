export interface RemoteCacheHeaders {
  etag?: string;
  last_modified?: string;
}

export interface ConditionalFetchResult {
  status: number;
  body: string | null;
  etag?: string;
  lastModified?: string;
  unchanged: boolean;
}

export async function fetchWithConditionals(
  url: string,
  init: RequestInit & { remoteCache?: RemoteCacheHeaders } = {},
): Promise<ConditionalFetchResult> {
  const { remoteCache, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers);
  if (remoteCache?.etag) headers.set("If-None-Match", remoteCache.etag);
  if (remoteCache?.last_modified) headers.set("If-Modified-Since", remoteCache.last_modified);

  const res = await fetch(url, { ...fetchInit, headers });

  if (res.status === 304) {
    return {
      status: 304,
      body: null,
      etag: remoteCache?.etag,
      lastModified: remoteCache?.last_modified,
      unchanged: true,
    };
  }

  if (!res.ok) {
    return { status: res.status, body: null, unchanged: false };
  }

  return {
    status: res.status,
    body: await res.text(),
    etag: res.headers.get("etag") || remoteCache?.etag || undefined,
    lastModified: res.headers.get("last-modified") || remoteCache?.last_modified || undefined,
    unchanged: false,
  };
}

export function extensionFromUrl(url: string): string {
  const match = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (!match) return ".jpg";
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? ".jpg" : `.${ext}`;
}

export function mimeFromExtension(ext: string): string {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}