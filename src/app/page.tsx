import Link from "next/link";
import { getProducts } from "@/lib/products";
import { getSiteSettings } from "@/lib/cms/settings";
import ProductGrid from "@/components/ProductGrid";
import HeroCarousel from "@/components/HeroCarousel";

export default async function HomePage() {
  const [products, settings] = await Promise.all([getProducts(), getSiteSettings()]);

  const featuredIds = new Set(settings.homepage.featuredProductIds);
  const featured = featuredIds.size
    ? products.filter((p) => featuredIds.has(p.id))
    : products
        .filter((p) => p.featured || p.price > 1000)
        .sort((a, b) => b.price - a.price)
        .slice(0, 8);

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <>
      <HeroCarousel slides={settings.heroSlides} />

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#0f1111] sm:text-3xl">
            {settings.homepage.title}
          </h1>
          <p className="mt-2 text-[#565959]">{settings.homepage.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/katalog"
              className="rounded-sm bg-[#ff9900] px-5 py-2 text-sm font-bold text-[#0f1111] hover:bg-[#e88b00]"
            >
              Pogledaj katalog
            </Link>
            <Link
              href="/kako-izabrati"
              className="rounded-sm border border-[#d5d9d9] bg-white px-5 py-2 text-sm font-medium text-[#0f1111] hover:bg-[#f7fafa]"
            >
              Kako izabrati bojler
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
        <h2 className="text-xl font-bold text-[#0f1111]">Kategorije</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <Link
                key={cat}
                href={`/katalog?kategorija=${encodeURIComponent(cat)}`}
                className="rounded-lg border border-[#d5d9d9] bg-white p-5 shadow-sm transition hover:border-[#ff9900] hover:shadow-md"
              >
                <h3 className="font-semibold text-[#0f1111]">{cat}</h3>
                <p className="mt-1 text-sm text-[#565959]">{count} proizvoda</p>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-xl font-bold text-[#0f1111]">Izdvojeni proizvodi</h2>
              <Link href="/katalog" className="text-sm font-medium text-[#007185] hover:text-[#c7511f] hover:underline">
                Svi proizvodi →
              </Link>
            </div>
            <ProductGrid products={featured} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="grid gap-4 rounded-lg bg-[#232f3e] p-6 text-white md:grid-cols-3">
          <div>
            <h3 className="font-bold text-[#ff9900]">Brza dostava</h3>
            <p className="mt-1 text-sm text-[#ccc]">Na teritoriji cele Srbije, 24–48 sati</p>
          </div>
          <div>
            <h3 className="font-bold text-[#ff9900]">Pouzdani brendovi</h3>
            <p className="mt-1 text-sm text-[#ccc]">Samo provereni proizvođači</p>
          </div>
          <div>
            <h3 className="font-bold text-[#ff9900]">Podrška</h3>
            <p className="mt-1 text-sm text-[#ccc]">Pomoć pri izboru idealnog bojlera</p>
          </div>
        </div>
      </section>
    </>
  );
}