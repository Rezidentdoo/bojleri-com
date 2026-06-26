export interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  link: string;
  cta: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  workingHours: string;
}

export interface HomepageSettings {
  title: string;
  subtitle: string;
  featuredProductIds: string[];
}

export interface SeoSettings {
  title: string;
  description: string;
  keywords: string[];
}

export interface GuideSection {
  title: string;
  format: "list" | "text";
  content: string;
}

export interface GuidePageSettings {
  title: string;
  intro: string;
  sections: GuideSection[];
  ctaLabel: string;
  ctaLink: string;
  seoTitle: string;
  seoDescription: string;
}

export interface SiteSettings {
  homepage: HomepageSettings;
  heroSlides: HeroSlide[];
  contact: ContactInfo;
  footer: {
    description: string;
    disclaimer: string;
  };
  seo: SeoSettings;
  guidePage?: GuidePageSettings;
}