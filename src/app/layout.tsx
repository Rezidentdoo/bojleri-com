import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import SiteShell from "@/components/SiteShell";
import { getSiteSettings } from "@/lib/cms/settings";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: {
      default: settings.seo.title,
      template: "%s | bojleri.com",
    },
    description: settings.seo.description,
    keywords: settings.seo.keywords,
    openGraph: {
      title: settings.seo.title,
      description: settings.seo.description,
      locale: "sr_RS",
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <SiteShell>{children}</SiteShell>
        </CartProvider>
      </body>
    </html>
  );
}