import type { StoreCategoryDto } from "@features/market/Dtos/storeCatalogTypes";

function categoryChildrenMap(
  categories: StoreCategoryDto[],
): Map<string | null, StoreCategoryDto[]> {
  const byParent = new Map<string | null, StoreCategoryDto[]>();
  for (const c of categories) {
    const p = c.parentCategoryId ?? null;
    const list = byParent.get(p) ?? [];
    list.push(c);
    byParent.set(p, list);
  }
  return byParent;
}

/** Profundidad desde la raíz del árbol de catálogo (raíz = 0). */
export function depthFromRoot(
  categoryId: string,
  categories: StoreCategoryDto[],
): number {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let d = 0;
  let cur: string | null | undefined = categoryId;
  while (cur) {
    const node = byId.get(cur);
    if (!node) break;
    const p = node.parentCategoryId ?? null;
    if (!p) return d;
    d += 1;
    cur = p;
  }
  return d;
}

/** Raíz que contiene esta categoría (o la propia si ya es raíz). */
export function rootAncestorId(
  categoryId: string,
  categories: StoreCategoryDto[],
): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let cur: string | undefined = categoryId;
  while (cur) {
    const node = byId.get(cur);
    if (!node) return categoryId;
    const p = node.parentCategoryId ?? null;
    if (!p) return cur;
    cur = p;
  }
  return categoryId;
}

/**
 * Hojas del subárbol bajo una raíz: enlaces finales del menú (sin niveles intermedios).
 * Si la raíz solo tiene hijos hoja, devuelve esos hijos.
 */
export function leafDescendantsUnderRoot(
  rootId: string,
  categories: StoreCategoryDto[],
): StoreCategoryDto[] {
  const byParent = categoryChildrenMap(categories);

  function leavesUnder(id: string): StoreCategoryDto[] {
    const kids = byParent.get(id) ?? [];
    if (kids.length === 0) {
      const self = categories.find((x) => x.id === id);
      return self ? [self] : [];
    }
    return kids.flatMap((k) => leavesUnder(k.id));
  }

  const top = byParent.get(rootId) ?? [];
  const leaves = top.flatMap((k) => leavesUnder(k.id));
  return [...leaves].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * Elige qué id de hoja del menú corresponde al producto (varios `categoryIds` posibles).
 * Prefiere la categoría candidata con mayor profundidad en el árbol.
 */
export function pickLeafCategoryForProduct(
  productCategoryIds: readonly string[],
  leafIds: ReadonlySet<string>,
  categories: StoreCategoryDto[],
): string | null {
  const candidates = productCategoryIds.filter((id) => leafIds.has(id));
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  let bestDepth = depthFromRoot(best, categories);
  for (let i = 1; i < candidates.length; i++) {
    const id = candidates[i]!;
    const d = depthFromRoot(id, categories);
    if (d > bestDepth) {
      best = id;
      bestDepth = d;
    }
  }
  return best;
}
