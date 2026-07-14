/**
 * Prodajni šablon opisa — koristi se u CMS-u i u cron job-u.
 */
export const DESCRIPTION_FORMAT_PROMPT = `Uzmi sirovi opis proizvoda i pretvori ga u čist, pregledan i prodajan opis koristeći ovaj tačan template:

**Kratak opis** (1-2 rečenice)

**Glavne prednosti:**
- bullet 1
- bullet 2

**Tehničke karakteristike:**
- bullet 1
- bullet 2

**Preporuka** (1 rečenica preporuke)

Pravila:
- Ukloni sva dupliranja
- Koristi prirodan srpski jezik
- Fokus na benefite + tehniku
- Stil isti za sve proizvode`;

const GENERIC_RECOMMENDATION =
  "Pogodan izbor za pouzdanu i ekonomičnu pripremu tople vode u vašem domaćinstvu.";

const PLACEHOLDER_TEXT = /^(završna\s+rečenica|kratak\s+opis|glavne\s+prednosti|tehničke\s+karakteristike|preporuka)\s*$/i;

const SPEC_LABEL =
  /^(visina|širina|dubina|dimenzij|snaga|zapremina|težina|klasa|neto|maks|min\.?|boja|nisko|kompakt|vreme|temperatur|potrošnja|priključak|garancij|napomena|štapni|dimenzija|šifra|model|tip|materijal|proizvođač|boja|ipx|zaštita|ventil|anoda|kazan|grejač|termostat)/i;

const INTRO_HEADERS = [
  /^glavne\s+prednosti\s*:?\s*$/i,
  /^prednosti\s*:?\s*$/i,
  /^tehničke\s+karakteristike\s*:?\s*$/i,
  /^tehničke\s+specifikacije\s*:?\s*$/i,
  /^specifikacije\s*:?\s*$/i,
  /^preporuka\s*:?\s*$/i,
];

