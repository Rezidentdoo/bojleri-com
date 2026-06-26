/**
 * Filtrira samo prave bojlere. Proverava uglavnom NAZIV proizvoda
 * (opis na aqualand.rs često sadrži "anoda", "grejač" pa pravi lažne odbije).
 */

const TILE_IN_NAME = [
  /\bm2\b/i,
  /\d{2,3}\s*[x×]\s*\d{2,3}/i,
  /\bplo[cč]ic/i,
  /\bkeramik/i,
  /\bsunđer\s+za\s+plo[cč]/i,
  /\b(adz|andros|elegant\s+beige|nerva\s+gris|prissmacer)\b/i,
];

const ACCESSORY_IN_NAME = [
  /^anoda\b/i,
  /\bdihtung/i,
  /^lavabo\b/i,
  /\bfugomal/i,
  /\bbrusni\s+disk/i,
  /\brezna\s+plo[cč]/i,
  /\bduofix/i,
  /^vodomer\b/i,
  /\bprirubnic/i,
  /\brešetk/i,
  /^tkomad\b/i,
  /\bsrafciger/i,
  /\btolsen\b/i,
  /^greja[cč]\b/i,
  /\bgreja[cč]\s+za\s+bojler/i,
  /\bgreja[cč]\s+bojlera/i,
  /\brem(er)?\s+metric/i,
  /\bklingerit/i,
  /\bvodokotli[cć]/i,
  /\bdleto\b/i,
  /^sonda\b/i,
  /^nosač$/i,
  /\bnosač\s+ruž/i,
  /^nosač\b/i,
  /\bparavan/i,
  /\bšolj/i,
  /\bwc\b/i,
  /\bdonji\s+deo\b/i,
  /\bgornji\s+deo\b/i,
  /\bsudoper/i,
  /\bsilikon\b/i,
  /\blajsna\b/i,
  /\bsušač/i,
  /\btermostat\s+radni/i,
  /\bslavina\b/i,
  /\btu[sš]\s+kada/i,
  /\bventilator\b/i,
  /\bdržač\b/i,
  /\bpodni\s+kanal/i,
  /\bugradno\s+telo\b/i,
  /\bmetrica\s+ugradna/i,
  /^kanta\b/i,
  /\bkuke\s+za\s+bojler/i,
  /\bbaterija\b/i,
  /\bventil\b/i,
  /\bkukice\b/i,
  /\bpena\b/i,
  /\bruža\b/i,
  /\bmozaik\b/i,
  /\bpolica\b/i,
  /\bpisoar/i,
  /\bklizna\s+šipka\b/i,
  /\btracva\b/i,
  /\bugli[cć]\b/i,
  /\bpirenei\b/i,
  /\bpaffoni\b/i,
  /\bferro\b/i,
  /\bhansgrohe\b/i,
  /\brosan\s+(s2|klizna)\b/i,
  /\bemmevi\b/i,
  /\bpur\s+pena\b/i,
  /\bbeorol\b/i,
];

const BOILER_CATEGORIES = [
  "Vertikalni bojleri",
  "Horizontalni bojleri",
  "Protočni bojleri",
  "Bojleri za centralno grejanje",
  "Bojleri za kuhinju",
];

const BOILER_IN_NAME = /\bbojler/i;
const LITERS_IN_NAME = /\b\d{1,3}\s*l\b/i;
const INSTANT_HEATER = /\b\d+([.,]\d+)?\s*kw\b/i;
const INSTANT_BRANDS = /\b(clage|thermex|stiebel|aeg)\b/i;

function looksLikeTile(name) {
  if (/\bm2\b/i.test(name)) return true;
  if (/\bplo[cč]ic|\bkeramik|\bsunđer\s+za\s+plo[cč]/i.test(name)) return true;
  if (/\b(adz|andros|elegant\s+beige|nerva\s+gris|prissmacer)\b/i.test(name)) return true;
  // Dimenzije pločica (npr. 60x120), ne anoda 22x300
  const dim = name.match(/\b(\d{2,3})\s*[x×]\s*(\d{2,3})\b/i);
  if (dim) {
    const a = parseInt(dim[1], 10);
    const b = parseInt(dim[2], 10);
    if (a <= 120 && b <= 120) return true;
  }
  return false;
}

function looksLikeAccessory(name) {
  return ACCESSORY_IN_NAME.some((re) => re.test(name));
}

/**
 * Da li proizvod pripada katalogu bojlera.
 */
function looksLikeInstantHeater(name, category) {
  if (category !== "Protočni bojleri") return false;
  return INSTANT_HEATER.test(name) || INSTANT_BRANDS.test(name);
}

export function isBoilerCatalogProduct({ name, category = "" }) {
  const n = (name || "").trim();
  if (!n) return false;
  if (looksLikeTile(n)) return false;
  if (looksLikeAccessory(n)) return false;
  if (BOILER_IN_NAME.test(n)) return true;
  if (LITERS_IN_NAME.test(n)) return true;
  if (looksLikeInstantHeater(n, category)) return true;
  if (BOILER_CATEGORIES.includes(category) && /\b(termorad|ariston|gorenje|electrolux|metalac|tesy|elit|quadro)\b/i.test(n)) {
    return true;
  }

  return false;
}

/** Bojleri + prateći program (rezervni delovi), bez pločica. */
export function isCatalogProduct(product) {
  const { name, category = "" } = product;
  const n = (name || "").trim();
  if (!n) return false;
  if (category === "Prateći program") return !looksLikeTile(n);
  return isBoilerCatalogProduct(product);
}