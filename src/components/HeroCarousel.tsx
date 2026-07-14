"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import type { HeroSlide } from "@/types/site-settings";

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <section className="relative bg-[#eaeded]">
      <div className="relative mx-auto h-[280px] max-w-[1500px] overflow-hidden sm:h-[360px] lg:h-[420px]">
        {slides.map((slide, i) => (
          <div
            key={`${slide.title}-${i}`}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ProductImage
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover object-center"
              priority={i === 0}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#131921]/80 via-[#131921]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#eaeded] via-transparent to-transparent" />

            <div className="relative flex h-full items-center px-6 sm:px-10 lg:px-16">
              <div className="max-w-lg">
                <p className="text-sm font-semibold uppercase tracking-wider text-[#ff9900]">
                  Izdvojena ponuda
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="mt-3 text-sm text-white/90 sm:text-lg">{slide.subtitle}</p>
                <Link
                  href={slide.link}
                  className="mt-6 inline-block rounded-sm bg-[#ff9900] px-6 py-2.5 text-sm font-bold text-[#131921] shadow hover:bg-[#e88b00]"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}

        {slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slajd ${i + 1}`}
                onClick={() => setActive(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === active ? "w-8 bg-[#ff9900]" : "w-2.5 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}