import type { StoreCategoryDto } from "@features/market/Dtos/storeCatalogTypes";
import { slugifyCategoryName } from "./categoryUtils";

/** Asigna slugs únicos por nombre (colisiones → sufijo -2, -3…). */
export function assignUniqueCategorySlugs(
  categories: StoreCategoryDto[],
): Map<string, string> {
  const used = new Set<string>();
  const idToSlug = new Map<string, string>();
  const sorted = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  for (const c of sorted) {
    const base = slugifyCategoryName(c.name);
    let slug = base;
    let i = 2;
    while (used.has(slug)) {
      slug = `${base}-${i}`;
      i += 1;
    }
    used.add(slug);
    idToSlug.set(c.id, slug);
  }
  return idToSlug;
}
