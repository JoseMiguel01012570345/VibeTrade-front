import type {
  MerchandiseCondition,
  MerchandiseLine,
  ServiceItem,
} from "./tradeAgreementTypes";
import { emptyMerchandiseLine } from "./tradeAgreementTypes";

/** Archivo adjunto en un campo personalizado (URL de objeto o https persistente). */
export type StoreCustomAttachment = {
  id: string;
  url: string;
  fileName: string;
  /** image | pdf | other */
  kind: "image" | "pdf" | "other";
};

/** Campo libre con adjuntos (fotos / documentos + texto embebido) — flow-ui. */
export type StoreCustomField = {
  title: string;
  body: string;
  /** Leyenda opcional junto a los adjuntos */
  attachmentNote?: string;
  attachments?: StoreCustomAttachment[];
};

export type StoreProduct = {
  id: string;
  storeId: string;
  category: string;
  name: string;
  model?: string;
  shortDescription: string;
  mainBenefit: string;
  technicalSpecs: string;
  condition: MerchandiseCondition;
  price: string;
  /**
   * Si el transporte está incluido en la compra de este producto (según ficha).
   * Campo nuevo: puede faltar en productos antiguos hasta que se editen.
   */
  transportIncluded?: boolean;
  /** Moneda en la que está expresado el precio (una sola); opcional. */
  monedaPrecio?: string;
  /** Códigos de moneda aceptados (p. ej. USD, CUP); opcional. */
  monedas?: string[];
  /** @deprecated Persistencia antigua; preferir `monedas`. */
  moneda?: string;
  /** Impuestos, envío o instalación — texto según flow-ui */
  taxesShippingInstall?: string;
  availability: string;
  warrantyReturn: string;
  contentIncluded: string;
  usageConditions: string;
  photoUrls: string[];
  /** Si es true, la ficha aparece en la vitrina pública de la tienda y puede anclarse en acuerdos como catálogo publicado. */
  published: boolean;
  /** Enriquecido en detalle de tienda (API). */
  publicCommentCount?: number;
  offerLikeCount?: number;
  viewerLikedOffer?: boolean;
  customFields: StoreCustomField[];
};

export type StoreService = {
  id: string;
  storeId: string;
  /** Si es `false`, la ficha no aparece en la vitrina pública de la tienda. Si falta, se trata como publicada. */
  published?: boolean;
  category: string;
  tipoServicio: string;
  /** Códigos de moneda aceptados (p. ej. USD, CUP); opcional. */
  monedas?: string[];
  /** @deprecated Persistencia antigua; preferir `monedas`. */
  moneda?: string;
  descripcion: string;
  riesgos: { enabled: boolean; items: string[] };
  incluye: string;
  noIncluye: string;
  dependencias: { enabled: boolean; items: string[] };
  entregables: string;
  garantias: { enabled: boolean; texto: string };
  propIntelectual: string;
  /** Imágenes de la ficha (mismo contrato que productos). */
  photoUrls?: string[];
  /** Enriquecido en detalle de tienda (API). */
  publicCommentCount?: number;
  offerLikeCount?: number;
  viewerLikedOffer?: boolean;
  customFields: StoreCustomField[];
};

/** Catálogo configurado para una tienda (demo / futura persistencia). */
export type StoreCatalog = {
  /** Texto: qué categorías de productos y servicios ofrece la tienda */
  pitch: string;
  joinedAt: number;
  products: StoreProduct[];
  services: StoreService[];
};

/**
 * Pone primero el ítem cuyo `id` coincide con el del anuncio/origen (p. ej. `Thread.offerId`).
 */
export function sortCatalogItemsByContextId<T extends { id: string }>(
  items: T[],
  preferredId: string | undefined | null,
): T[] {
  if (!preferredId) return items;
  const i = items.findIndex((x) => x.id === preferredId);
  if (i <= 0) return items;
  const pick = items[i];
  if (pick === undefined) return items;
  return [pick, ...items.filter((_, j) => j !== i)];
}

function norm(s: string): string {
  return s.trim();
}

