import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/cms/settings";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktirajte bojleri.com za informacije o proizvodima i porudžbinama.",
};

function phoneHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export default async function KontaktPage() {
  const settings = await getSiteSettings();
  const { contact } = settings;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Kontakt</h1>
      <p className="mt-4 text-slate-600">
        Imate pitanja o izboru bojlera ili porudžbini? Javite nam se — podrška pri kupovini.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Telefon</h2>
          <p className="mt-1 text-xs text-slate-500">Podrška pri kupovini</p>
          <a
            href={phoneHref(contact.phone)}
            className="mt-2 inline-block text-lg font-medium text-[#007185] hover:text-[#c7511f] hover:underline"
          >
            {contact.phone}
          </a>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Email</h2>
          <a
            href={`mailto:${contact.email}`}
            className="mt-2 inline-block text-lg font-medium text-[#007185] hover:text-[#c7511f] hover:underline"
          >
            {contact.email}
          </a>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:col-span-2">
          <h2 className="font-semibold text-slate-900">Radno vreme</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{contact.workingHours}</p>
        </div>
      </div>
    </div>
  );
}