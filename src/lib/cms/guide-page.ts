import type { GuidePageSettings, SiteSettings } from "@/types/site-settings";

export const defaultGuidePage: GuidePageSettings = {
  title: "Kako izabrati bojler",
  intro:
    "Pravi izbor bojlera zavisi od broja članova domaćinstva, načina korišćenja i dostupnog prostora za montažu.",
  sections: [
    {
      title: "1. Kapacitet (litraža)",
      format: "list",
      content: "1–2 osobe: 30–50 L\n3–4 osobe: 80–100 L\n5+ osoba: 120 L i više",
    },
    {
      title: "2. Tip bojlera",
      format: "list",
      content:
        "Vertikalni — standard za kupatilo, lako se montiraju\nHorizontalni — za prostore sa malom visinom (tavan, pod krevetom)\nProtočni — ne troše energiju dok se ne koriste, idealni za sudoperu",
    },
    {
      title: "3. Brend i garancija",
      format: "text",
      content:
        "Birajte proverene brendove kao što su Electrolux, Gorenje, Ariston i Metalac. Obratite pažnju na dužinu garancije i dostupnost servisa u Srbiji.",
    },
    {
      title: "4. Energetska efikasnost",
      format: "text",
      content:
        "Bojleri sa boljom izolacijom i eko-režimom rada troše manje struje. Tražite modele sa oznakom visoke energetske klase.",
    },
  ],
  ctaLabel: "Pogledaj ponudu",
  ctaLink: "/katalog",
  seoTitle: "Kako izabrati bojler",
  seoDescription:
    "Vodič za izbor idealnog bojlera — kapacitet, tip, brend i energetska efikasnost.",
};

export function resolveGuidePage(settings: SiteSettings): GuidePageSettings {
  return settings.guidePage ?? defaultGuidePage;
}

export function normalizeSiteSettings(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    guidePage: settings.guidePage ?? defaultGuidePage,
  };
}