/** Lista normalizada de monedas de ficha (soporta `monedas` o `moneda` legado). */
export function catalogMonedasList(item: {
  monedas?: string[];
  moneda?: string;
}): string[] {
  const raw = item.monedas;
  if (Array.isArray(raw) && raw.length > 0) {
    const u = [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))];
    u.sort((a, b) => a.localeCompare(b, "es"));
    return u;
  }
  const legacy = typeof item.moneda === "string" ? item.moneda.trim() : "";
  return legacy ? [legacy] : [];
}

/**
 * Incluye la moneda del precio en la lista de monedas aceptadas si aún no está
 * (misma moneda ignorando mayúsculas). Útil al elegir «tipo de moneda» del producto.
 */
export function mergeMonedaPrecioIntoMonedas(
  monedas: string[] | undefined,
  monedaPrecio: string | undefined,
): string[] {
  const mp = typeof monedaPrecio === "string" ? monedaPrecio.trim() : "";
  const base = [...(monedas ?? [])]
    .map((x) => String(x).trim())
    .filter(Boolean);
  if (!mp) {
    const u = [...new Set(base)];
    u.sort((a, b) => a.localeCompare(b, "es"));
    return u;
  }
  const up = mp.toUpperCase();
  const next = base.some((c) => c.toUpperCase() === up) ? base : [...base, mp];
  const u = [...new Set(next)];
  u.sort((a, b) => a.localeCompare(b, "es"));
  return u;
}

/**
 * Quita la moneda del precio de la selección del multiselect para obtener solo lo elegido
 * explícitamente (la moneda del precio se vuelve a unir al mostrar).
 */
export function stripMonedaPrecioFromSelection(
  selected: string[],
  monedaPrecio: string | undefined,
): string[] {
  const mp = typeof monedaPrecio === "string" ? monedaPrecio.trim() : "";
  const base = [
    ...new Set(selected.map((x) => String(x).trim()).filter(Boolean)),
  ];
  if (!mp) {
    base.sort((a, b) => a.localeCompare(b, "es"));
    return base;
  }
  const up = mp.toUpperCase();
  const next = base.filter((c) => c.toUpperCase() !== up);
  next.sort((a, b) => a.localeCompare(b, "es"));
  return next;
}

/** Monedas aceptadas en ítem de servicio del acuerdo (array persistido o texto en `moneda`, p. ej. "USD, CUP"). */
export function serviceItemAcceptedMonedas(sv: {
  monedasAceptadas?: string[];
  moneda: string;
}): string[] {
  const raw = sv.monedasAceptadas;
  if (Array.isArray(raw) && raw.length > 0) {
    const u = [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))];
    u.sort((a, b) => a.localeCompare(b, "es"));
    return u;
  }
  const m = typeof sv.moneda === "string" ? sv.moneda.trim() : "";
  if (!m) return [];
  if (m.includes(",")) {
    const u = [
      ...new Set(
        m
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ];
    u.sort((a, b) => a.localeCompare(b, "es"));
    return u;
  }
  return [m];
}

function catalogMonedasMerchandiseString(item: {
  monedas?: string[];
  moneda?: string;
}): string {
  return catalogMonedasList(item).join(", ");
}

function pickLine(a: string, b: string): string {
  return norm(a) !== "" ? a : b;
}

function appendDetailBlock(base: string, title: string, body: string): string {
  const t = norm(body);
  if (!t) return base;
  const prefix = norm(base);
  const chunk = `${title}\n${t}`;
  if (!prefix) return chunk;
  if (prefix.includes(t)) return base;
  return `${prefix}\n\n${chunk}`;
}

