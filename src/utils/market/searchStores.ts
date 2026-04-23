import type {
  EmergentRouteParadaSnapshot,
  StoreBadge,
} from "../../app/store/marketStoreTypes";
import { apiFetch } from "../http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "../http/apiErrorMessage";

export type CatalogSearchKind = "store" | "product" | "service" | "emergent";

export type CatalogOfferPreview = {
  id: string;
  kind: "product" | "service" | "emergent";
  name?: string;
  category?: string;
  price?: string;
  currency?: string | null;
  acceptedCurrencies: string[];
  photoUrls?: string[];
  tipoServicio?: string;
  shortDescription?: string;
  descripcion?: string;
  /** Solo emergentes: tramos para el mismo mapa que en el feed. */
  emergentRouteParadas?: EmergentRouteParadaSnapshot[];
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
  hasMore: boolean;
  offset: number;
  limit: number;
};

type CatalogAutocompleteResponseJson = {
  suggestions?: unknown;
};

export type StoreSearchParams = {
  name?: string;
  category?: string;
  kinds?: CatalogSearchKind[];
  trustMin?: number;
  lat?: number;
  lng?: number;
  km?: number;
  limit?: number;
  offset?: number;
};

type CatalogSearchResponseJson = {
  items?: unknown[];
  hasMore?: boolean;
  offset?: number;
  limit?: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** Oferta a veces llega como string JSON; el backend antiguo podía deformar nodos anidados. */
function offerRecordFromUnknown(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    try {
      return asRecord(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
  return asRecord(raw);
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
  if (typeof o.pitch === "string" && o.pitch.trim()) badge.pitch = o.pitch.trim();
  const rec = o as Record<string, unknown>;
  let web = "";
  if (typeof o.websiteUrl === "string") web = o.websiteUrl;
  else if (typeof rec.WebsiteUrl === "string") web = rec.WebsiteUrl;
  if (web.trim()) badge.websiteUrl = web.trim();
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

function stringField(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function coordField(r: Record<string, unknown>, ...keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Segmentos de texto: saltos de línea o trozos separados por « · » (resumen backend RouteSummaryLine). */
function splitRouteDescriptionSegments(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const byNl = t
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (byNl.length > 1) return byNl;
  // Un solo bloque: "mercancía · A → B · C → D"
  return t
    .split(/\s*\u00B7\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Tramos inferidos de líneas «origen → destino» o «origen -> destino» (p. ej. si el array no llegó en JSON). */
export function paradasFromRouteDescriptionText(
  text: string,
): EmergentRouteParadaSnapshot[] | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const legs: EmergentRouteParadaSnapshot[] = [];
  const pushPair = (a: string, b: string) => {
    const o = a.trim();
    const d = b.trim();
    if (o && d) legs.push({ origen: o, destino: d });
  };

  const trySplitLine = (line: string) => {
    const seps = [" → ", " -> ", " ⟶ ", " => ", "⟶"];
    for (const sep of seps) {
      const i = line.indexOf(sep);
      if (i >= 0) {
        pushPair(line.slice(0, i), line.slice(i + sep.length));
        return true;
      }
    }
    if (/→/.test(line)) {
      const p = line.split(/→/);
      if (p.length === 2) pushPair(p[0]!, p[1]!);
      return true;
    }
    const asciiArrow = line.match(/^(.+?)\s*->\s*(.+)$/);
    if (asciiArrow) {
      pushPair(asciiArrow[1]!, asciiArrow[2]!);
      return true;
    }
    return false;
  };

  const segments = splitRouteDescriptionSegments(t);
  for (const seg of segments) trySplitLine(seg);
  if (legs.length === 0) trySplitLine(t);

  return legs.length ? legs : undefined;
}

/**
 * Texto de vitrina sin el bloque de ruta (flechas / direcciones largas del snapshot).
 * Si solo había resumen de ruta, devuelve null.
 */
export function emergentSearchCardDescription(
  apiDescription: string | undefined,
): string | null {
  if (!apiDescription?.trim()) return null;
  const full = apiDescription.trim();
  const blocks = full
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length >= 2) {
    const tail = blocks.slice(1).join("\n\n").trim();
    return tail || null;
  }
  const lines = full.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const routeLineRe = /[→⟶]|(\s->\s)|(\s=>\s)/;
  const kept = lines.filter((l) => !routeLineRe.test(l));
  const joined = kept.join(" ").trim();
  return joined || null;
}

function parseEmergentRouteParadas(
  raw: unknown,
): EmergentRouteParadaSnapshot[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: EmergentRouteParadaSnapshot[] = [];
  for (const el of raw) {
    const r = asRecord(el);
    if (!r) continue;
    const origen = stringField(r, "origen", "Origen");
    const destino = stringField(r, "destino", "Destino");
    const oLa0 = coordField(r, "origenLat", "OrigenLat");
    const oLn0 = coordField(r, "origenLng", "OrigenLng");
    const dLa0 = coordField(r, "destinoLat", "DestinoLat");
    const dLn0 = coordField(r, "destinoLng", "DestinoLng");
    const hasCoords =
      oLa0 !== undefined ||
      oLn0 !== undefined ||
      dLa0 !== undefined ||
      dLn0 !== undefined;
    if (!origen && !destino && !hasCoords) continue;
    const row: EmergentRouteParadaSnapshot = {
      origen: origen || "—",
      destino: destino || "—",
    };
    if (oLa0 !== undefined)
      row.origenLat = typeof oLa0 === "number" ? String(oLa0) : oLa0;
    if (oLn0 !== undefined)
      row.origenLng = typeof oLn0 === "number" ? String(oLn0) : oLn0;
    if (dLa0 !== undefined)
      row.destinoLat = typeof dLa0 === "number" ? String(dLa0) : dLa0;
    if (dLn0 !== undefined)
      row.destinoLng = typeof dLn0 === "number" ? String(dLn0) : dLn0;
    const mon = stringField(r, "monedaPago", "MonedaPago");
    if (mon) row.monedaPago = mon;
    const precio = stringField(r, "precioTransportista", "PrecioTransportista");
    if (precio) row.precioTransportista = precio;
    out.push(row);
  }
  return out.length ? out : undefined;
}

function parseOfferPreview(
  raw: unknown,
  itemKind?: CatalogSearchKind,
): CatalogOfferPreview | null {
  const o = offerRecordFromUnknown(raw);
  if (!o) return null;
  const id =
    typeof o.id === "string"
      ? o.id
      : typeof o.Id === "string"
        ? o.Id
        : "";
  if (!id) return null;

  const isEmergent =
    o.isEmergentRoutePublication === true ||
    o.IsEmergentRoutePublication === true ||
    id.startsWith("emo_") ||
    itemKind === "emergent";

  if (isEmergent) {
    const out: CatalogOfferPreview = {
      id,
      kind: "emergent",
      acceptedCurrencies: [],
    };
    const title = o.title ?? o.Title;
    if (typeof title === "string" && title.trim()) out.name = title.trim();
    const img = o.imageUrl ?? o.ImageUrl;
    const photos: string[] = [];
    if (typeof img === "string" && img.trim()) photos.push(img.trim());
    const imgs = o.imageUrls ?? o.ImageUrls;
    if (Array.isArray(imgs)) {
      for (const x of imgs) {
        if (typeof x === "string" && x.trim()) photos.push(x.trim());
      }
    }
    if (photos.length) out.photoUrls = [...new Set(photos)];
    const rawDesc =
      typeof o.description === "string"
        ? o.description.trim()
        : typeof o.Description === "string"
          ? o.Description.trim()
          : "";
    if (rawDesc) {
      const forCard = emergentSearchCardDescription(rawDesc);
      if (forCard) out.shortDescription = forCard;
    }
    const cat = o.category ?? o.Category;
    if (typeof cat === "string" && cat.trim()) out.category = cat.trim();
    const pr = o.price ?? o.Price;
    if (typeof pr === "string" && pr.trim()) out.price = pr.trim();
    const paradasRaw = o.emergentRouteParadas ?? o.EmergentRouteParadas;
    let paradas = parseEmergentRouteParadas(paradasRaw);
    if (!paradas?.length && rawDesc) {
      paradas = paradasFromRouteDescriptionText(rawDesc);
    }
    if (paradas?.length) out.emergentRouteParadas = paradas;
    return out;
  }

  const kind = o.kind;
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
  if (
    kind !== "store" &&
    kind !== "product" &&
    kind !== "service" &&
    kind !== "emergent"
  )
    return null;
  const store = parseStoreBadge(o.store);
  if (!store) return null;
  const offerRaw = o.offer ?? o.Offer;
  const offer =
    offerRaw === null || offerRaw === undefined
      ? null
      : parseOfferPreview(offerRaw, kind);
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
