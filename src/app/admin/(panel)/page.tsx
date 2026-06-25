import Link from "next/link";
import RezidentPromo from "@/components/admin/RezidentPromo";
import { getAllProductsCached } from "@/lib/products";
import { readSiteSettings } from "@/lib/cms/store";

export default async function AdminDashboardPage() {
  const [products, settings] = await Promise.all([
    getAllProductsCached(),
    readSiteSettings(),
  ]);

  const visible = products.filter((p) => !p.hidden).length;
  const hidden = products.length - visible;
  const featured = products.filter((p) => p.featured).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#131921]">Pregled</h1>
      <p className="mt-1 text-sm text-gray-600">Upravljanje sadržajem i proizvodima</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-card p-5">
          <p className="text-sm text-gray-500">Ukupno proizvoda</p>
          <p className="mt-1 text-3xl font-bold">{products.length}</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-sm text-gray-500">Vidljivo na sajtu</p>
          <p className="mt-1 text-3xl font-bold text-green-700">{visible}</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-sm text-gray-500">Sakriveno</p>
          <p className="mt-1 text-3xl font-bold text-amber-700">{hidden}</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-sm text-gray-500">Izdvojeno</p>
          <p className="mt-1 text-3xl font-bold text-[#ff9900]">{featured}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="admin-card p-6">
          <h2 className="font-semibold">Brze akcije</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/proizvodi" className="admin-btn admin-btn-primary">
              Uredi proizvode
            </Link>
            <Link href="/admin/sajt" className="admin-btn admin-btn-secondary">
              Uredi sadržaj sajta
            </Link>
            <Link href="/" target="_blank" className="admin-btn admin-btn-secondary">
              Pogledaj sajt ↗
            </Link>
          </div>
        </div>
        <div className="admin-card p-6">
          <h2 className="font-semibold">Sadržaj sajta</h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>Hero slajdova: {settings.heroSlides.length}</li>
            <li>Telefon: {settings.contact.phone}</li>
            <li>Email: {settings.contact.email}</li>
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <RezidentPromo />
      </div>
    </div>
  );
}