import type { StoreScreen } from "./storePageTypes";

export function uniqueSorted(cats: string[]): string[] {
  return [...new Set(cats.map((c) => c.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function screenFromPathname(
  pathname: string,
  storeId: string,
): StoreScreen {
  const base = `/store/${storeId}`;
  if (!pathname.startsWith(base)) return "catalog";
  const tail = pathname.slice(base.length);
  if (tail === "" || tail === "/") return "catalog";
  if (tail === "/vitrina") return "vitrina";
  if (tail === "/products") return "products";
  if (tail === "/services") return "services";
  return "catalog";
}
