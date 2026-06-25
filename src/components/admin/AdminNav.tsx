"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Pregled" },
  { href: "/admin/porudzbine", label: "Porudžbine" },
  { href: "/admin/proizvodi", label: "Proizvodi" },
  { href: "/admin/sajt", label: "Sadržaj sajta" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="border-b border-gray-200 bg-[#131921] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-bold">
            <span className="text-[#ff9900]">CMS</span> bojleri.com
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-3 py-1.5 text-sm ${
                    active ? "bg-[#232f3e] font-semibold" : "hover:bg-[#232f3e]/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" target="_blank" className="text-sm text-[#ccc] hover:text-white">
            Otvori sajt ↗
          </Link>
          <button type="button" onClick={logout} className="text-sm text-[#ccc] hover:text-white">
            Odjava
          </button>
        </div>
      </div>
    </header>
  );
}