const BENEFITS_HEADERS = [/^glavne\s+prednosti\s*:?\s*$/i, /^prednosti\s*:?\s*$/i];
const SPECS_HEADERS = [
  /^tehničke\s+karakteristike\s*:?\s*$/i,
  /^tehničke\s+specifikacije\s*:?\s*$/i,
  /^specifikacije\s*:?\s*$/i,
];
const RECOMMENDATION_HEADERS = [
  /^preporuka\s*:?\s*$/i,
  /^završna\s+rečenica\s*:?\s*$/i,
];
const INTRO_SECTION_HEADERS = [/^kratak\s+opis\s*:?\s*$/i, /^kratak\s+uvod\s*:?\s*$/i];

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&deg;/gi, "°")
    .replace(/&Scaron;/gi, "Š")
    .replace(/&scaron;/gi, "š")
    .replace(/&Ccaron;/gi, "Č")
    .replace(/&ccaron;/gi, "č")
    .replace(/&Cacute;/gi, "Ć")
    .replace(/&cacute;/gi, "ć")
    .replace(/&Zcaron;/gi, "Ž")
    .replace(/&zcaron;/gi, "ž")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeLine(line) {
  return decodeHtmlEntities(line)
    .replace(/^\s*[-•*–—]\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForCompare(text) {
  return normalizeLine(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSimilarText(a, b) {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  if (shorter.length >= 24 && longer.includes(shorter)) return true;
  const aWords = new Set(shorter.split(" ").filter((w) => w.length > 3));
  const bWords = longer.split(" ").filter((w) => w.length > 3);
  if (!aWords.size || !bWords.length) return false;
  let overlap = 0;
  for (const w of bWords) {
    if (aWords.has(w)) overlap++;
  }
  return overlap / Math.max(aWords.size, bWords.length) >= 0.82;
}

function dedupeItems(items) {
  const seen = [];
  const result = [];
  for (const item of items) {
    const normalized = normalizeLine(item);
    if (!normalized || PLACEHOLDER_TEXT.test(normalized)) continue;
    if (normalizeForCompare(normalized) === normalizeForCompare(GENERIC_RECOMMENDATION)) continue;
    if (seen.some((s) => isSimilarText(s, normalized))) continue;
    seen.push(normalized);
    result.push(normalized);
  }
  return result;
}

function dedupeAgainst(items, existing) {
  const seen = [...existing];
  const result = [];
  for (const item of items) {
    const normalized = normalizeLine(item);
    if (!normalized || PLACEHOLDER_TEXT.test(normalized)) continue;
    if (normalizeForCompare(normalized) === normalizeForCompare(GENERIC_RECOMMENDATION)) continue;
    if (seen.some((s) => isSimilarText(s, normalized))) continue;
    seen.push(normalized);
    result.push(normalized);
  }
  return result;
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function collapseRepeatedSentences(text) {
  const sentences = splitSentences(text.replace(/\s+/g, " ").trim());
  return dedupeItems(sentences).join(" ");
}

function collapseRepeatedParagraph(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 80) return compact;

  for (let repeats = 5; repeats >= 2; repeats--) {
    const chunkLen = Math.round(compact.length / repeats);
    const chunk = compact.slice(0, chunkLen).trim();
    if (chunk.length < 40) continue;
    const rebuilt = chunk.repeat(repeats).slice(0, compact.length);
    if (rebuilt === compact) return chunk;
  }

  return collapseRepeatedSentences(compact);
}

function splitMergedLines(line) {
  const t = normalizeLine(line);
  if (!t) return [];

  const specBoundary =
    /(?<=[.!?)])\s+(?=(?:Snaga|Dimenzije|Visina|Širina|Dubina|Težina|Klasa|Neto\s+težina|Preporuka|Maks|Min|Zapremina|Boja|Potrošnja|Napomena|Vreme|Temperatur|IPX|Nazivni|Minimalni|Masa|Priključak|Napon|Struja|Stepen|Kazan|Kućište|Izolacija|Termostat|Sigurnosni)\s*[:–—-])/gi;
  const specParts = t.split(specBoundary);

  if (specParts.length > 1) {
    return specParts.map(normalizeLine).filter(Boolean);
  }

  if (t.length > 100 && !/^[^:]{2,45}:\s*.+/.test(t)) {
    const parts = t
      .split(/(?<=[.!?])\s+|(?<=[a-zćčžšđ])\s+(?=[A-ZČĆŽŠĐ][a-zćčžšđ]{4,}(?:\s|$))/)
      .map(normalizeLine)
      .filter((p) => p.length >= 15);
    if (parts.length > 1) return parts;
  }

  return [t];
}

function isHeader(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\*\*.+\*\*$/.test(trimmed)) return true;
  return INTRO_HEADERS.some((re) => re.test(trimmed.replace(/\*\*/g, "")));
}

function headerType(line) {
  const plain = line.trim().replace(/\*\*/g, "").replace(/:$/, "");
  if (INTRO_SECTION_HEADERS.some((re) => re.test(plain))) return "other";
  if (BENEFITS_HEADERS.some((re) => re.test(plain))) return "benefits";
  if (SPECS_HEADERS.some((re) => re.test(plain))) return "specs";
  if (RECOMMENDATION_HEADERS.some((re) => re.test(plain))) return "recommendation";
  if (isHeader(line)) return "other";
  return null;
}

function isBullet(line) {
  const t = line.trim();
  return /^[-•*–—]\s+/.test(t) || /^\d+[.)]\s+/.test(t);
}

function hasSpecDelimiter(line) {
  return /^[^:–—-]{2,55}\s*[:–—-]\s*.+/.test(normalizeLine(line));
}

function isSpecLikeLine(line) {
  const t = normalizeLine(line);
  if (!t) return false;
  if (hasSpecDelimiter(t)) return true;
  if (/^(visina|širina|dubina|dimenzij|snaga|zapremina|težina|boja)\s*[-–—]\s*.+/i.test(t)) return true;
  if (/^\d+[\s,.]*\d*\s*[×x]\s*\d+/i.test(t)) return true;
  if (t.length <= 90) {
    const specHits = (t.match(new RegExp(SPEC_LABEL.source, "gi")) || []).length;
    return specHits >= 2;
  }
  return false;
}

function isBenefitLikeLine(line) {
  const t = normalizeLine(line);
  if (!t || isSpecLikeLine(t)) return false;
  return t.length >= 20;
}

function isFeaturePhrase(line) {
  const t = normalizeLine(line);
  if (!t || hasSpecDelimiter(t)) return false;
  if (isSpecLikeLine(t)) return false;
  if (/^(sigurnosni ventil|termostat|grejač|anoda|ventil|kazan)$/i.test(t)) return false;
  return t.length >= 10 && t.length <= 90;
}

function splitPackedSpecs(text) {
  let result = text
    .replace(/TEHNIČKE\s+KARAKTERISTIKE\s*[-:]\s*/gi, "\nTehničke karakteristike:\n")
    .replace(/Prednosti\s+[^\n•:]+[•:]\s*/gi, "\nGlavne prednosti:\n")
    .replace(/Tehničke\s+karakteristike\s*:\s*/gi, "\nTehničke karakteristike:\n")
    .replace(/Glavne\s+prednosti\s*:\s*/gi, "\nGlavne prednosti:\n");

  result = result.replace(
    /(?<=[a-zćčžšđ.])(?<!\d)\s*-\s*(?=(Visina|Širina|Dubina|Dimenzij|Snaga|Zapremina|Težina|Klasa|Neto|Maks|Min\.|Boja|Nisko|Kompakt|Vreme|Temperatur|Potrošnja|Priključak|Garancij|Napomena|Štapni|Emajlir|Magnezij|Mehaničk|Sigurnosn|Maksimaln|Minimaln|Klasa|IPX))/gi,
    "\n"
  );

  result = result.replace(
    /(?<=[a-zćčžšđ)])(?<!\d)-\s*(?=[A-ZČĆŽŠĐ][a-zćčžšđ]+)/g,
    "\n"
  );

  result = result.replace(
    /(?<=[a-zćčžšđ0-9)])(?<!\d)-\s*(?=[A-ZČĆŽŠĐa-zčćžšđ]*(?:kazan|anoda|grejač|termostat|ventil|emajl|regulator|zagrevanje|temperatur|materijal|snaga|kapacitet|zapremina|visina|širina|dubina|napon|masa|priključak|precizno|veoma|mehaničk|sigurnosn))/gi,
    "\n"
  );

  result = result.replace(
    /(?<=[a-zćčžšđ0-9)])(?<!\d)\s*-\s*(?=(?:Zapremina|Nazivni|Minimalni|Masa|Priključak|Snaga|Napon|Struja|Visina|Širina|Dubina|Kapacitet|Materijal|Klasa|Stepen|Vreme|Kazan|Kućište|Izolacija|Termostat|Sigurnosni)\b)/gi,
    "\n"
  );

  result = result.replace(/(?<=\dcm)\s*[-–—]\s*(?=(?:Širina|Visina|Dubina|Težina|Snaga|Kapacitet))/gi, "\n");
  result = result.replace(/(?<=[0-9cmkWlV)'"])\s*[-–—]\s*(?=[A-ZČĆŽŠĐŠ])/g, "\n");
  result = result.replace(/(?<=[a-zćčžšđ])(?<!l)\s*:\s*(?=[A-ZČĆŽŠĐ])/g, ": ");

  return result;
}

function extractInlineSpecs(text) {
  const specs = [];
  const patterns = [
    /\b(Visina|Širina|Dubina|Dimenzij[ae]?|Snaga|Zapremina|Težina|Boja|Vreme\s+zagrevanja|Maks\.?\s*temperatur[ae]?|Min\.?\s*temperatur[ae]?|Potrošnja|Klasa|Napomena)\s*[-–—:]\s*[^.]+?(?=(?:\s+(?:Visina|Širina|Dubina|Dimenzij|Snaga|Zapremina|Težina|Boja|Vreme|Maks|Min|Potrošnja|Klasa|Napomena)\s*[-–—:])|$)/gi,
    /\b\d+[\s,.]*\d*\s*[×x]\s*\d+[\s,.]*\d*(?:\s*[×x]\s*\d+[\s,.]*\d*)?\s*cm\b/gi,
  ];

  let remaining = text;
  for (const pattern of patterns) {
    const matches = [...remaining.matchAll(pattern)];
    for (const m of matches) {
      const item = normalizeLine(m[0]);
      if (item && !specs.some((s) => isSimilarText(s, item))) specs.push(item);
      remaining = remaining.replace(m[0], " ");
    }
  }

  remaining = remaining
    .replace(/\bPrednosti\s+[A-Za-z0-9]+\s+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return { remaining, specs };
}

function splitLongItem(item) {
  const t = normalizeLine(item);
  if (!t) return [];

  if (t.length <= 160 && !/(?<=[a-zćčžšđ])-\s*[A-ZČĆŽŠĐ]/.test(t)) return [t];

  const parts = t
    .split(/(?<=[a-zćčžšđ])(?<!\d)-\s*(?=[A-ZČĆŽŠĐ])|(?<=[.!?])\s+/)
    .map((p) => normalizeLine(p.replace(/^-\s*/, "")))
    .filter((p) => p.length >= 12);

  return parts.length ? parts : [t];
}

function flattenItems(items) {
  return items.flatMap((item) => {
    if (/^[^:]{2,30}:\s*.+/.test(normalizeLine(item))) {
      const parts = splitMergedLines(item).filter((p) => /^[^:]{2,45}:\s*.+/.test(p) || isSpecLikeLine(p));
      if (parts.length > 1) return parts;
    }
    return splitLongItem(item);
  });
}

function partitionBenefitsAndSpecs(items) {
  const benefits = [];
  const specs = [];
  for (const item of flattenItems(items)) {
    if (isSpecLikeLine(item)) specs.push(item);
    else if (isBenefitLikeLine(item)) benefits.push(item);
    else if (item.length >= 8) specs.push(item);
  }
  return { benefits, specs };
}

function collectSectionLines(lines, start, mode) {
  const items = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (headerType(line)) break;
    if (/^preporuka\s*:/i.test(line)) break;

    let stopSection = false;
    for (const part of splitMergedLines(line)) {
      if (/^preporuka\s*:/i.test(part)) {
        stopSection = true;
        break;
      }
      items.push(part);
    }
    if (stopSection) break;
    i++;
  }

  return { items, next: i };
}

function extractIntro(raw, lines) {
  const firstHeaderIdx = lines.findIndex((l) => headerType(l));
  let joined = "";

  if (firstHeaderIdx <= 0) {
    const paragraph = raw
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .find((p) => p && !isHeader(p) && !/^preporuka\s*:/i.test(p));
    joined = paragraph ? paragraph.replace(/\*\*/g, "") : "";
  } else {
    const introLines = [];
    for (let i = 0; i < firstHeaderIdx; i++) {
      const line = lines[i].trim();
      if (!line || isHeader(line)) continue;
      introLines.push(line.replace(/\*\*/g, ""));
    }
    joined = introLines.join(" ").replace(/\s+/g, " ").trim();
  }

  if (!joined) return { intro: "", overflow: [], specs: [] };

  joined = collapseRepeatedParagraph(joined);
  const { remaining, specs } = extractInlineSpecs(joined);
  const sentences = dedupeItems(splitSentences(remaining)).filter((s) => !isSpecLikeLine(s));

  const narrative = sentences.filter((s) => !isSpecLikeLine(s) && s.length >= 20);
  const introSentences = (narrative.length ? narrative : sentences).slice(0, 2);
  const overflow = (narrative.length ? narrative : sentences).slice(2);

  let intro = introSentences.join(" ");
  if (intro.length > 360) {
    const shortened = splitSentences(intro).slice(0, 2).join(" ");
    intro = shortened.length <= 360 ? shortened : `${shortened.slice(0, 357).replace(/\s+\S*$/, "")}…`;
  }

  return { intro, overflow, specs };
}

function extractRecommendation(lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const type = headerType(line);

    if (type === "recommendation") {
      const inline = line
        .replace(/^\*\*|\*\*$/g, "")
        .replace(/^preporuka\s*:\s*/i, "")
        .trim();
      if (inline && !PLACEHOLDER_TEXT.test(inline)) return normalizeLine(inline);

      const rest = lines
        .slice(i + 1)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !headerType(l));
      if (rest.length) {
        const candidate = normalizeLine(rest[0].replace(/^preporuka\s*:\s*/i, ""));
        if (candidate && !PLACEHOLDER_TEXT.test(candidate)) return candidate;
      }
    }

    if (/^preporuka\s*:\s*.+/i.test(line)) {
      const candidate = normalizeLine(line.replace(/^preporuka\s*:\s*/i, ""));
      if (candidate && !PLACEHOLDER_TEXT.test(candidate)) return candidate;
    }
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (/^(odličan|ideal(an)?|preporučujemo|savršen|pogodan)/i.test(line)) {
      const candidate = normalizeLine(line);
      if (normalizeForCompare(candidate) !== normalizeForCompare(GENERIC_RECOMMENDATION)) {
        return candidate;
      }
    }
  }

  return "";
}

