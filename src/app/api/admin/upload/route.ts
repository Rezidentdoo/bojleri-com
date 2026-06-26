import { NextResponse } from "next/server";
import { uploadProductImage } from "@/lib/cms/media";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const productId = formData.get("productId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fajl nije prosleđen" }, { status: 400 });
    }

    const result = await uploadProductImage(
      file,
      typeof productId === "string" ? productId : ""
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Greška pri uploadu";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}