"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  PRODUCT_BRANDS,
  PRODUCT_CATEGORIES,
  slugifyProductId,
  specificationsToText,
  textToSpecifications,
} from "@/lib/cms/product-admin";
import type { Product } from "@/types/product";

const MAX_GALLERY_IMAGES = 3;

type ProductFormProps = {
  product: Product;
  mode: "create" | "edit";
  onSave: (product: Product) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
};

export default function ProductForm({ product, mode, onSave, onDelete }: ProductFormProps) {
  const [draft, setDraft] = useState(product);
  const [imagesText, setImagesText] = useState(product.images?.join("\n") ?? "");
  const [specsText, setSpecsText] = useState(specificationsToText(product.specifications ?? {}));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewImages = useMemo(
    () =>
      imagesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [imagesText]
  );

  const uploadProductId = useMemo(() => {
    if (mode === "edit" && draft.id) return draft.id;
    if (draft.id.trim()) return slugifyProductId(draft.id);
    if (draft.name.trim()) return slugifyProductId(draft.name);
    return "temp";
  }, [draft.id, draft.name, mode]);

  const setImages = (urls: string[]) => {
    setImagesText(urls.join("\n"));
  };

  const addImageUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || previewImages.includes(trimmed)) return;
    setImages([...previewImages, trimmed]);
    if (!draft.image_url) {
      setDraft((current) => ({ ...current, image_url: trimmed }));
    }
  };

  const removeImage = (url: string) => {
    const next = previewImages.filter((item) => item !== url);
    setImages(next);
    if (draft.image_url === url) {
      setDraft((current) => ({ ...current, image_url: next[0] ?? "" }));
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setMessage("Izaberite sliku (JPG, PNG, WebP ili GIF)");
      return;
    }

    if (previewImages.length >= MAX_GALLERY_IMAGES) {
      setMessage(`Maksimum ${MAX_GALLERY_IMAGES} slike za prikaz na sajtu`);
      return;
    }

    setUploading(true);
    setMessage("");

    const slotsLeft = MAX_GALLERY_IMAGES - previewImages.length;
    const batch = imageFiles.slice(0, slotsLeft);

    const results = await Promise.all(
      batch.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("productId", uploadProductId);
        const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Greška pri uploadu slike");
        }
        const data = await res.json();
        return data.url as string | undefined;
      }),
    ).catch((error: Error) => {
      setMessage(error.message);
      return [] as (string | undefined)[];
    });

    const uploaded = results.filter((url): url is string => Boolean(url));

    if (uploaded.length) {
      const next = [...previewImages, ...uploaded];
      setImages(next);
      if (!draft.image_url) {
        setDraft((current) => ({ ...current, image_url: next[0] }));
      }
      setMessage(`${uploaded.length} slika uploadovano`);
    }

    setUploading(false);
  };

  const buildPayload = (): Product => {
    const images = previewImages;
    const primaryImage = draft.image_url.trim() || images[0] || "";
    return {
      ...draft,
      images,
      image_url: primaryImage,
      specifications: textToSpecifications(specsText),
      original_price: draft.on_sale ? draft.original_price ?? null : null,
    };
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    const ok = await onSave(buildPayload());
    setSaving(false);
    setMessage(ok ? "Sačuvano!" : "Greška pri čuvanju");
  };

  const remove = async () => {
    if (!onDelete) return;
    if (!window.confirm("Da li ste sigurni da želite da obrišete ovaj proizvod?")) return;
    setDeleting(true);
    setMessage("");
    const ok = await onDelete();
    setDeleting(false);
    if (!ok) setMessage("Greška pri brisanju");
  };

  return (
    <div className="admin-card space-y-8 p-6">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#131921]">Osnovne informacije</h2>

        {mode === "create" && (
          <div>
            <label className="admin-label">ID (URL slug, opciono)</label>
            <input
              className="admin-input"
              placeholder="npr. ariston-velis-evo-100l"
              value={draft.id}
              onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500">
              Ostavite prazno za automatski ID iz naziva. Stranica: /proizvod/[id]
            </p>
          </div>
        )}

        <div>
          <label className="admin-label">Naziv *</label>
          <input
            className="admin-input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-label">Brend</label>
            <input
              className="admin-input"
              list="product-brands"
              value={draft.brand}
              onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
            />
            <datalist id="product-brands">
              {PRODUCT_BRANDS.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="admin-label">Kategorija</label>
            <input
              className="admin-input"
              list="product-categories"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
            <datalist id="product-categories">
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="admin-label">Šifra (SKU)</label>
            <input
              className="admin-input"
              value={draft.sku}
              onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="admin-label">Kapacitet (litri)</label>
            <input
              type="number"
              className="admin-input"
              placeholder="npr. 80"
              value={draft.capacity_liters ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  capacity_liters: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <label className="admin-label">Dostupnost</label>
            <select
              className="admin-input"
              value={draft.availability}
              onChange={(e) => setDraft({ ...draft, availability: e.target.value })}
            >
              <option value="Na lageru">Na lageru</option>
              <option value="Nije na lageru">Nije na lageru</option>
              <option value="Pozovite za cenu">Pozovite za cenu</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#131921]">Cena i akcija</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-label">Cena (RSD)</label>
            <input
              type="number"
              className="admin-input"
              value={draft.price}
              onChange={(e) =>
                setDraft({ ...draft, price: Number(e.target.value) || 0 })
              }
            />
            <p className="mt-1 text-xs text-gray-500">0 = „Pozovite za cenu”</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(draft.on_sale)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    on_sale: e.target.checked,
                    original_price: e.target.checked ? draft.original_price ?? draft.price : null,
                  })
                }
              />
              Na akciji
            </label>
          </div>
        </div>

        {draft.on_sale && (
          <div>
            <label className="admin-label">Stara cena pre akcije (RSD)</label>
            <input
              type="number"
              className="admin-input"
              value={draft.original_price ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  original_price: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#131921]">Slike</h2>
        <p className="text-sm text-gray-500">
          Uploadujte slike direktno ili dodajte URL. Na sajtu se prikazuju najviše{" "}
          {MAX_GALLERY_IMAGES} slike.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading) uploadFiles(e.dataTransfer.files);
          }}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? "border-[#ff9900] bg-orange-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-sm font-medium text-gray-700">
            {uploading ? "Upload u toku..." : "Prevuci slike ovde"}
          </p>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG, WebP ili GIF · max 5 MB</p>
          <button
            type="button"
            disabled={uploading || previewImages.length >= MAX_GALLERY_IMAGES}
            onClick={() => fileInputRef.current?.click()}
            className="admin-btn admin-btn-secondary mt-4 disabled:opacity-60"
          >
            {uploading ? "Upload..." : "Izaberi slike"}
          </button>
          {mode === "create" && !draft.name.trim() && (
            <p className="mt-3 text-xs text-amber-700">
              Unesite naziv pre uploada da bi se slike lepše organizovale.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="admin-input"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Ili nalepite URL slike..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addImageUrl(manualUrl);
                setManualUrl("");
              }
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn-secondary shrink-0"
            onClick={() => {
              addImageUrl(manualUrl);
              setManualUrl("");
            }}
          >
            Dodaj URL
          </button>
        </div>

        {previewImages.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {previewImages.map((url) => {
              const isPrimary = draft.image_url === url || (!draft.image_url && url === previewImages[0]);
              return (
                <div
                  key={url}
                  className={`relative overflow-hidden rounded-lg border bg-white ${
                    isPrimary ? "border-[#ff9900] ring-2 ring-[#ff9900]/30" : "border-gray-200"
                  }`}
                >
                  <img src={url} alt="" className="aspect-square w-full object-contain p-2" />
                  <div className="flex flex-wrap gap-1 border-t border-gray-100 p-2">
                    {!isPrimary && (
                      <button
                        type="button"
                        className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                        onClick={() => setDraft({ ...draft, image_url: url })}
                      >
                        Glavna
                      </button>
                    )}
                    {isPrimary && (
                      <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
                        Glavna
                      </span>
                    )}
                    <button
                      type="button"
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                      onClick={() => removeImage(url)}
                    >
                      Ukloni
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#131921]">Opis i specifikacije</h2>

        <div>
          <label className="admin-label">Opis proizvoda</label>
          <textarea
            className="admin-input min-h-40"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>

        <div>
          <label className="admin-label">Specifikacije (Naziv: vrednost, jedna po liniji)</label>
          <textarea
            className="admin-input min-h-32 font-mono text-xs"
            value={specsText}
            onChange={(e) => setSpecsText(e.target.value)}
            placeholder={"Snaga: 2000 W\nZapremina: 80 L"}
          />
        </div>

        <div>
          <label className="admin-label">Spoljni link (opciono)</label>
          <input
            className="admin-input"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="Prazno za ručno dodate proizvode"
          />
          <p className="mt-1 text-xs text-gray-500">
            Ako je link sa aqualand.rs, cena se može automatski osvežavati. Za ručne proizvode
            ostavite prazno.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#131921]">Prikaz na sajtu</h2>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(draft.hidden)}
              onChange={(e) => setDraft({ ...draft, hidden: e.target.checked })}
            />
            Sakrij sa sajta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(draft.featured)}
              onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
            />
            Izdvojeni proizvod
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={saving || !draft.name.trim()}
          className="admin-btn admin-btn-primary disabled:opacity-60"
        >
          {saving ? "Čuvanje..." : mode === "create" ? "Kreiraj proizvod" : "Sačuvaj izmene"}
        </button>

        {mode === "edit" && (
          <>
            <Link
              href={`/proizvod/${draft.id}`}
              target="_blank"
              className="admin-btn admin-btn-secondary"
            >
              Pogledaj na sajtu ↗
            </Link>
            {onDelete && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="admin-btn border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {deleting ? "Brisanje..." : "Obriši proizvod"}
              </button>
            )}
          </>
        )}

        {message && (
          <span
            className={`text-sm ${message.includes("Greška") ? "text-red-700" : "text-green-700"}`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}