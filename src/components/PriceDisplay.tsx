import { formatRsd } from "@/lib/product-utils";

export default function PriceDisplay({
  price,
  priceFormatted,
  originalPrice,
  originalPriceFormatted,
  onSale,
  size = "md",
}: {
  price: number;
  priceFormatted: string;
  originalPrice?: number | null;
  originalPriceFormatted?: string | null;
  onSale?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const showSale = onSale && originalPrice && originalPrice > price;
  const currentText = price > 0 ? formatRsd(price) : priceFormatted;
  const originalText =
    originalPriceFormatted ||
    (originalPrice && originalPrice > 0 ? formatRsd(originalPrice) : null);

  const currentClass =
    size === "lg"
      ? "text-3xl font-bold"
      : size === "sm"
        ? "text-lg font-bold"
        : "text-xl font-bold";

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`${currentClass} ${showSale ? "text-[#b12704]" : "text-slate-900"}`}>
        {currentText}
      </span>
      {showSale && originalText && (
        <span className="text-sm text-slate-400 line-through">{originalText}</span>
      )}
      {showSale && (
        <span className="rounded-sm bg-[#cc0c39] px-2 py-0.5 text-xs font-bold uppercase text-white">
          Akcija
        </span>
      )}
    </div>
  );
}