import "server-only";

import { hashContent, stableJson } from "@/lib/disk-utils";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { Order } from "@/types/order";

const ordersPath = path.join(process.cwd(), "src/data/orders.json");

let localHash = "";

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

export async function appendOrder(order: Order): Promise<void> {
  const orders = await readOrdersLocal();
  orders.unshift(order);
  await writeOrdersLocal(orders);
}

export async function getAllOrders(): Promise<Order[]> {
  return readOrdersLocal();
}

export async function deleteOrder(id: string): Promise<boolean> {
  const orders = await readOrdersLocal();
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return false;
  orders.splice(index, 1);
  await writeOrdersLocal(orders);
  return true;
}