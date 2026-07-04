import type { MerchandiseCondition } from "./merchandiseCondition";

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
  nombreServicio: string;
  /** Precio fijo en checkout (USD). */
  fixedPrice?: number;
  /** Moneda del precio fijo; siempre USD. */
  currencyCode?: string;
  /** Mes (1–12) de la única recurrencia del contrato. */
  recurrenceMonth?: number;
  /** Día (1–31) de la única recurrencia del contrato. */
  recurrenceDay?: number;
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
