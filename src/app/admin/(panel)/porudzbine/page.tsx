"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order } from "@/types/order";

type MathChallenge = { a: number; b: number };

function newChallenge(): MathChallenge {
  return {
    a: Math.floor(Math.random() * 9) + 1,
    b: Math.floor(Math.random() * 9) + 1,
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [challenge, setChallenge] = useState<MathChallenge>({ a: 0, b: 0 });
  const [answer, setAnswer] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadOrders = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openDeleteModal = (order: Order) => {
    setDeleteTarget(order);
    setChallenge(newChallenge());
    setAnswer("");
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setAnswer("");
    setDeleteError("");
  };

  const parsedAnswer = Number.parseInt(answer, 10);
  const answerCorrect =
    answer.trim() !== "" &&
    Number.isInteger(parsedAnswer) &&
    parsedAnswer === challenge.a + challenge.b;

  const handleDelete = async () => {
    if (!deleteTarget || !answerCorrect) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numA: challenge.a,
          numB: challenge.b,
          answer: parsedAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri brisanju");

      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      setAnswer("");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Greška pri brisanju");
    } finally {
      setDeleting(false);
    }
  };

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
                <div className="flex items-center gap-3">
                  <p className="font-bold text-[#b12704]">{order.total_formatted}</p>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(order)}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Obriši
                  </button>
                </div>
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

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="admin-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-order-title"
          >
            <h2 id="delete-order-title" className="text-lg font-bold text-red-700">
              Obriši porudžbinu?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Trajno brišete porudžbinu <strong>{deleteTarget.id}</strong> (
              {deleteTarget.customer.name}). Ova radnja se ne može poništiti.
            </p>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-gray-800">
                Za potvrdu unesite zbir dva broja:
              </p>
              <p className="mt-2 text-2xl font-bold text-[#131921]">
                {challenge.a} + {challenge.b} = ?
              </p>
              <input
                type="number"
                inputMode="numeric"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="admin-input mt-3 max-w-[8rem]"
                placeholder="Odgovor"
                autoFocus
              />
            </div>

            {deleteError && (
              <p className="mt-3 text-sm text-red-600">{deleteError}</p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="admin-btn admin-btn-secondary disabled:opacity-60"
              >
                Otkaži
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!answerCorrect || deleting}
                className="admin-btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Brisanje..." : "Obriši porudžbinu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}