import { NextResponse } from "next/server";
import { appendOrder } from "@/lib/orders/store";
import { sendOrderEmails } from "@/lib/orders/email";
import type { CreateOrderPayload, Order } from "@/types/order";

function formatRsd(price: number): string {
  if (price <= 0) return "Pozovite za cenu";
  return `${Math.round(price).toLocaleString("sr-RS")} RSD`;
}

function makeOrderId(): string {
  const n = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BOJ-${Date.now().toString().slice(-8)}-${n}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderPayload;

    if (!body.customer?.name?.trim() || !body.customer?.email?.trim() || !body.customer?.phone?.trim()) {
      return NextResponse.json({ error: "Nedostaju obavezni podaci" }, { status: 400 });
    }
    if (!body.items?.length) {
      return NextResponse.json({ error: "Korpa je prazna" }, { status: 400 });
    }

    const order: Order = {
      id: makeOrderId(),
      created_at: new Date().toISOString(),
      customer: {
        name: body.customer.name.trim(),
        email: body.customer.email.trim(),
        phone: body.customer.phone.trim(),
        address: body.customer.address?.trim() || "",
        city: body.customer.city?.trim() || "",
        note: body.customer.note?.trim() || "",
      },
      payment: body.payment || "pouzece",
      items: body.items,
      total: body.total,
      total_formatted: formatRsd(body.total),
    };

    await appendOrder(order);
    const emailResult = await sendOrderEmails(order);
    const emailSent = emailResult.customer || emailResult.shop;

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      emailSent,
      emailToCustomer: emailResult.customer,
      emailToShop: emailResult.shop,
    });
  } catch (e) {
    console.error("Order error:", e);
    return NextResponse.json({ error: "Greška pri slanju porudžbine" }, { status: 500 });
  }
}