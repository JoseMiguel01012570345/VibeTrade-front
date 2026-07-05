import type { StoreCategoryDto } from "@features/market/Dtos/storeCatalogTypes";

export function categoryIdsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

export function categoryIsRoot(c: StoreCategoryDto): boolean {
  return !c.parentCategoryId;
}

export function childCategoriesOf(
  categories: StoreCategoryDto[],
  parentId: string,
): StoreCategoryDto[] {
  return categories
    .filter((c) => categoryIdsEqual(c.parentCategoryId, parentId))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function rootCategoriesOf(categories: StoreCategoryDto[]): StoreCategoryDto[] {
  return categories.filter(categoryIsRoot).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function isDuplicateCategoryName(
  categories: StoreCategoryDto[],
  name: string,
  parentCategoryId: string | null,
): boolean {
  const n = name.trim().toLowerCase();
  return categories.some(
    (c) =>
      c.name.trim().toLowerCase() === n &&
      (c.parentCategoryId ?? null) === parentCategoryId,
  );
}

export function categoryLabel(
  categories: StoreCategoryDto[],
  categoryId: string,
  subcategoryId: string,
): string {
  const main = categories.find((c) => categoryIdsEqual(c.id, categoryId));
  const sub = categories.find((c) => categoryIdsEqual(c.id, subcategoryId));
  if (main && sub) return `${main.name} › ${sub.name}`;
  if (main) return main.name;
  if (sub) return sub.name;
  return "—";
}