function collapseRepeatedBlock(text) {
  if (!/\n/.test(text)) return collapseRepeatedParagraph(text);

  return text
    .split(/\n\s*\n/)
    .map((paragraph) => {
      if (!/\n/.test(paragraph)) return collapseRepeatedParagraph(paragraph.trim());

      return paragraph
        .split(/\n/)
        .map((line) => collapseRepeatedParagraph(line.trim()))
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function synthesizeIntro({ name = "", category = "", benefits = [], specs = [] }) {
  const cat = String(category).toLowerCase();
  const all = `${name} ${benefits.join(" ")} ${specs.join(" ")}`.toLowerCase();
  const volumeMatch =
    name.match(/(\d+)\s*l\b/i) ||
    all.match(/zapremina[^0-9]*(\d+)\s*l/i) ||
    specs.join(" ").match(/(\d+)\s*l\b/i);
  const volume = volumeMatch ? Number(volumeMatch[1]) : null;
  const brand = String(name).split(/\s+/)[0];

  if (cat.includes("anoda") || /^anoda\b/i.test(name)) {
    return `${name} je rezervni deo za zaštitu bojlera od korozije i produženje veka kazana.`;
  }
  if (cat.includes("dihtung") || /^dihtung\b/i.test(name)) {
    return `${name} obezbeđuje pouzdano i hermetično zaptivanje pri servisiranju ili ugradnji bojlera.`;
  }
  if (cat.includes("protočn") || all.includes("protočn")) {
    return `${brand} protočni bojler ${volume ? `od ${volume} l` : ""} namenjen je brzom zagrevanju vode na jednom potrošnom mestu.`.replace(/\s+/g, " ").trim();
  }
  if (cat.includes("kombinov") || all.includes("izmenjivač")) {
    return `${name} kombinuje električno grejanje i izmenjivač toplote za značajnu uštedu energije.`;
  }
  if (cat.includes("horizontaln")) {
    return `${name} je horizontalni bojler pogodan za ugradnju tamo gde je ograničena visina prostora.`;
  }
  if (volume && volume <= 15) {
    return `${name} je kompaktan bojler za kuhinju, kupatilo ili manje prostore sa umerenim potrebama za toplom vodom.`;
  }
  if (volume && volume <= 49) {
    return `${name} je akumulacioni bojler srednje zapremine pogodan za stanove i manja domaćinstva.`;
  }
  if (volume && volume >= 160) {
    return `${name} namenjen je objektima sa većim potrebama za toplom vodom i više istovremenih potrošnih mesta.`;
  }
  if (volume && volume >= 50) {
    return `${name} je pouzdan akumulacioni bojler za domaćinstva sa više članova i redovnom potrošnjom tople vode.`;
  }
  if (benefits.length) {
    const anchor = benefits[0].replace(/[.!?]$/, "");
    return `${name} ističe se po tome što ${anchor.charAt(0).toLowerCase()}${anchor.slice(1)}.`;
  }
  if (specs.length) {
    const keySpecs = specs.slice(0, 2).join(", ").replace(/[.!?]$/, "");
    return `${name} je električni bojler sa sledećim karakteristikama: ${keySpecs}.`;
  }
  return `${name} je kvalitetan proizvod iz naše ponude bojlera i opreme za pripremu tople vode.`;
}

function synthesizeRecommendation({ name = "", category = "", intro = "", benefits = [], specs = [] }) {
  const cat = String(category).toLowerCase();
  const all = `${name} ${intro} ${benefits.join(" ")} ${specs.join(" ")}`.toLowerCase();
  const volumeMatch =
    name.match(/(\d+)\s*l\b/i) ||
    all.match(/zapremina[^0-9]*(\d+)\s*l/i) ||
    all.match(/\b(\d+)\s*lit/i);
  const volume = volumeMatch ? Number(volumeMatch[1]) : null;

  if (cat.includes("protočn") || all.includes("protočn")) {
    return "Odličan izbor za brzo i ekonomično zagrevanje vode na jednom potrošnom mestu.";
  }
  if (cat.includes("kombinov") || all.includes("izmenjivač toplote")) {
    return "Preporučujemo ga domaćinstvima koja žele uštedu energije kroz priključak na kotao ili solarne kolektore.";
  }
  if (volume && volume >= 160) {
    return "Namena je objekti sa većim potrebama za toplom vodom — ugostiteljstvo, sportski centri i veća domaćinstva.";
  }
  if (volume && volume >= 80) {
    return "Pogodan za porodice i stanove sa više potrošnih mesta istovremeno.";
  }
  if (volume && volume <= 30) {
    return "Kompaktno rešenje za kuhinju, kupatilo ili radionicu gde je potrebna manja količina tople vode.";
  }
  if (cat.includes("rezervni") || cat.includes("delovi") || cat.includes("pribor")) {
    return "Proverite kompatibilnost sa vašim modelom pre poručivanja.";
  }
  if (benefits.length) {
    const anchor = benefits[0];
    if (anchor.length <= 140) {
      return `Zbog ${anchor.charAt(0).toLowerCase()}${anchor.slice(1).replace(/[.!?]$/, "")}, ovaj model je praktičan izbor za svakodnevnu upotrebu.`;
    }
  }
  if (intro) {
    const shortName = String(name).split(/\s+/).slice(0, 4).join(" ").trim();
    if (shortName) {
      return `${shortName} predstavlja pouzdano rešenje za pripremu tople vode prema navedenim karakteristikama.`;
    }
  }
  return "";
}

/**
 * Priprema sirovog teksta (duplikati, • liste, nabijene specifikacije).
 */
export function preprocessRawDescription(raw) {
  let text = raw.trim();
  if (!text) return "";

  text = collapseRepeatedBlock(text);
  text = splitPackedSpecs(text);
  text = text.replace(/•/g, "\n");

  if (
    !/glavne\s+prednosti/i.test(text) &&
    !/tehničke\s+karakteristike/i.test(text) &&
    !/\n/.test(text)
  ) {
    const { remaining, specs } = extractInlineSpecs(text.replace(/\n+/g, " "));
    const sentences = dedupeItems(splitSentences(remaining));
    if (sentences.length > 2 || specs.length) {
      const intro = sentences.slice(0, 2).join(" ");
      const benefits = sentences.slice(2).filter((s) => !isSpecLikeLine(s));
      const parts = [];
      if (intro) parts.push(intro);
      if (benefits.length) parts.push("", "Glavne prednosti:", "", ...benefits);
      if (specs.length) parts.push("", "Tehničke karakteristike:", "", ...specs);
      return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }
  }

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function isFormattedProductDescription(text) {
  return (
    text.includes("**Kratak opis**") ||
    text.includes("**Kratak uvod**") ||
    text.includes("**Glavne prednosti:**") ||
    text.includes("**Tehničke karakteristike:**")
  );
}

/** Pretvara formatirani opis u grub sirovi tekst (za ponovno formatiranje). */
export function stripFormattedDescription(text) {
  if (!text?.trim()) return "";
  if (!isFormattedProductDescription(text)) return text;

  const lines = text.split(/\r?\n/);
  const parts = [];
  let section = "";
  let buffer = [];

  const flush = () => {
    if (!buffer.length) return;
    const body = buffer.join(section === "list" ? "\n" : " ").trim();
    if (body) parts.push(`${section}\n\n${body}`);
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^\*\*(.+)\*\*$/);
    if (heading) {
      flush();
      section = heading[1].replace(/:$/, "");
      continue;
    }
    if (/^[-•*–—]\s+/.test(trimmed)) {
      if (section !== "list") {
        flush();
        section = "list";
      }
      buffer.push(trimmed);
    } else {
      if (section === "list") {
        flush();
        section = "";
      }
      buffer.push(trimmed);
    }
  }
  flush();

  return parts.join("\n\n").trim();
}

/** Ažurira stare naslove sekcija u novi šablon. */
export function migrateDescriptionHeadings(text) {
  if (!text?.trim()) return text;
  return text
    .replace(/\*\*Kratak uvod\*\*/g, "**Kratak opis**")
    .replace(/\*\*Završna rečenica\*\*/g, "**Preporuka**");
}

/**
 * @param {string} raw
 * @param {{ specifications?: Record<string, string>, name?: string, category?: string }} [options]
 */
export function formatProductDescription(raw, options = {}) {
  const preprocessed = preprocessRawDescription(raw);
  const trimmed = preprocessed.trim();
  if (!trimmed) return "";

  const lines = trimmed.split(/\r?\n/).map((l) => l.trimEnd());
  let benefits = [];
  let specs = [];

  for (let i = 0; i < lines.length; i++) {
    const type = headerType(lines[i]);
    if (!type || type === "recommendation" || type === "other") continue;
    const { items, next } = collectSectionLines(lines, i + 1, type);
    if (type === "benefits") benefits.push(...items);
    if (type === "specs") specs.push(...items);
    i = next - 1;
  }

  if (!benefits.length && !specs.length) {
    const bullets = lines.filter((l) => isBullet(l)).map(normalizeLine);
    const nonBullets = lines.filter((l) => l.trim() && !isBullet(l) && !isHeader(l));
    const partitioned = partitionBenefitsAndSpecs(bullets);
    benefits = partitioned.benefits;
    specs = partitioned.specs;

    if (!benefits.length && !specs.length) {
      const sentences = dedupeItems(splitSentences(trimmed.replace(/\*\*/g, "")));
      const split = partitionBenefitsAndSpecs(sentences);
      benefits = split.benefits;
      specs = split.specs;
      if (!benefits.length && sentences.length > 2) {
        benefits = sentences.slice(2).filter((s) => !isSpecLikeLine(s));
      } else if (!benefits.length && nonBullets.length > 1) {
        benefits = nonBullets.slice(1).map(normalizeLine);
      }
    }
  }

  const specifications = options.specifications || {};
  if (!specs.length && specifications && typeof specifications === "object") {
    specs = Object.entries(specifications)
      .filter(([, v]) => String(v).trim())
      .map(([k, v]) => `${k}: ${v}`);
  }

  const introData = extractIntro(trimmed, lines);
  let intro = introData.intro;
  specs.push(...introData.specs);

  if (introData.overflow.length) {
    benefits.push(...introData.overflow);
  }

  const partitionedBenefits = partitionBenefitsAndSpecs(benefits);
  benefits = partitionedBenefits.benefits;
  specs.push(...partitionedBenefits.specs);

  if (!benefits.length && specs.length) {
    const featureSpecs = specs.filter((s) => isFeaturePhrase(s));
    if (featureSpecs.length) {
      benefits = featureSpecs;
      specs = specs.filter((s) => !featureSpecs.includes(s));
    }
  }

  if (!intro) {
    intro = synthesizeIntro({
      name: options.name || "",
      category: options.category || "",
      benefits,
      specs,
    });
  }

  benefits = dedupeAgainst(benefits, intro ? splitSentences(intro) : []);
  specs = dedupeAgainst(specs, [...(intro ? splitSentences(intro) : []), ...benefits]);
  specs = dedupeItems(
    specs
      .filter((s) => !/^preporuka\s*:/i.test(s))
      .map((s) => (s === "DA" || s === "Da" ? "Sigurnosni ventil: da" : s))
      .filter((s) => s.length > 2)
  );

  let recommendation = extractRecommendation(lines);

  for (let i = specs.length - 1; i >= 0; i--) {
    const recMatch = specs[i].match(/^preporuka\s*:\s*(.+)$/i);
    if (recMatch) {
      specs.splice(i, 1);
      if (!recommendation) recommendation = normalizeLine(recMatch[1]);
    }
  }
  if (!recommendation || normalizeForCompare(recommendation) === normalizeForCompare(GENERIC_RECOMMENDATION)) {
    recommendation = synthesizeRecommendation({
      name: options.name || "",
      category: options.category || "",
      intro,
      benefits,
      specs,
    });
  }

  if (recommendation && isSimilarText(recommendation, intro)) {
    recommendation = synthesizeRecommendation({
      name: options.name || "",
      category: options.category || "",
      intro: "",
      benefits,
      specs,
    });
  }

  const parts = [];

  parts.push("**Kratak opis**", "", intro, "");

  if (benefits.length) {
    parts.push("**Glavne prednosti:**", "", ...benefits.map((b) => `- ${b}`), "");
  }

  if (specs.length) {
    parts.push("**Tehničke karakteristike:**", "", ...specs.map((s) => `- ${s}`), "");
  }

  if (recommendation && !PLACEHOLDER_TEXT.test(recommendation)) {
    const rec = recommendation
      .replace(/^preporuka\s*:\s*/i, "")
      .replace(/^završna\s+rečenica\s*$/i, "")
      .trim();
    if (rec && normalizeForCompare(rec) !== normalizeForCompare(GENERIC_RECOMMENDATION)) {
      parts.push("**Preporuka**", "", rec);
    }
  }

  return parts.join("\n").trim();
}