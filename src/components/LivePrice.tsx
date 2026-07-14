"use client";

import { useEffect, useState } from "react";
import PriceDisplay from "@/components/PriceDisplay";

interface PriceData {
  price: number;
  price_formatted: string;
  original_price?: number | null;
  original_price_formatted?: string | null;
  on_sale?: boolean;
  availability: string;
  updated_at: string;
}

export default function LivePrice({
  productId,
  fallbackPrice,
  fallbackFormatted,
  fallbackOriginalPrice,
  fallbackOriginalFormatted,
  fallbackOnSale,
  fallbackAvailability,
  className = "",
}: {
  productId: string;
  fallbackPrice: number;
  fallbackFormatted: string;
  fallbackOriginalPrice?: number | null;
  fallbackOriginalFormatted?: string | null;
  fallbackOnSale?: boolean;
  fallbackAvailability: string;
  className?: string;
}) {
  const [data, setData] = useState<PriceData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/price/${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [productId]);

  const price = data?.price ?? fallbackPrice;
  const formatted = data?.price_formatted ?? fallbackFormatted;
  const originalPrice = data?.original_price ?? fallbackOriginalPrice;
  const originalFormatted = data?.original_price_formatted ?? fallbackOriginalFormatted;
  const onSale = data?.on_sale ?? fallbackOnSale;
  const availability = data?.availability ?? fallbackAvailability;

  return (
    <div className={className}>
      <PriceDisplay
        price={price}
        priceFormatted={formatted}
        originalPrice={originalPrice}
        originalPriceFormatted={originalFormatted}
        onSale={onSale}
        size="lg"
      />

      <p className={`mt-2 text-sm font-medium ${
        availability === "Na lageru" ? "text-green-600" : "text-amber-600"
      }`}>
        {availability}
      </p>
    </div>
  );
}