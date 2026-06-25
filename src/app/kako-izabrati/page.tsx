import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kako izabrati bojler",
  description: "Vodič za izbor idealnog bojlera — kapacitet, tip, brend i energetska efikasnost.",
};

export default function KakoIzabratiPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Kako izabrati bojler</h1>
      <p className="mt-4 text-slate-600 leading-relaxed">
        Pravi izbor bojlera zavisi od broja članova domaćinstva, načina korišćenja i
        dostupnog prostora za montažu.
      </p>

      <div className="mt-10 space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">1. Kapacitet (litraža)</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>1–2 osobe: 30–50 L</li>
            <li>3–4 osobe: 80–100 L</li>
            <li>5+ osoba: 120 L i više</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">2. Tip bojlera</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li><strong>Vertikalni</strong> — standard za kupatilo, lako se montiraju</li>
            <li><strong>Horizontalni</strong> — za prostore sa malom visinom (tavan, pod krevetom)</li>
            <li><strong>Protočni</strong> — ne troše energiju dok se ne koriste, idealni za sudoperu</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">3. Brend i garancija</h2>
          <p className="mt-4 text-sm text-slate-600">
            Birajte proverene brendove kao što su Electrolux, Gorenje, Ariston i Metalac.
            Obratite pažnju na dužinu garancije i dostupnost servisa u Srbiji.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">4. Energetska efikasnost</h2>
          <p className="mt-4 text-sm text-slate-600">
            Bojleri sa boljom izolacijom i eko-režimom rada troše manje struje.
            Tražite modele sa oznakom visoke energetske klase.
          </p>
        </section>
      </div>

      <Link
        href="/katalog"
        className="mt-10 inline-block rounded-sm bg-[#ff9900] px-6 py-3 font-bold text-[#0f1111] hover:bg-[#e88b00]"
      >
        Pogledaj ponudu
      </Link>
    </div>
  );
}