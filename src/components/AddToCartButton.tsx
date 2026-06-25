"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        addItem(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }}
      className="w-full rounded-sm bg-[#ff9900] px-6 py-3 text-sm font-bold text-[#0f1111] transition hover:bg-[#e88b00]"
    >
      {added ? "Dodato u korpu ✓" : "Dodaj u korpu"}
    </button>
  );
}