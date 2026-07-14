"use client";

import { useState } from "react";
import ProductImage from "@/components/ProductImage";

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const gallery = [...new Set(images.filter(Boolean))].slice(0, 3);
  const [active, setActive] = useState(0);

  if (!gallery.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        Nema slike
      </div>
    );
  }

  const showThumbs = gallery.length > 1;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ProductImage
          src={gallery[active]}
          alt={`${name} - slika ${active + 1}`}
          fill
          className="object-contain p-6 transition-opacity duration-300"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {showThumbs && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {active + 1} / {gallery.length}
          </span>
        )}
      </div>

      {showThumbs && (
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Prikaži sliku ${i + 1}`}
              className={`aspect-square overflow-hidden rounded-lg border-2 bg-white p-1 transition ${
                active === i
                  ? "border-[#ff9900] ring-2 ring-[#ff9900]/30"
                  : "border-[#d5d9d9] hover:border-[#ff9900]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}