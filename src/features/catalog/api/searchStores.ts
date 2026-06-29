import type {
  CatalogSearchItem,
  CatalogSearchKind,
  CatalogSearchPageResult,
  StoreSearchParams,
} from "../Dtos/catalogSearchTypes";
import { parseCatalogItem } from "../logic/catalogSearchParsing";
import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "@shared/services/http/apiErrorMessage";

type CatalogSearchResponseJson = {
  items?: unknown[];
  hasMore?: boolean;
  offset?: number;
  limit?: number;
};

type CatalogAutocompleteResponseJson = {
  suggestions?: unknown;
};

/** Búsqueda unificada: tiendas, productos, servicios y hojas de ruta (`GET .../market/stores/search`). */
export async function searchCatalog(
  params: StoreSearchParams,
): Promise<CatalogSearchPageResult> {
  const qs = new URLSearchParams();
  setIfTruthy(qs, "name", params.name);
  setIfTruthy(qs, "category", params.category);
  if (params.kinds?.length) qs.set("kinds", params.kinds.join(","));
  setIfNumber(qs, "trustMin", params.trustMin);
  setIfNumber(qs, "lat", params.lat);
  setIfNumber(qs, "lng", params.lng);
  setIfNumber(qs, "km", params.km);
  setIfNumber(qs, "limit", params.limit);
  if (typeof params.offset === "number" && params.offset > 0)
    qs.set("offset", String(params.offset));

  const res = await apiFetch(`/api/v1/market/stores/search?${qs.toString()}`);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
  const json = (await res.json()) as CatalogSearchResponseJson;
  const rawItems = Array.isArray(json.items) ? json.items : [];
  const items: CatalogSearchItem[] = [];
  for (const r of rawItems) {
    const it = parseCatalogItem(r);
    if (it) items.push(it);
  }
  const hasMore = json.hasMore === true;
  const offset = typeof json.offset === "number" ? json.offset : 0;
  let limit = 40;
  if (typeof json.limit === "number") limit = json.limit;
  else if (typeof params.limit === "number") limit = params.limit;
  return { items, hasMore, offset, limit };
}

/** Autocomplete público para el input de búsqueda (tiendas + ofertas publicadas). */
export async function fetchCatalogAutocomplete(
  q: string,
  opts?: { kinds?: CatalogSearchKind[]; categories?: string[] },
  limit = 10,
): Promise<string[]> {
  const qs = new URLSearchParams();
  qs.set("q", q);
  qs.set("limit", String(limit));
  if (opts?.kinds?.length) qs.set("kinds", opts.kinds.join(","));
  if (opts?.categories?.length) qs.set("category", opts.categories.join(","));
  const res = await apiFetch(
    `/api/v1/market/stores/autocomplete?${qs.toString()}`,
  );
  if (!res.ok) return [];
  const json = (await res.json()) as CatalogAutocompleteResponseJson;
  const raw = (json as Record<string, unknown>)?.suggestions;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) out.push(x.trim());
  }
  return out;
}

function setIfTruthy(qs: URLSearchParams, k: string, v: unknown): void {
  if (typeof v === "string" && v) qs.set(k, v);
}

function setIfNumber(qs: URLSearchParams, k: string, v: unknown): void {
  if (typeof v === "number") qs.set(k, String(v));
}
