import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/product";
import { formatRsd } from "@/lib/product-utils";

export default function ProductCard({ product }: { product: Product }) {
  const inStock = product.availability === "Na lageru";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/proizvod/${product.id}`} className="relative aspect-square overflow-hidden bg-slate-50">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-4 transition group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">Nema slike</div>
        )}
        {!inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2 py-1 text-xs font-medium text-white">
            Proverite dostupnost
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#c7511f]">{product.brand}</p>
        <Link href={`/proizvod/${product.id}`}>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-[#0f1111] hover:text-[#c7511f]">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-xs text-slate-500">{product.category}</p>
        <div className="mt-auto flex items-end justify-between pt-4">
          <p className="text-lg font-bold text-slate-900">
            {product.price > 0 ? formatRsd(product.price) : product.price_formatted}
          </p>
          <Link
            href={`/proizvod/${product.id}`}
            className="rounded-sm bg-[#ffd814] px-3 py-1.5 text-xs font-bold text-[#0f1111] hover:bg-[#f7ca00]"
          >
            Detalji
          </Link>
        </div>
      </div>
    </article>
  );
}