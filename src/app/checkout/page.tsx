"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatRsd } from "@/lib/product-utils";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    payment: "pouzece",
    note: "",
  });

  if (!items.length && !submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Korpa je prazna</h1>
        <Link href="/katalog" className="mt-4 inline-block text-[#007185] hover:text-[#c7511f] hover:underline">
          Nazad u katalog
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
          <h1 className="text-2xl font-bold text-green-800">Porudžbina primljena!</h1>
          <p className="mt-4 text-green-700">
            Hvala {form.name}! Kontaktiraćemo vas uskoro na {form.phone} za potvrdu porudžbine.
          </p>
          <Link href="/katalog" className="mt-8 inline-block rounded-sm bg-[#ff9900] px-6 py-3 font-bold text-[#0f1111]">
            Nastavi kupovinu
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearCart();
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Plaćanje</h1>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-900">Podaci za dostavu</h2>
          {[
            ["name", "Ime i prezime", "text"],
            ["email", "Email", "email"],
            ["phone", "Telefon", "tel"],
            ["address", "Adresa", "text"],
            ["city", "Grad", "text"],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-700">{label}</label>
              <input
                type={type}
                required
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-sm border border-[#d5d9d9] px-4 py-2.5 text-sm outline-none focus:border-[#ff9900]"
              />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-slate-700">Napomena</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-sm border border-[#d5d9d9] px-4 py-2.5 text-sm outline-none focus:border-[#ff9900]"
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">Način plaćanja</h2>
          <div className="mt-4 space-y-3">
            {[
              ["pouzece", "Plaćanje pouzećem"],
              ["uplata", "Uplata na račun"],
              ["kartica", "Platna kartica (uskoro)"],
            ].map(([val, label]) => (
              <label key={val} className="flex cursor-pointer items-center gap-3 rounded-sm border border-[#d5d9d9] p-4 hover:border-[#ff9900]">
                <input
                  type="radio"
                  name="payment"
                  value={val}
                  checked={form.payment === val}
                  onChange={(e) => setForm({ ...form, payment: e.target.value })}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="font-semibold">Pregled porudžbine</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between">
                  <span>{product.name} × {quantity}</span>
                  <span>{product.price > 0 ? formatRsd(product.price * quantity) : "—"}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t pt-4 font-bold">
              <span>Ukupno</span>
              <span>{total > 0 ? formatRsd(total) : "Pozovite za cenu"}</span>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-sm bg-[#ff9900] py-3 font-bold text-[#0f1111] hover:bg-[#e88b00]"
          >
            Potvrdi porudžbinu
          </button>
        </div>
      </form>
    </div>
  );
}