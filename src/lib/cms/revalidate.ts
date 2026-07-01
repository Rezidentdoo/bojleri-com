import { revalidateTag } from "next/cache";

export function revalidateProducts(): void {
  revalidateTag("products", "max");
  revalidateTag("site-settings", "max");
}

export function revalidateIfChanged(changed: boolean): void {
  if (changed) revalidateProducts();
}