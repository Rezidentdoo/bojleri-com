type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; variant: "benefits" | "specs" | "default" };

type SectionKind = "intro" | "benefits" | "specs" | "recommendation" | "default";

function parseDescription(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let listItems: string[] = [];
  let listVariant: "benefits" | "specs" | "default" = "default";
  let lastHeading: SectionKind = "default";

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: [...listItems], variant: listVariant });
      listItems = [];
      listVariant = "default";
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const heading = trimmed.match(/^\*\*(.+)\*\*$/);
    if (heading) {
      flushList();
      const text = heading[1].trim().replace(/:$/, "");
      blocks.push({ type: "heading", text });
      lastHeading = sectionKind(text);
      continue;
    }

    const bullet = trimmed.match(/^[-•*–—]\s+(.+)$/);
    if (bullet) {
      listVariant =
        lastHeading === "benefits"
          ? "benefits"
          : lastHeading === "specs"
            ? "specs"
            : "default";
      listItems.push(bullet[1].trim());
      continue;
    }

    flushList();
    blocks.push({ type: "paragraph", text: trimmed });
  }

  flushList();
  return blocks;
}

function sectionKind(heading: string): SectionKind {
  const h = heading.toLowerCase();
  if (h.startsWith("kratak opis") || h.startsWith("kratak uvod")) return "intro";
  if (h.startsWith("glavne prednosti") || h.startsWith("prednosti")) return "benefits";
  if (h.startsWith("tehničke")) return "specs";
  if (h.startsWith("preporuka") || h.startsWith("završna rečenica")) return "recommendation";
  return "default";
}

function SectionIcon({ kind }: { kind: SectionKind }) {
  const className = "h-5 w-5 shrink-0 text-[#ff9900]";

  if (kind === "intro") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 4h8a2 2 0 012 2v14l-6-3-6 3V6a2 2 0 012-2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "benefits") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5.1L12 14.8 7.5 17l.9-5.1L4.8 8.2l5-.7L12 3z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "specs") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-.8 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-.8-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-.8H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-.8 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.9.3 1.7 1.7 0 00.8-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 00.8 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9 1.7 1.7 0 001.5.8H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5.8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "recommendation") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 11l3 3L22 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return null;
}

function displayHeading(text: string): string {
  const kind = sectionKind(text);
  if (kind === "intro") return "Kratak opis";
  if (kind === "recommendation") return "Preporuka";
  return text.replace(/:$/, "");
}

export default function ProductDescription({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-sm text-slate-500">Opis nije dostupan.</p>;
  }

  const blocks = parseDescription(text);
  let currentSection: SectionKind = "default";

  return (
    <div className="space-y-5 text-sm leading-relaxed text-slate-600">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          currentSection = sectionKind(block.text);

          return (
            <h3
              key={index}
              className="mt-5 flex items-center gap-2.5 text-base font-semibold text-slate-900 first:mt-0"
            >
              <SectionIcon kind={currentSection} />
              {displayHeading(block.text)}
            </h3>
          );
        }

        if (block.type === "list") {
          const isBenefits = block.variant === "benefits";
          const isSpecs = block.variant === "specs";

          return (
            <ul
              key={index}
              className={
                isBenefits || isSpecs
                  ? "space-y-2 pl-0"
                  : "list-disc space-y-1.5 pl-5"
              }
            >
              {block.items.map((item, i) => (
                <li
                  key={i}
                  className={
                    isBenefits
                      ? "flex gap-2.5 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                      : isSpecs
                        ? "flex gap-2.5 border-b border-slate-100 py-1.5 last:border-0"
                        : ""
                  }
                >
                  {isBenefits && (
                    <span className="mt-0.5 text-[#ff9900]" aria-hidden>
                      ✓
                    </span>
                  )}
                  {isSpecs && (
                    <span className="mt-0.5 text-slate-400" aria-hidden>
                      ▸
                    </span>
                  )}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        const isRecommendationText = currentSection === "recommendation";

        return (
          <p
            key={index}
            className={
              isRecommendationText
                ? "rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-slate-700"
                : "text-slate-600"
            }
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}