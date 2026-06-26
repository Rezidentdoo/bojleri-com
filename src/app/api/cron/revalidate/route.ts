import { NextResponse } from "next/server";
import { revalidateProducts } from "@/lib/cms/revalidate";

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateProducts();

  return NextResponse.json({
    ok: true,
    revalidated_at: new Date().toISOString(),
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}