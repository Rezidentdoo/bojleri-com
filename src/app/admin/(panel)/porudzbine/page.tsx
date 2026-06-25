"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/types/order";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Učitavanje...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Porudžbine</h1>
      <p className="mt-1 text-sm text-gray-600">{orders.length} porudžbina</p>

      {orders.length === 0 ? (
        <p className="mt-8 text-gray-500">Još nema porudžbina.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.id}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleString("sr-RS")}
                  </p>
                </div>
                <p className="font-bold text-[#b12704]">{order.total_formatted}</p>
              </div>
              <p className="mt-3 text-sm">
                <strong>{order.customer.name}</strong> — {order.customer.phone} —{" "}
                <a href={`mailto:${order.customer.email}`} className="text-blue-600 hover:underline">
                  {order.customer.email}
                </a>
              </p>
              <p className="text-sm text-gray-600">
                {order.customer.address}, {order.customer.city}
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-700">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.id}`}>
                    {item.name} × {item.quantity} — {item.price_formatted}
                  </li>
                ))}
              </ul>
              {order.customer.note && (
                <p className="mt-2 text-sm italic text-gray-500">Napomena: {order.customer.note}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}