/** Valores por defecto del acuerdo inferidos desde la ficha de producto de la tienda. */
export function storeProductToMerchandiseDefaults(
  p: StoreProduct,
): MerchandiseLine {
  const tipo = [p.name, p.model].filter(Boolean).join(" — ");

  const monedaLine =
    norm(p.monedaPrecio ?? "") !== ""
      ? (p.monedaPrecio ?? "").trim()
      : catalogMonedasMerchandiseString(p);

  return {
    ...emptyMerchandiseLine(),
    tipo,
    cantidad: "",
    valorUnitario: p.price,
    moneda: monedaLine,
    estado: p.condition,
    impuestos: p.taxesShippingInstall ?? "",
    devolucionesDesc: p.warrantyReturn,
    tipoEmbalaje: "",
    /** Solo lo completa el comprador en el acuerdo; la ficha se muestra aparte. */
    regulaciones: "",
  };
}

/**
 * Fusión para el acuerdo: lo ya cargado en la línea del acuerdo tiene prioridad;
 * lo vacío se completa desde la ficha del catálogo (flow-ui).
 */
export function mergeMerchandiseLineWithStoreProduct(
  line: MerchandiseLine,
  p: StoreProduct,
): MerchandiseLine {
  const def = storeProductToMerchandiseDefaults(p);
  const sameLink = line.linkedStoreProductId === p.id;
  const merged: MerchandiseLine = {
    ...line,
    linkedStoreProductId: p.id,
    tipo: pickLine(line.tipo, def.tipo),
    cantidad: pickLine(line.cantidad, def.cantidad),
    valorUnitario: pickLine(line.valorUnitario, def.valorUnitario),
    estado: sameLink ? line.estado : p.condition,
    descuento: pickLine(line.descuento, def.descuento),
    impuestos: pickLine(line.impuestos, def.impuestos),
    moneda: pickLine(line.moneda, def.moneda),
    tipoEmbalaje: pickLine(line.tipoEmbalaje, def.tipoEmbalaje),
    devolucionesDesc: pickLine(line.devolucionesDesc, def.devolucionesDesc),
    devolucionQuienPaga: pickLine(
      line.devolucionQuienPaga,
      def.devolucionQuienPaga,
    ),
    devolucionPlazos: pickLine(line.devolucionPlazos, def.devolucionPlazos),
    /** A cargo del comprador; no se mezcla con el texto de la ficha. */
    regulaciones: line.regulaciones,
  };

  if (norm(p.availability) && !norm(merged.cantidad)) {
    merged.cantidad = p.availability;
  }

  return merged;
}

function mergeListBlock(
  enabled: boolean,
  items: string[],
  catalog: { enabled: boolean; items: string[] },
): { enabled: boolean; items: string[] } {
  if (enabled && items.length > 0) return { enabled, items };
  const catItems = catalog.enabled ? catalog.items : [];
  if (catItems.length > 0) return { enabled: true, items: catItems };
  return { enabled: false, items: [] };
}

function mergeGarantias(
  g: ServiceItem["garantias"],
  catalog: StoreService["garantias"],
): ServiceItem["garantias"] {
  if (g.enabled && norm(g.texto)) return g;
  if (catalog.enabled && norm(catalog.texto))
    return { enabled: true, texto: catalog.texto };
  if (norm(g.texto)) return { enabled: true, texto: g.texto };
  return { enabled: false, texto: "" };
}

