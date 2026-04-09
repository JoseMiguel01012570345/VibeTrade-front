import type { StoreBadge } from "../../app/store/marketStoreTypes";
import type { VitrinaListMode } from "../../pages/store/storePageTypes";
import { apiFetch } from "../http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "../http/apiErrorMessage";

export type StoreSearchParams = {
  name?: string;
  category?: string;
  vitrinaMode?: VitrinaListMode;
  /** Centro del usuario (WGS84). */
  lat?: number;
  lng?: number;
  /** Radio en km. Requiere lat/lng. */
  km?: number;
  limit?: number;
};

export type StoreSearchItem = {
  store: StoreBadge;
  publishedProducts: number;
  publishedServices: number;
  distanceKm?: number | null;
};

export type StoreSearchResponse = {
  items: StoreSearchItem[];
};

export async function searchStores(params: StoreSearchParams): Promise<StoreSearchItem[]> {
  const qs = new URLSearchParams();
  if (params.name) qs.set("name", params.name);
  if (params.category) qs.set("category", params.category);
  if (params.vitrinaMode) qs.set("vitrinaMode", params.vitrinaMode);
  if (typeof params.lat === "number") qs.set("lat", String(params.lat));
  if (typeof params.lng === "number") qs.set("lng", String(params.lng));
  if (typeof params.km === "number") qs.set("km", String(params.km));
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));

  const res = await apiFetch(`/api/v1/market/stores/search?${qs.toString()}`);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
  const json = (await res.json()) as StoreSearchResponse;
  return Array.isArray(json.items) ? json.items : [];
}

