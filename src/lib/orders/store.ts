import "server-only";

import { hashContent, readBlobJson, stableJson, writeBlobJsonIfChanged } from "@/lib/cms/blob-client";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { Order } from "@/types/order";

const ORDERS_BLOB = "cms/orders.json";
const ordersPath = path.join(process.cwd(), "src/data/orders.json");

let localHash = "";

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readOrdersLocal(): Promise<Order[]> {
  try {
    const raw = await readFile(ordersPath, "utf-8");
    localHash = hashContent(raw);
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeOrdersLocal(orders: Order[]): Promise<boolean> {
  const content = stableJson(orders);
  const contentHash = hashContent(content);
  if (localHash === contentHash) return false;
  await writeFile(ordersPath, JSON.stringify(orders, null, 2), "utf-8");
  localHash = contentHash;
  return true;
}

async function readOrders(): Promise<Order[]> {
  if (useBlob()) {
    const blob = await readBlobJson<Order[]>(ORDERS_BLOB);
    if (blob.data) return blob.data;
  }
  return readOrdersLocal();
}

async function writeOrders(orders: Order[]): Promise<boolean> {
  if (useBlob()) {
    return writeBlobJsonIfChanged(ORDERS_BLOB, orders, { cacheControlMaxAge: 300 });
  }
  return writeOrdersLocal(orders);
}

export async function appendOrder(order: Order): Promise<void> {
  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);
}

export async function getAllOrders(): Promise<Order[]> {
  return readOrders();
}

export async function deleteOrder(id: string): Promise<boolean> {
  const orders = await readOrders();
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return false;
  orders.splice(index, 1);
  await writeOrders(orders);
  return true;
}