import type { Metadata } from "next";
import Link from "next/link";
export const revalidate = 300;

import { getSiteSettings } from "@/lib/cms/settings";
import { resolveGuidePage } from "@/lib/cms/guide-page";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const guide = resolveGuidePage(settings);

  return {
    title: guide.seoTitle,
    description: guide.seoDescription,
  };
}

export default async function KakoIzabratiPage() {
  const settings = await getSiteSettings();
  const guide = resolveGuidePage(settings);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">{guide.title}</h1>
      <p className="mt-4 text-slate-600 leading-relaxed">{guide.intro}</p>

      <div className="mt-10 space-y-8">
        {guide.sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            {section.format === "list" ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                {section.content
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line}>{line}</li>
                  ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600 whitespace-pre-line">{section.content}</p>
            )}
          </section>
        ))}
      </div>

      <Link
        href={guide.ctaLink || "/katalog"}
        className="mt-10 inline-block rounded-sm bg-[#ff9900] px-6 py-3 font-bold text-[#0f1111] hover:bg-[#e88b00]"
      >
        {guide.ctaLabel}
      </Link>
    </div>
  );
}