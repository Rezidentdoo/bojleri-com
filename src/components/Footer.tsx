import Link from "next/link";
import RezidentCredit from "@/components/RezidentCredit";
import { getSiteSettings } from "@/lib/cms/settings";

export default async function Footer() {
  const settings = await getSiteSettings();

  return (
    <footer className="mt-auto bg-[#232f3e] text-[#ddd]">
      <div className="bg-[#37475a] py-4 text-center">
        <Link href="/" className="text-sm hover:underline">
          Nazad na početnu
        </Link>
      </div>
      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            <span className="text-[#ff9900]">B</span> bojleri.com
          </h3>
          <p className="mt-2 text-sm leading-relaxed">{settings.footer.description}</p>
        </div>
        <div>
          <h4 className="font-semibold text-white">Navigacija</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/katalog" className="hover:text-[#ff9900]">Katalog</Link></li>
            <li><Link href="/kako-izabrati" className="hover:text-[#ff9900]">Kako izabrati bojler</Link></li>
            <li><Link href="/korpa" className="hover:text-[#ff9900]">Korpa</Link></li>
            <li><Link href="/kontakt" className="hover:text-[#ff9900]">Kontakt</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white">Kontakt</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`tel:${settings.contact.phone.replace(/\s/g, "")}`} className="hover:text-[#ff9900]">
                {settings.contact.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${settings.contact.email}`} className="hover:text-[#ff9900]">
                {settings.contact.email}
              </a>
            </li>
            <li className="whitespace-pre-line text-[#bbb]">{settings.contact.workingHours}</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white">Napomena</h4>
          <p className="mt-3 text-sm leading-relaxed">{settings.footer.disclaimer}</p>
        </div>
      </div>
      <div className="space-y-2 bg-[#131921] py-6 text-center text-xs">
        <p className="text-[#999]">© {new Date().getFullYear()} bojleri.com — Sva prava zadržana</p>
        <RezidentCredit variant="footer" />
      </div>
    </footer>
  );
}