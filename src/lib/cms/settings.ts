import { unstable_cache } from "next/cache";
import { readSiteSettings } from "@/lib/cms/store";

export const getSiteSettings = unstable_cache(
  async () => readSiteSettings(),
  ["cms-site-settings"],
  { revalidate: 300, tags: ["site-settings"] }
);