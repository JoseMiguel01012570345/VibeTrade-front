import type { StoreBadge } from "../../app/store/marketStoreTypes";
import { apiFetch } from "../http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "../http/apiErrorMessage";

export type CatalogSearchKind = "store" | "product" | "service";

export type CatalogOfferPreview = {
  id: string;
  kind: "product" | "service";
  name?: string;
  category?: string;
  price?: string;
  currency?: string | null;
  acceptedCurrencies: string[];
  photoUrls?: string[];
  tipoServicio?: string;
  shortDescription?: string;
  descripcion?: string;
};

export type CatalogSearchItem = {
  kind: CatalogSearchKind;
  store: StoreBadge;
  offer?: CatalogOfferPreview | null;
  publishedProducts?: number | null;
  publishedServices?: number | null;
  distanceKm?: number | null;
};

export type CatalogSearchPageResult = {
  items: CatalogSearchItem[];
  totalCount: number;
  offset: number;
  limit: number;
};

export type StoreSearchParams = {
  name?: string;
  category?: string;
  kinds?: CatalogSearchKind[];
  lat?: number;
  lng?: number;
  km?: number;
  limit?: number;
  offset?: number;
};

type CatalogSearchResponseJson = {
  items?: unknown[];
  totalCount?: number;
  offset?: number;
  limit?: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string") out.push(x);
  }
  return out;
}

function parseStoreBadge(raw: unknown): StoreBadge | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = o.id;
  const name = o.name;
  if (typeof id !== "string" || typeof name !== "string") return null;
  const trustScore =
    typeof o.trustScore === "number" && Number.isFinite(o.trustScore)
      ? o.trustScore
      : 0;
  const badge: StoreBadge = {
    id,
    name,
    verified: Boolean(o.verified),
    categories: parseStringArray(o.categories),
    transportIncluded: Boolean(o.transportIncluded),
    trustScore,
  };
  if (typeof o.avatarUrl === "string") badge.avatarUrl = o.avatarUrl;
  if (typeof o.ownerUserId === "string") badge.ownerUserId = o.ownerUserId;
  const loc = asRecord(o.location);
  if (
    loc &&
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng)
  ) {
    badge.location = { lat: loc.lat, lng: loc.lng };
  }
  return badge;
}

function parseOfferPreview(raw: unknown): CatalogOfferPreview | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = o.id;
  const kind = o.kind;
  if (typeof id !== "string") return null;
  if (kind !== "product" && kind !== "service") return null;
  const out: CatalogOfferPreview = { id, kind, acceptedCurrencies: [] };
  if (typeof o.name === "string") out.name = o.name;
  if (typeof o.category === "string") out.category = o.category;
  if (typeof o.price === "string") out.price = o.price;
  if (typeof o.currency === "string") out.currency = o.currency;
  else if (o.currency === null) out.currency = null;
  const acc = o.acceptedCurrencies;
  const accArr = parseStringArray(acc);
  out.acceptedCurrencies = accArr;
  const photos = parseStringArray(o.photoUrls);
  if (photos.length) out.photoUrls = photos;
  if (typeof o.tipoServicio === "string") out.tipoServicio = o.tipoServicio;
  if (typeof o.shortDescription === "string")
    out.shortDescription = o.shortDescription;
  if (typeof o.descripcion === "string") out.descripcion = o.descripcion;
  return out;
}

function parseCatalogItem(raw: unknown): CatalogSearchItem | null {
  const o = asRecord(raw);
  if (!o) return null;
  const kind = o.kind;
  if (kind !== "store" && kind !== "product" && kind !== "service")
    return null;
  const store = parseStoreBadge(o.store);
  if (!store) return null;
  const offerRaw = o.offer;
  const offer =
    offerRaw === null || offerRaw === undefined
      ? null
      : parseOfferPreview(offerRaw);
  const publishedProducts = parseFiniteNumber(o.publishedProducts);
  const publishedServices = parseFiniteNumber(o.publishedServices);
  const distanceKm = parseFiniteNumber(o.distanceKm);
  return {
    kind,
    store,
    offer,
    publishedProducts,
    publishedServices,
    distanceKm,
  };
}

function parseFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Búsqueda unificada: tiendas, productos y servicios (`GET .../market/stores/search`). */
export async function searchCatalog(
  params: StoreSearchParams,
): Promise<CatalogSearchPageResult> {
  const qs = new URLSearchParams();
  setIfTruthy(qs, "name", params.name);
  setIfTruthy(qs, "category", params.category);
  if (params.kinds?.length) qs.set("kinds", params.kinds.join(","));
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
  const totalCount =
    typeof json.totalCount === "number" ? json.totalCount : items.length;
  const offset = typeof json.offset === "number" ? json.offset : 0;
  let limit = 40;
  if (typeof json.limit === "number") limit = json.limit;
  else if (typeof params.limit === "number") limit = params.limit;
  return { items, totalCount, offset, limit };
}

function setIfTruthy(qs: URLSearchParams, k: string, v: unknown): void {
  if (typeof v === "string" && v) qs.set(k, v);
}

function setIfNumber(qs: URLSearchParams, k: string, v: unknown): void {
  if (typeof v === "number") qs.set(k, String(v));
}
