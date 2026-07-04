import type { ReactNode } from "react";
import type { StoreCategoryDto } from "@features/market/Dtos/storeCatalogTypes";
import type { CategoryMeta } from "./categoryMeta";
import { assignUniqueCategorySlugs } from "./categorySlugs";
import { storeCategoryTileIcons } from "./storeCategoryTileIcons";

const DEFAULT_DESCRIPTION = "Explora productos en esta categoría.";

export function isRootCategory(c: StoreCategoryDto): boolean {
  return c.parentCategoryId == null || c.parentCategoryId === "";
}

function hashStringToNonNegative(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function categoryDtoToMeta(
  c: StoreCategoryDto,
  allCategories: StoreCategoryDto[],
  idToSlug: Map<string, string>,
  icons: ReactNode[],
): CategoryMeta {
  const n = Math.max(icons.length, 1);
  const roots = allCategories
    .filter(isRootCategory)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const rootIndex = roots.findIndex((r) => r.id === c.id);
  const iconIndex = rootIndex >= 0 ? rootIndex : hashStringToNonNegative(c.id);
  return {
    id: c.id,
    label: c.name,
    slug: idToSlug.get(c.id)!,
    description: DEFAULT_DESCRIPTION,
    icon: icons[iconIndex % n]!,
  };
}

export { assignUniqueCategorySlugs } from "./categorySlugs";

/** Metadatos solo para categorías raíz (tiles, menú lateral del offcanvas). */
export function buildGuestCategoryMetas(
  categories: StoreCategoryDto[],
  icons: ReactNode[] = storeCategoryTileIcons,
): CategoryMeta[] {
  const idToSlug = assignUniqueCategorySlugs(categories);
  const roots = categories
    .filter(isRootCategory)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return roots.map((c) => categoryDtoToMeta(c, categories, idToSlug, icons));
}

export function findGuestCategoryMetaBySlug(
  categories: StoreCategoryDto[],
  slug: string,
  icons: ReactNode[] = storeCategoryTileIcons,
): CategoryMeta | null {
  const idToSlug = assignUniqueCategorySlugs(categories);
  const match = categories.find((c) => idToSlug.get(c.id) === slug);
  if (!match) return null;
  return categoryDtoToMeta(match, categories, idToSlug, icons);
}

export function findGuestCategoryMetaById(
  categories: StoreCategoryDto[],
  id: string,
  icons: ReactNode[] = storeCategoryTileIcons,
): CategoryMeta | null {
  const match = categories.find((c) => c.id === id);
  if (!match) return null;
  const idToSlug = assignUniqueCategorySlugs(categories);
  return categoryDtoToMeta(match, categories, idToSlug, icons);
}
