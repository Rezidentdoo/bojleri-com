import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportCallButton from "@/components/SupportCallButton";
import { getSiteSettings } from "@/lib/cms/settings";

export default async function SiteShell({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  if (pathname.startsWith("/admin") || pathname === "/login") {
    return <>{children}</>;
  }

  const settings = await getSiteSettings();

  return (
    <>
      <Header />
      <main className="flex-1 pb-20 sm:pb-0">{children}</main>
      <Footer />
      <SupportCallButton phone={settings.contact.phone} />
    </>
  );
}