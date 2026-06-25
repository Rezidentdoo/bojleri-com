"use client";

import { useEffect, useState } from "react";
import type { HeroSlide, SiteSettings } from "@/types/site-settings";

const emptySlide = (): HeroSlide => ({
  image: "",
  title: "",
  subtitle: "",
  link: "",
  cta: "Pogledaj",
});

export default function AdminSitePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((data) => setSettings(data));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    setSaving(false);
    setMessage(res.ok ? "Sačuvano!" : "Greška pri čuvanju");
  };

  const updateSlide = (index: number, field: keyof HeroSlide, value: string) => {
    if (!settings) return;
    const slides = [...settings.heroSlides];
    slides[index] = { ...slides[index], [field]: value };
    setSettings({ ...settings, heroSlides: slides });
  };

  if (!settings) {
    return <p className="text-gray-600">Učitavanje...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#131921]">Sadržaj sajta</h1>
      <p className="mt-1 text-sm text-gray-600">Početna, hero slajder, kontakt i SEO</p>

      <div className="mt-8 space-y-6">
        <section className="admin-card p-6">
          <h2 className="font-semibold">Početna strana</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="admin-label">Naslov</label>
              <input
                className="admin-input"
                value={settings.homepage.title}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    homepage: { ...settings.homepage, title: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">Podnaslov</label>
              <textarea
                className="admin-input"
                value={settings.homepage.subtitle}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    homepage: { ...settings.homepage, subtitle: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </section>

        <section className="admin-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Hero slajder</h2>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() =>
                setSettings({
                  ...settings,
                  heroSlides: [...settings.heroSlides, emptySlide()],
                })
              }
            >
              + Dodaj slajd
            </button>
          </div>
          <div className="mt-4 space-y-6">
            {settings.heroSlides.map((slide, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Slajd {i + 1}</p>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        heroSlides: settings.heroSlides.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Obriši
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="admin-label">URL slike</label>
                    <input
                      className="admin-input"
                      value={slide.image}
                      onChange={(e) => updateSlide(i, "image", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Naslov</label>
                    <input
                      className="admin-input"
                      value={slide.title}
                      onChange={(e) => updateSlide(i, "title", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Dugme (CTA)</label>
                    <input
                      className="admin-input"
                      value={slide.cta}
                      onChange={(e) => updateSlide(i, "cta", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="admin-label">Podnaslov</label>
                    <input
                      className="admin-input"
                      value={slide.subtitle}
                      onChange={(e) => updateSlide(i, "subtitle", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="admin-label">Link</label>
                    <input
                      className="admin-input"
                      value={slide.link}
                      onChange={(e) => updateSlide(i, "link", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card p-6">
          <h2 className="font-semibold">Kontakt</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="admin-label">Telefon</label>
              <input
                className="admin-input"
                value={settings.contact.phone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...settings.contact, phone: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">Email</label>
              <input
                className="admin-input"
                value={settings.contact.email}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...settings.contact, email: e.target.value },
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="admin-label">Radno vreme</label>
              <input
                className="admin-input"
                value={settings.contact.workingHours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...settings.contact, workingHours: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </section>

        <section className="admin-card p-6">
          <h2 className="font-semibold">Footer i SEO</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="admin-label">Opis u footeru</label>
              <textarea
                className="admin-input"
                value={settings.footer.description}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    footer: { ...settings.footer, description: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">Napomena o cenama</label>
              <textarea
                className="admin-input"
                value={settings.footer.disclaimer}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    footer: { ...settings.footer, disclaimer: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">SEO naslov</label>
              <input
                className="admin-input"
                value={settings.seo.title}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, title: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">SEO opis</label>
              <textarea
                className="admin-input"
                value={settings.seo.description}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, description: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="admin-btn admin-btn-primary disabled:opacity-60"
          >
            {saving ? "Čuvanje..." : "Sačuvaj sve izmene"}
          </button>
          {message && <span className="text-sm text-green-700">{message}</span>}
        </div>
      </div>
    </div>
  );
}