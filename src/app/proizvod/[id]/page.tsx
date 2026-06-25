import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductById, getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";
import AddToCartButton from "@/components/AddToCartButton";
import ProductGallery from "@/components/ProductGallery";
import LivePrice from "@/components/LivePrice";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Proizvod nije pronađen" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      images: product.images?.length ? product.images : product.image_url ? [product.image_url] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const galleryImages = product.images?.length
    ? product.images.slice(0, 3)
    : product.image_url
      ? [product.image_url]
      : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: galleryImages,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    sku: product.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: "RSD",
      price: product.price > 0 ? product.price : undefined,
      availability:
        product.availability === "Na lageru"
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-[#c7511f]">Početna</Link>
        {" / "}
        <Link href="/katalog" className="hover:text-[#c7511f]">Katalog</Link>
        {" / "}
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={galleryImages} name={product.name} />

        <div>
          <p className="text-sm font-semibold uppercase text-[#c7511f]">{product.brand}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-2 text-sm text-slate-500">{product.category}</p>

          <LivePrice
            productId={product.id}
            fallbackPrice={product.price}
            fallbackFormatted={product.price_formatted}
            fallbackOriginalPrice={product.original_price}
            fallbackOriginalFormatted={product.original_price_formatted}
            fallbackOnSale={product.on_sale}
            fallbackAvailability={product.availability}
            className="mt-6"
          />

          {product.sku && (
            <p className="mt-4 text-sm text-slate-500">Šifra: {product.sku}</p>
          )}
          {product.capacity_liters && (
            <p className="text-sm text-slate-500">Kapacitet: {product.capacity_liters} L</p>
          )}

          <p className="mt-2 text-xs text-slate-400">
            Izvor cene:{" "}
            <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-[#007185] hover:text-[#c7511f] hover:underline">
              aqualand.rs
            </a>
          </p>

          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>

          <div className="mt-10">
            <h2 className="text-lg font-semibold text-slate-900">Opis proizvoda</h2>
            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {product.description || "Opis nije dostupan."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}