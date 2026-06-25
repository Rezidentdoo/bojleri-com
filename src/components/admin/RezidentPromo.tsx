import Link from "next/link";

const REZIDENT_URL = "https://www.rezident.rs";

export default function RezidentPromo() {
  return (
    <div className="admin-card overflow-hidden border-[#ff9900]/30">
      <div className="bg-gradient-to-r from-[#131921] to-[#232f3e] px-6 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#ff9900]">
          Partner za digitalna rešenja
        </p>
        <h2 className="mt-1 text-xl font-bold">Rezident</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#ccc]">
          Ovaj e-shop je dizajniran, razvijen i hostovan od strane tima Rezident — web
          development, e-commerce i održavanje sajtova u Srbiji.
        </p>
        <Link
          href={REZIDENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn admin-btn-primary mt-4 inline-flex"
        >
          Posetite www.rezident.rs ↗
        </Link>
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-500">
        Potrebna vam je izrada ili održavanje sajta?{" "}
        <Link href={REZIDENT_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-[#131921] hover:text-[#ff9900]">
          Kontaktirajte Rezident
        </Link>
      </div>
    </div>
  );
}

export function RezidentAdminFooter() {
  return (
    <footer className="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
      CMS platforma · Powered by{" "}
      <Link
        href={REZIDENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[#131921] hover:text-[#ff9900]"
      >
        Rezident
      </Link>
      {" · "}
      <Link
        href={REZIDENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[#ff9900] hover:underline"
      >
        www.rezident.rs
      </Link>
    </footer>
  );
}