/** Coincidencia por subcadena (sin distinguir mayúsculas). */
export function matchesNameQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.trim().toLowerCase().includes(q);
}

/** Si `category` está vacío, no filtra por categoría. */
export function matchesCategoryFilter(
  itemCategory: string,
  selectedCategory: string,
): boolean {
  const s = selectedCategory.trim();
  if (!s) return true;
  return itemCategory.trim() === s;
}
