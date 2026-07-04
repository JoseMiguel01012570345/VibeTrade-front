/** Familia (categoría) para los carruseles de categorías (por tienda). */
export type CategoryMeta = { id: string; label: string; slug: string };

/** A qué catálogo pertenece la página de categoría. */
export type CategoryKind = "product" | "service";

export type SortMode = "price-asc" | "price-desc" | "name-asc" | "name-desc";
