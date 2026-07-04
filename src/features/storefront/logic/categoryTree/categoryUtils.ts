/** Coincidencia insensible a mayúsculas / acentos con nombres de categoría del API. */
export function normalizeCategoryName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/** Segmento de URL estable por nombre de categoría (sin espacios ni caracteres raros). */
export function slugifyCategoryName(name: string): string {
  const n = normalizeCategoryName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return n.length > 0 ? n : "categoria";
}
