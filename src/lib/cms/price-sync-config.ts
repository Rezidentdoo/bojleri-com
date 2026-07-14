import "server-only";

/** Automatsko povlačenje cena sa Aqualand-a (isključeno — cene se ručno unose u CMS/Excel). */
export function isAutoPriceSyncEnabled(): boolean {
  return process.env.PRICE_SYNC_ENABLED === "true";
}

export const PRICE_SYNC_DISABLED_MESSAGE =
  "Automatsko ažuriranje cena je isključeno. Cene se menjaju ručno u CMS-u ili Excel uploadom.";