import { NextResponse } from "next/server";
import { readSiteSettings, writeSiteSettings } from "@/lib/cms/store";
import { revalidateProducts } from "@/lib/cms/revalidate";
import type { SiteSettings } from "@/types/site-settings";

export async function GET() {
  const settings = await readSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const body = (await req.json()) as SiteSettings;
  await writeSiteSettings(body);
  revalidateProducts();
  return NextResponse.json({ ok: true });
}