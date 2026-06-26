import { NextResponse } from "next/server";
import { deleteOrder } from "@/lib/orders/store";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { numA, numB, answer } = body as {
    numA?: number;
    numB?: number;
    answer?: number;
  };

  if (
    typeof numA !== "number" ||
    typeof numB !== "number" ||
    typeof answer !== "number" ||
    !Number.isInteger(numA) ||
    !Number.isInteger(numB) ||
    !Number.isInteger(answer)
  ) {
    return NextResponse.json({ error: "Neispravna potvrda brisanja" }, { status: 400 });
  }

  if (numA + numB !== answer) {
    return NextResponse.json({ error: "Pogrešan odgovor — brisanje otkazano" }, { status: 400 });
  }

  const deleted = await deleteOrder(id);
  if (!deleted) {
    return NextResponse.json({ error: "Porudžbina nije pronađena" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}