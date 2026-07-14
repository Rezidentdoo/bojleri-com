import { NextResponse } from "next/server";
import { revalidateIfChanged } from "@/lib/cms/revalidate";
import { syncCatalogPrices } from "@/lib/catalog-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorize(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncCatalogPrices();
  revalidateIfChanged(result.changed);

  return NextResponse.json({
    ok: result.ok,
    message: result.message
      ?? `Katalog: ${result.updated} ažurirano, ${result.specsUpdated} specifikacija, ${result.mirrored} slika`,
    disabled: result.disabled ?? false,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed,
    mirrored: result.mirrored,
    specs_updated: result.specsUpdated,
    image_downloads: result.imageDownloads,
    total: result.total,
    changed: result.changed,
    synced_at: result.synced_at,
  });
}