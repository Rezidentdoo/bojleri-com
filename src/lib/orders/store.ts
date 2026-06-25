import "server-only";

import { get, head, put } from "@vercel/blob";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { Order } from "@/types/order";

const ORDERS_BLOB = "cms/orders.json";
const ordersPath = path.join(process.cwd(), "src/data/orders.json");

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readOrders(): Promise<Order[]> {
  if (useBlob()) {
    try {
      const result = await get(ORDERS_BLOB, {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (result?.statusCode === 200 && result.stream) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as Order[];
      }
    } catch {}
  }
  try {
    const raw = await readFile(ordersPath, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeOrders(orders: Order[]): Promise<void> {
  const data = JSON.stringify(orders, null, 2);
  if (useBlob()) {
    await put(ORDERS_BLOB, data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return;
  }
  await writeFile(ordersPath, data, "utf-8");
}

export async function appendOrder(order: Order): Promise<void> {
  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);
}

export async function getAllOrders(): Promise<Order[]> {
  return readOrders();
}