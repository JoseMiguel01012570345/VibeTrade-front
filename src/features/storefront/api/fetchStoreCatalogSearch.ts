import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "@shared/services/http/apiErrorMessage";
import type { StoreProduct, StoreService } from "@features/market/logic/storeCatalogTypes";

export type StoreCatalogSearchResponse = {
  products: StoreProduct[];
  services: StoreService[];
};

export async function fetchStoreCatalogSearch(
  storeId: string,
  query: string,
): Promise<StoreCatalogSearchResponse> {
  const q = query.trim();
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/catalog/search${suffix}`,
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
  const json = (await res.json()) as {
    products?: StoreProduct[];
    services?: StoreService[];
  };
  return {
    products: json.products ?? [],
    services: json.services ?? [],
  };
}

export const storeCatalogSearchQueryKey = (storeId: string, query: string) =>
  ["store-catalog-search", storeId, query.trim()] as const;
