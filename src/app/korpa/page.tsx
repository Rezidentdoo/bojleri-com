"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatRsd } from "@/lib/product-utils";

export default function KorpaPage() {
  const { items, removeItem, updateQuantity, total } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Korpa je prazna</h1>
        <p className="mt-4 text-slate-600">Dodajte proizvode iz kataloga.</p>
        <Link
          href="/katalog"
          className="mt-8 inline-block rounded-sm bg-[#ff9900] px-6 py-3 font-bold text-[#0f1111] hover:bg-[#e88b00]"
        >
          Idi u katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Korpa</h1>

      <div className="mt-8 space-y-4">
        {items.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50">
              {product.image_url && (
                <Image src={product.image_url} alt={product.name} fill className="object-contain p-1" />
              )}
            </div>
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/proizvod/${product.id}`} className="font-semibold text-[#0f1111] hover:text-[#c7511f]">
                  {product.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {product.price > 0 ? formatRsd(product.price) : product.price_formatted}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-3 sm:mt-0">
                <div className="flex items-center rounded-lg border">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="px-3 py-1 hover:bg-slate-100"
                  >
                    −
                  </button>
                  <span className="px-3 py-1 text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="px-3 py-1 hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(product.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Ukloni
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex justify-between text-lg font-bold">
          <span>Ukupno</span>
          <span>{total > 0 ? formatRsd(total) : "Pozovite za cenu"}</span>
        </div>
        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-sm bg-[#ff9900] py-3 text-center font-bold text-[#0f1111] hover:bg-[#e88b00]"
        >
          Nastavi na plaćanje
        </Link>
      </div>
    </div>
  );
}