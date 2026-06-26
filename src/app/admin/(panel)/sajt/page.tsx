"use client";

import { useEffect, useState } from "react";
import { defaultGuidePage, normalizeSiteSettings } from "@/lib/cms/guide-page";
import type { GuideSection, HeroSlide, SiteSettings } from "@/types/site-settings";

const emptySlide = (): HeroSlide => ({
  image: "",
  title: "",
  subtitle: "",
  link: "",
  cta: "Pogledaj",
});

const emptyGuideSection = (): GuideSection => ({
  title: "",
  format: "text",
  content: "",
});

export default function AdminSitePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((data: SiteSettings) => setSettings(normalizeSiteSettings(data)));
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
      <p className="mt-1 text-sm text-gray-600">Početna, vodič, hero slajder, kontakt i SEO</p>

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Kako izabrati bojler</h2>
              <p className="mt-1 text-sm text-gray-600">
                Stranica{" "}
                <a href="/kako-izabrati" target="_blank" className="text-[#007185] hover:underline">
                  /kako-izabrati ↗
                </a>
              </p>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() =>
                setSettings({
                  ...settings,
                  guidePage: {
                    ...(settings.guidePage ?? defaultGuidePage),
                    sections: [...(settings.guidePage ?? defaultGuidePage).sections, emptyGuideSection()],
                  },
                })
              }
            >
              + Dodaj sekciju
            </button>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label className="admin-label">Naslov stranice</label>
              <input
                className="admin-input"
                value={settings.guidePage?.title ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    guidePage: { ...(settings.guidePage ?? defaultGuidePage), title: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">Uvodni tekst</label>
              <textarea
                className="admin-input"
                value={settings.guidePage?.intro ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    guidePage: { ...(settings.guidePage ?? defaultGuidePage), intro: e.target.value },
                  })
                }
              />
            </div>
          </div>
          <div className="mt-6 space-y-6">
            {(settings.guidePage ?? defaultGuidePage).sections.map((section, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Sekcija {i + 1}</p>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => {
                      const guidePage = settings.guidePage ?? defaultGuidePage;
                      setSettings({
                        ...settings,
                        guidePage: {
                          ...guidePage,
                          sections: guidePage.sections.filter((_, idx) => idx !== i),
                        },
                      });
                    }}
                  >
                    Obriši
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="admin-label">Naslov sekcije</label>
                    <input
                      className="admin-input"
                      value={section.title}
                      onChange={(e) => {
                        const guidePage = settings.guidePage ?? defaultGuidePage;
                        const sections = [...guidePage.sections];
                        sections[i] = { ...sections[i], title: e.target.value };
                        setSettings({ ...settings, guidePage: { ...guidePage, sections } });
                      }}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Format</label>
                    <select
                      className="admin-input"
                      value={section.format}
                      onChange={(e) => {
                        const guidePage = settings.guidePage ?? defaultGuidePage;
                        const sections = [...guidePage.sections];
                        sections[i] = {
                          ...sections[i],
                          format: e.target.value as GuideSection["format"],
                        };
                        setSettings({ ...settings, guidePage: { ...guidePage, sections } });
                      }}
                    >
                      <option value="list">Lista (jedna stavka po liniji)</option>
                      <option value="text">Tekst (pasus)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="admin-label">
                      {section.format === "list" ? "Stavke liste" : "Tekst sekcije"}
                    </label>
                    <textarea
                      className="admin-input min-h-[120px]"
                      value={section.content}
                      onChange={(e) => {
                        const guidePage = settings.guidePage ?? defaultGuidePage;
                        const sections = [...guidePage.sections];
                        sections[i] = { ...sections[i], content: e.target.value };
                        setSettings({ ...settings, guidePage: { ...guidePage, sections } });
                      }}
                      placeholder={
                        section.format === "list"
                          ? "1–2 osobe: 30–50 L\n3–4 osobe: 80–100 L"
                          : "Tekst pasusa..."
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="admin-label">Tekst dugmeta</label>
              <input
                className="admin-input"
                value={settings.guidePage?.ctaLabel ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    guidePage: { ...(settings.guidePage ?? defaultGuidePage), ctaLabel: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">Link dugmeta</label>
              <input
                className="admin-input"
                value={settings.guidePage?.ctaLink ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    guidePage: { ...(settings.guidePage ?? defaultGuidePage), ctaLink: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">SEO naslov</label>
              <input
                className="admin-input"
                value={settings.guidePage?.seoTitle ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    guidePage: { ...(settings.guidePage ?? defaultGuidePage), seoTitle: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="admin-label">SEO opis</label>
              <input
                className="admin-input"
                value={settings.guidePage?.seoDescription ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    guidePage: {
                      ...(settings.guidePage ?? defaultGuidePage),
                      seoDescription: e.target.value,
                    },
                  })
                }
              />
            </div>
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