import type {
  StoreScreen,
  StoreSectionFilters,
} from "./storePageTypes";

/** Ajusta rango de precio al máximo del slider de esa sección (sin mezclar con otras vistas). */
export function clampStoreSectionPriceRange(
  f: StoreSectionFilters,
  sliderMax: number,
): StoreSectionFilters {
  if (sliderMax <= 0) {
    return { ...f, priceFloor: null, priceCeiling: null };
  }
  const floor =
    f.priceFloor == null || f.priceFloor < 0
      ? 0
      : f.priceFloor > sliderMax
        ? 0
        : f.priceFloor;
  const ceiling =
    f.priceCeiling == null || f.priceCeiling > sliderMax ? sliderMax : f.priceCeiling;
  return { ...f, priceFloor: floor, priceCeiling: ceiling };
}

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
