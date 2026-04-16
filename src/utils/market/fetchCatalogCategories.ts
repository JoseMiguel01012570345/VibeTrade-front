import { apiFetch } from "../http/apiClient";

export type CatalogCategoriesJson = {
  categories: string[];
};

/** GET /api/v1/market/catalog-categories */
export async function fetchCatalogCategories(): Promise<string[]> {
  const res = await apiFetch("/api/v1/market/catalog-categories");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `catalog-categories ${res.status}`);
  }
  const json = (await res.json()) as CatalogCategoriesJson;
  const list = json.categories;
  return Array.isArray(list)
    ? list.filter((c) => typeof c === "string" && c.trim().length > 0)
    : [];
}
