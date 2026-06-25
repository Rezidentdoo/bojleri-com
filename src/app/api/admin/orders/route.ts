import { NextResponse } from "next/server";
import { getAllOrders } from "@/lib/orders/store";

export async function GET() {
  const orders = await getAllOrders();
  return NextResponse.json({ orders, total: orders.length });
}