/** Fusión servicio del acuerdo + ficha de servicio de la tienda (horarios y pagos del acuerdo se conservan). */
export function mergeServiceItemWithStoreService(
  item: ServiceItem,
  s: StoreService,
): ServiceItem {
  const catMonedas = catalogMonedasList(s);
  const fromItem =
    item.monedasAceptadas && item.monedasAceptadas.length > 0
      ? item.monedasAceptadas
      : serviceItemAcceptedMonedas(item).length > 0
        ? serviceItemAcceptedMonedas(item)
        : undefined;
  const mergedMonedas =
    fromItem && fromItem.length > 0
      ? fromItem
      : catMonedas.length > 0
        ? catMonedas
        : undefined;
  const next: ServiceItem = {
    ...item,
    linkedStoreServiceId: s.id,
    tipoServicio: pickLine(item.tipoServicio, s.tipoServicio),
    descripcion: pickLine(item.descripcion, s.descripcion),
    incluye: pickLine(item.incluye, s.incluye),
    noIncluye: pickLine(item.noIncluye, s.noIncluye),
    entregables: pickLine(item.entregables, s.entregables),
    propIntelectual: pickLine(item.propIntelectual, s.propIntelectual),
    monedasAceptadas: mergedMonedas,
    moneda: pickLine(item.moneda, catalogMonedasMerchandiseString(s)),
    riesgos: mergeListBlock(
      item.riesgos.enabled,
      item.riesgos.items,
      s.riesgos,
    ),
    dependencias: mergeListBlock(
      item.dependencias.enabled,
      item.dependencias.items,
      s.dependencias,
    ),
    garantias: mergeGarantias(item.garantias, s.garantias),
  };

  if (
    norm(item.descripcion) !== "" &&
    norm(s.descripcion) !== "" &&
    item.descripcion !== s.descripcion
  ) {
    next.descripcion = appendDetailBlock(
      item.descripcion,
      "Descripción en catálogo",
      s.descripcion,
    );
  }

  const extra = s.customFields
    .map((f) => {
      if (!norm(f.title)) return "";
      const att = f.attachments?.length
        ? ` [Adjuntos: ${f.attachments.map((a) => a.fileName).join(", ")}]`
        : "";
      return `${f.title}: ${f.body}${att}`;
    })
    .filter(Boolean)
    .join("\n");
  if (extra) {
    next.descripcion = appendDetailBlock(
      next.descripcion,
      "Campos adicionales (catálogo)",
      extra,
    );
  }

  return next;
}

export function findStoreProduct(
  catalog: StoreCatalog | undefined,
  id: string | undefined,
): StoreProduct | undefined {
  if (!catalog || !id) return undefined;
  return catalog.products.find((p) => p.id === id);
}

export function findStoreService(
  catalog: StoreCatalog | undefined,
  id: string | undefined,
): StoreService | undefined {
  if (!catalog || !id) return undefined;
  return catalog.services.find((x) => x.id === id);
}

/**
 * Tras `fetchStoreDetail`, conserva en memoria ítems que aún no están en la respuesta del servidor
 * (p. ej. alta reciente antes de que termine el PUT del workspace).
 */
export function mergeStoreCatalogWithLocalExtras(
  existing: StoreCatalog | undefined,
  incoming: StoreCatalog,
): StoreCatalog {
  if (!existing) return incoming;
  const inProductIds = new Set(incoming.products.map((p) => p.id));
  const inServiceIds = new Set(incoming.services.map((s) => s.id));
  const extraProducts = existing.products.filter(
    (p) => !inProductIds.has(p.id),
  );
  const extraServices = existing.services.filter(
    (s) => !inServiceIds.has(s.id),
  );
  if (extraProducts.length === 0 && extraServices.length === 0) return incoming;
  return {
    ...incoming,
    products: [...incoming.products, ...extraProducts],
    services: [...incoming.services, ...extraServices],
  };
}

/** Valores iniciales del formulario de producto (perfil / ficha). */
export function emptyStoreProductInput(): Omit<StoreProduct, "id" | "storeId"> {
  return {
    category: "",
    name: "",
    model: "",
    shortDescription: "",
    mainBenefit: "",
    technicalSpecs: "",
    condition: "nuevo",
    price: "",
    monedaPrecio: "",
    monedas: [],
    taxesShippingInstall: "",
    availability: "",
    warrantyReturn: "",
    contentIncluded: "",
    usageConditions: "",
    photoUrls: [],
    published: false,
    customFields: [],
  };
}

/** Valores iniciales del formulario de servicio (perfil / ficha). */
export function emptyStoreServiceInput(): Omit<StoreService, "id" | "storeId"> {
  return {
    published: false,
    category: "",
    tipoServicio: "",
    monedas: [],
    descripcion: "",
    riesgos: { enabled: false, items: [] },
    incluye: "",
    noIncluye: "",
    dependencias: { enabled: false, items: [] },
    entregables: "",
    garantias: { enabled: false, texto: "" },
    propIntelectual: "",
    photoUrls: [],
    customFields: [],
  };
}
