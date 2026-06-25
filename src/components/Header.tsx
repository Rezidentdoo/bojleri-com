"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

const categories = [
  { label: "Vertikalni", href: "/katalog?kategorija=Vertikalni%20bojleri" },
  { label: "Horizontalni", href: "/katalog?kategorija=Horizontalni%20bojleri" },
  { label: "Protočni", href: "/katalog?kategorija=Proto%C4%8Dni%20bojleri" },
  { label: "Za kuhinju", href: "/katalog?kategorija=Bojleri%20za%20kuhinju" },
  { label: "Prateći program", href: "/katalog?kategorija=Prate%C4%87i%20program" },
];

export default function Header() {
  const { count } = useCart();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/katalog?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/katalog");
    }
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Main bar — Amazon dark */}
      <div className="bg-[#131921] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-1 pr-2 hover:outline hover:outline-1 hover:outline-white">
            <span className="text-3xl font-extrabold leading-none text-[#ff9900] sm:text-4xl">
              B
            </span>
            <span className="hidden text-sm font-bold leading-tight sm:block">
              bojleri<span className="text-[#ff9900]">.com</span>
            </span>
          </Link>

          {/* Dostava */}
          <div className="hidden max-w-[140px] shrink-0 lg:block">
            <p className="text-xs text-[#ccc]">Dostava</p>
            <p className="text-sm font-bold leading-tight">Cela Srbija, 24–48h</p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex flex-1 items-stretch">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraži bojlere, brendove, delove..."
              className="h-10 flex-1 rounded-l-md border-0 px-4 text-sm text-[#0f1111] outline-none"
            />
            <button
              type="submit"
              className="flex h-10 items-center justify-center rounded-r-md bg-[#ff9900] px-4 hover:bg-[#e88b00]"
              aria-label="Pretraži"
            >
              <svg className="h-5 w-5 text-[#131921]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Account */}
          <Link href="/kontakt" className="hidden shrink-0 px-2 hover:outline hover:outline-1 hover:outline-white sm:block">
            <p className="text-xs text-[#ccc]">Pomoć i</p>
            <p className="text-sm font-bold">Kontakt</p>
          </Link>

          {/* Cart */}
          <Link
            href="/korpa"
            className="relative flex shrink-0 items-end gap-1 px-2 hover:outline hover:outline-1 hover:outline-white"
          >
            <div className="relative">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff9900] text-xs font-bold text-[#131921]">
                  {count}
                </span>
              )}
            </div>
            <span className="hidden pb-1 text-sm font-bold sm:inline">Korpa</span>
          </Link>
        </div>
      </div>

      {/* Secondary nav */}
      <div className="bg-[#232f3e] text-sm text-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto px-3 py-2 sm:gap-4 sm:px-4">
          <Link
            href="/katalog"
            className="flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 font-bold hover:outline hover:outline-1 hover:outline-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Svi proizvodi
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="shrink-0 whitespace-nowrap px-2 py-1 hover:outline hover:outline-1 hover:outline-white"
            >
              {cat.label}
            </Link>
          ))}
          <Link href="/kako-izabrati" className="shrink-0 whitespace-nowrap px-2 py-1 hover:outline hover:outline-1 hover:outline-white">
            Kako izabrati
          </Link>
        </div>
      </div>
    </header>
  );
}