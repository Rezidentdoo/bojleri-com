"use client";

import { useEffect, useState } from "react";
import { formatRsd } from "@/lib/product-utils";

interface PriceData {
  price: number;
  price_formatted: string;
  availability: string;
  updated_at: string;
}

export default function LivePrice({
  productId,
  fallbackPrice,
  fallbackFormatted,
  fallbackAvailability,
  className = "",
}: {
  productId: string;
  fallbackPrice: number;
  fallbackFormatted: string;
  fallbackAvailability: string;
  className?: string;
}) {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/price/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [productId]);

  const price = data?.price ?? fallbackPrice;
  const formatted = data?.price_formatted ?? fallbackFormatted;
  const availability = data?.availability ?? fallbackAvailability;
  const updatedAt = data?.updated_at;

  return (
    <div className={className}>
      <p className="text-3xl font-bold text-slate-900">
        {price > 0 ? formatRsd(price) : formatted}
        {loading && (
          <span className="ml-2 text-sm font-normal text-slate-400">osvežavanje...</span>
        )}
      </p>
      <p className={`mt-2 text-sm font-medium ${
        availability === "Na lageru" ? "text-green-600" : "text-amber-600"
      }`}>
        {availability}
      </p>
      {updatedAt && (
        <p className="mt-1 text-xs text-slate-400">
          Cena osvežena: {new Date(updatedAt).toLocaleString("sr-RS")}
        </p>
      )}
    </div>
  );
}