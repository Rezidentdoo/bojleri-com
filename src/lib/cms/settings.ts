import { unstable_cache } from "next/cache";
import { readSiteSettings } from "@/lib/cms/store";

export const getSiteSettings = unstable_cache(
  async () => readSiteSettings(),
  ["cms-site-settings"],
  { revalidate: 30, tags: ["site-settings"] }
);