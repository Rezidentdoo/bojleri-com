import "server-only";

import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const CMS_MEDIA_DIR = "cms-media";

export function localMediaPublicUrl(filename: string): string {
  return `/uploads/${CMS_MEDIA_DIR}/${filename}`;
}

export async function writeLocalMediaIfMissing(
  filename: string,
  bytes: Buffer,
): Promise<{ url: string; path: string; wrote: boolean }> {
  const uploadDir = path.join(process.cwd(), "public/uploads", CMS_MEDIA_DIR);
  await mkdir(uploadDir, { recursive: true });

  const diskPath = path.join(uploadDir, filename);
  const storagePath = `cms/media/${filename}`;

  if (existsSync(diskPath)) {
    return {
      url: localMediaPublicUrl(filename),
      path: storagePath,
      wrote: false,
    };
  }

  await writeFile(diskPath, bytes);
  return {
    url: localMediaPublicUrl(filename),
    path: storagePath,
    wrote: true,
  };
}