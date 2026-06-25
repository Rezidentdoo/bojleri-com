import { revalidateTag } from "next/cache";

export function revalidateProducts(): void {
  revalidateTag("products", "max");
  revalidateTag("site-settings", "max");
}