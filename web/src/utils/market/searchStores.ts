import type { StoreBadge } from "../../app/store/marketStoreTypes";
import { apiFetch } from "../http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "../http/apiErrorMessage";

export type StoreSearchParams = {
  name?: string;
  category?: string;
  /** Centro del usuario (WGS84). */
  lat?: number;
  lng?: number;
  /** Radio en km. Requiere lat/lng. */
  km?: number;
  limit?: number;
  /** Desplazamiento para paginación (0 = primera página). */
  offset?: number;
};

export type StoreSearchItem = {
  store: StoreBadge;
  publishedProducts: number;
  publishedServices: number;
  distanceKm?: number | null;
};

export type StoreSearchPageResult = {
  items: StoreSearchItem[];
  totalCount: number;
  offset: number;
  limit: number;
};

type StoreSearchResponseJson = {
  items?: StoreSearchItem[];
  totalCount?: number;
  offset?: number;
  limit?: number;
};

export async function searchStores(
  params: StoreSearchParams,
): Promise<StoreSearchPageResult> {
  const qs = new URLSearchParams();
  if (params.name) qs.set("name", params.name);
  if (params.category) qs.set("category", params.category);
  if (typeof params.lat === "number") qs.set("lat", String(params.lat));
  if (typeof params.lng === "number") qs.set("lng", String(params.lng));
  if (typeof params.km === "number") qs.set("km", String(params.km));
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params.offset === "number" && params.offset > 0) {
    qs.set("offset", String(params.offset));
  }

  const res = await apiFetch(`/api/v1/market/stores/search?${qs.toString()}`);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
  const json = (await res.json()) as StoreSearchResponseJson;
  const items = Array.isArray(json.items) ? json.items : [];
  const totalCount =
    typeof json.totalCount === "number" ? json.totalCount : items.length;
  const offset = typeof json.offset === "number" ? json.offset : 0;
  let limit = 40;
  if (typeof json.limit === "number") limit = json.limit;
  else if (typeof params.limit === "number") limit = params.limit;
  return { items, totalCount, offset, limit };
}
