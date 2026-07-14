import { revalidatePath, revalidateTag } from "next/cache";

export function revalidateProducts(): void {
  revalidateTag("products", { expire: 0 });
  revalidateTag("site-settings", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/katalog");
}

export function revalidateIfChanged(changed: boolean): void {
  if (changed) revalidateProducts();
}