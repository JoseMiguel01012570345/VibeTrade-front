import type {
  StoreCatalog,
  StoreProduct,
  StoreService,
} from "../../pages/chat/domain/storeCatalogTypes";
import type {
  TradeAgreement,
  TradeAgreementDraft,
} from "../../pages/chat/domain/tradeAgreementTypes";
import type {
  RouteSheet,
  RouteSheetCreatePayload,
  RouteSheetStatus,
} from "../../pages/chat/domain/routeSheetTypes";
import type { ChatMessageDto, ChatThreadDto } from "../../utils/chat/chatApi";

export type {
  TradeAgreement,
  TradeAgreementDraft,
} from "../../pages/chat/domain/tradeAgreementTypes";
export type {
  RouteSheet,
  RouteSheetCreatePayload,
  RouteSheetStatus,
  RouteStop,
} from "../../pages/chat/domain/routeSheetTypes";

/** Pin WGS84 (misma forma en workspace JSON y API). */
export type StoreLocationPoint = {
  lat: number;
  lng: number;
};

export type StoreBadge = {
  id: string;
  name: string;
  verified: boolean;
  categories: string[];
  transportIncluded: boolean;
  avatarUrl?: string;
  trustScore: number;
  /** Descripción corta del catálogo (pitch), alineada con `StoreRow.Pitch` / catálogo. */
  pitch?: string;
  /** Si existe, la tienda fue creada desde el perfil y solo ese usuario puede editarla. */
  ownerUserId?: string;
  /** Ubicación opcional mostrada en la ficha pública de la tienda. */
  location?: StoreLocationPoint;
};

/** Alta de tienda desde perfil (flow-ui: nombre, categorías, descripción, transporte). */
export type OwnerStoreFormValues = {
  name: string;
  categories: string[];
  categoryPitch: string;
  transportIncluded: boolean;
  /** Opcional: pin en mapa (OpenStreetMap). */
  location?: StoreLocationPoint;
};

/** Parcial permitido al actualizar tienda (incl. imagen de vitrina). */
export type OwnerStorePatch = Partial<
  OwnerStoreFormValues & { avatarUrl: string | null | undefined }
>;

export type StoreProductInput = Omit<StoreProduct, "id" | "storeId">;
export type StoreServiceInput = Omit<StoreService, "id" | "storeId">;

export type QAItem = {
  id: string;
  question: string;
  /** Misma cadena que `question` cuando viene del API nuevo. */
  text?: string;
  parentId?: string | null;
  askedBy: { id: string; name: string; trustScore: number };
  answeredBy?: { id: string; name: string; trustScore: number };
  answer?: string;
  /** Unix ms — cuándo se envió la consulta (persistido en JSON del backend). */
  createdAt?: number;
};

export type Offer = {
  id: string;
  storeId: string;
  title: string;
  price: string;
  /** Texto de vitrina: descripción corta (producto) o ficha de servicio. */
  description?: string;
  /**
   * Legado / demo: la ubicación de la oferta ya no viene del API (usar `stores[storeId].location`).
   */
  location?: string | StoreLocationPoint | null;
  tags: string[];
  imageUrl: string;
  /** Galería (mismas URLs que catálogo); la primera suele coincidir con imageUrl. */
  imageUrls?: string[];
  qa?: QAItem[];
};

export type ReplyQuote = {
  id: string;
  author: string;
  preview: string;
};

/** Transportistas asociados a la hoja de ruta en un hilo (demo / multicargo). */
export type ThreadChatCarrier = {
  id: string;
  name: string;
  phone: string;
  trustScore: number;
  vehicleLabel: string;
  tramoLabel: string;
};

/** Transportista asignado o pendiente de validación en un tramo de una oferta de ruta publicada. */
export type RouteOfferTramoAssignment = {
  status: "pending" | "confirmed";
  userId: string;
  displayName: string;
  phone: string;
  trustScore: number;
  vehicleLabel?: string;
};

export type RouteOfferTramoPublic = {
  stopId: string;
  orden: number;
  origenLine: string;
  destinoLine: string;
  /** Campos de la hoja publicada visibles al transportista antes de suscribirse. */
  cargaEnTramo?: string;
  tipoMercanciaCarga?: string;
  tipoMercanciaDescarga?: string;
  tipoVehiculoRequerido?: string;
  tiempoRecogidaEstimado?: string;
  tiempoEntregaEstimado?: string;
  precioTransportista?: string;
  notas?: string;
  requisitosEspeciales?: string;
  /** Teléfono por tramo en la hoja (vendedor o post-validación de suscripción). */
  telefonoTransportista?: string;
  assignment?: RouteOfferTramoAssignment;
};

/** Vista pública de una hoja de ruta ofrecida a transportistas (feed + ficha de oferta). */
export type RouteOfferPublicState = {
  threadId: string;
  routeSheetId: string;
  routeTitle: string;
  mercanciasResumen?: string;
  /** Notas generales de la hoja (mismo texto que en el acuerdo / rail). */
  notasGenerales?: string;
  /** Estado de la hoja (`programada`, etc.). */
  hojaEstado?: string;
  tramos: RouteOfferTramoPublic[];
};

export type Message =
  | {
      id: string;
      from: "me" | "other" | "system";
      type: "text";
      text: string;
      at: number;
      read?: boolean;
      offerQaId?: string;
      replyQuotes?: ReplyQuote[];
      /** Solo mensajes de texto persistidos / realtime. */
      chatStatus?: ChatDeliveryStatus;
    }
  | {
      id: string;
      from: "me" | "other";
      type: "image";
      images: { url: string }[];
      at: number;
      read?: boolean;
      caption?: string;
      embeddedAudio?: { url: string; seconds: number };
      replyQuotes?: ReplyQuote[];
      /** Entrega/lectura en mensajes propios persistidos (API / SignalR). */
      chatStatus?: ChatDeliveryStatus;
    }
  | {
      id: string;
      from: "me" | "other";
      type: "audio";
      url: string;
      seconds: number;
      at: number;
      read?: boolean;
      replyQuotes?: ReplyQuote[];
      chatStatus?: ChatDeliveryStatus;
    }
  | {
      id: string;
      from: "me" | "other";
      type: "doc";
      name: string;
      size: string;
      kind: "pdf" | "doc" | "other";
      url?: string;
      at: number;
      read?: boolean;
      caption?: string;
      replyQuotes?: ReplyQuote[];
      chatStatus?: ChatDeliveryStatus;
    }
  | {
      id: string;
      from: "me" | "other";
      type: "docs";
      documents: {
        name: string;
        size: string;
        kind: "pdf" | "doc" | "other";
        url?: string;
      }[];
      caption?: string;
      embeddedAudio?: { url: string; seconds: number };
      at: number;
      read?: boolean;
      replyQuotes?: ReplyQuote[];
      chatStatus?: ChatDeliveryStatus;
    }
  | {
      id: string;
      from: "system";
      type: "certificate";
      title: string;
      body: string;
      at: number;
    }
  | {
      id: string;
      from: "other";
      type: "agreement";
      agreementId: string;
      title: string;
      at: number;
      read?: boolean;
    };

/**
 * Tras editar la hoja: transportistas con tramo confirmado que cambió (o nueva asignación a otro tramo) quedan en
 * `pending` hasta aceptar/rechazar (demo; alineado a flow-id / flow-ui).
 */
export type RouteSheetEditAckState = {
  revision: number;
  byCarrier: Record<string, "pending" | "accepted" | "rejected">;
};

export type Thread = {
  id: string;
  offerId: string;
  storeId: string;
  store: StoreBadge;
  /** Hilos persistidos `cth_*`: IDs de comprador / vendedor (API). Mejoran etiquetas "Comprador . …" vs tienda. */
  buyerUserId?: string;
  sellerUserId?: string;
  purchaseMode?: boolean;
  messages: Message[];
  contracts?: TradeAgreement[];
  routeSheets?: RouteSheet[];
  prematureExitUnderInvestigation?: boolean;
  paymentCompleted?: boolean;
  chatActionsLocked?: boolean;
  /** Comprador mostrado en integrantes cuando el hilo es vista logística (p. ej. demo cooperativa). */
  demoBuyer?: {
    id: string;
    name: string;
    trustScore: number;
    avatarUrl?: string;
  };
  chatCarriers?: ThreadChatCarrier[];
  /** Acuses por hoja (se reinicia al guardar ediciones con transportistas en el hilo). */
  routeSheetEditAcks?: Record<string, RouteSheetEditAckState>;
};

export function threadHasAcceptedAgreement(th: Thread): boolean {
  return (th.contracts ?? []).some((c) => c.status === "accepted");
}

export function threadHasAcceptedAgreementUnpaid(th: Thread): boolean {
  return threadHasAcceptedAgreement(th) && !th.paymentCompleted;
}

/**
 * Tira de tiendas al **inicio** de un lote: se muestra justo antes de la oferta en índice `beforeOfferIndex`
 * (0 = antes del primer ítem del feed).
 */
export type RecommendationStoreStripAnchor = {
  beforeOfferIndex: number;
  storeIds: string[];
};

/** Estado de entrega/lectura (chat persistido + SignalR). */
export type ChatDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "error";

export type MarketState = {
  stores: Record<string, StoreBadge>;
  offers: Record<string, Offer>;
  offerIds: string[];
  /**
   * Índice en la lista ordenada del servidor de `offerIds[0]` (para paginar hacia arriba).
   */
  recommendationFeedStartIndex: number;
  recommendationCursor: number;
  recommendationTotalAvailable: number;
  recommendationBatchSize: number;
  recommendationThreshold: number;
  /** Tiendas sugeridas al inicio de cada lote (orden por `beforeOfferIndex`). */
  recommendationStoreStripAnchors: RecommendationStoreStripAnchor[];
  /** Catálogo de tienda (productos/servicios de ficha) por id de negocio — flow-ui perfil & acuerdos. */
  storeCatalogs: Record<string, StoreCatalog>;
  threads: Record<string, Thread>;
  /** Ofertas de ruta publicada: tramos, suscripciones y validación (demo). */
  routeOfferPublic: Record<string, RouteOfferPublicState>;
  /**
   * Si está definido, PUT workspace/stores y workspace/catalogs envían solo esa tienda (parches por id).
   */
  workspacePersistStoreId: string | null;
  setWorkspacePersistStoreId: (storeId: string | null) => void;

  ask: (
    offerId: string,
    askedBy: { id: string; name: string; trustScore: number },
    question: string,
  ) => string;
  /**
   * Persiste la consulta en el servidor y solo entonces añade la pregunta al estado local.
   */
  submitOfferQuestion: (
    offerId: string,
    askedBy: { id: string; name: string; trustScore: number },
    question: string,
    options?: { parentId?: string | null },
  ) => Promise<void>;
  answer: (offerId: string, qaId: string, answer: string) => void;
  ensureThreadForOffer: (
    offerId: string,
    opts?: { buyerId?: string },
  ) => Promise<string>;
  syncThreadBuyerQa: (threadId: string, buyerId: string) => void;
  /** Reemplaza `offer.qa` desde el API (otros comentarios / otra pestaña). */
  applyOfferQaFromServer: (offerId: string, qa: QAItem[]) => void;
  /** GET `/market/offers/:id/qa` y aplica en store + hilos de compra. */
  refreshOfferQaFromServer: (offerId: string) => Promise<void>;
  /** Mergea mensaje desde SignalR (evita duplicados por id). */
  onChatMessageFromServer: (threadId: string, dto: ChatMessageDto) => void;
  /** Nuevo hilo persistido: actualiza lista sin recargar (comprador y vendedor). */
  onThreadCreatedFromServer: (dto: ChatThreadDto) => void;
  /** Otro participante salió del chat (SignalR); mensaje de sistema en el hilo. */
  onParticipantLeftFromServer: (
    threadId: string,
    userId: string,
    displayName: string,
  ) => void;
  onChatMessageStatusFromServer: (
    threadId: string,
    messageId: string,
    status: string,
    updatedAtUtc?: string,
  ) => void;
  sendText: (threadId: string, text: string, replyToIds?: string[]) => void;
  sendAudio: (
    threadId: string,
    payload: { url: string; seconds: number },
    options?: { replyToIds?: string[] },
  ) => void;
  sendDocument: (
    threadId: string,
    payload: {
      name: string;
      size: string;
      kind: "pdf" | "doc" | "other";
      url: string;
    },
    options?: { replyToIds?: string[]; caption?: string },
  ) => void;
  sendImages: (
    threadId: string,
    images: { url: string }[],
    options?: {
      replyToIds?: string[];
      caption?: string;
      embeddedAudio?: { url: string; seconds: number };
    },
  ) => void;
  sendDocsBundle: (
    threadId: string,
    payload: {
      documents: {
        name: string;
        size: string;
        kind: "pdf" | "doc" | "other";
        url: string;
      }[];
      embeddedAudio?: { url: string; seconds: number };
    },
    options?: { replyToIds?: string[]; caption?: string },
  ) => void;
  emitTradeAgreement: (
    threadId: string,
    draft: TradeAgreementDraft,
  ) => string | null;
  /** Si `pending_buyer` o `rejected` (en ese caso pasa otra vez a pendiente). Emisor = tienda del hilo. */
  updatePendingTradeAgreement: (
    threadId: string,
    agreementId: string,
    draft: TradeAgreementDraft,
  ) => boolean;
  /** Sólo si el acuerdo no está aceptado y, tras el borrado, hojas ≤ acuerdos. */
  deleteTradeAgreement: (threadId: string, agreementId: string) => boolean;
  respondTradeAgreement: (
    threadId: string,
    agreementId: string,
    response: "accept" | "reject",
  ) => void;
  /** Sólo si la cantidad de hojas es estrictamente menor que la de acuerdos (y hay acuerdo aceptado en la demo). */
  createRouteSheet: (
    threadId: string,
    payload: RouteSheetCreatePayload,
  ) => string | null;
  updateRouteSheet: (
    threadId: string,
    routeSheetId: string,
    payload: RouteSheetCreatePayload,
  ) => boolean;
  setRouteSheetStatus: (
    threadId: string,
    routeSheetId: string,
    estado: RouteSheetStatus,
  ) => void;
  toggleRouteStop: (
    threadId: string,
    routeSheetId: string,
    stopId: string,
  ) => void;
  publishRouteSheetsToPlatform: (
    threadId: string,
    routeSheetIds: string[],
  ) => void;
  linkAgreementToRouteSheet: (
    threadId: string,
    agreementId: string,
    routeSheetId: string,
  ) => boolean;
  /** Quitar vínculo solo si la hoja no está publicada en la plataforma. */
  unlinkAgreementFromRouteSheet: (
    threadId: string,
    agreementId: string,
  ) => boolean;
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean;
  recordChatExitFromList: (threadId: string) => void;
  /** Quita el hilo del estado local y, si es persistido, lo borra en el servidor. */
  removeThreadFromList: (threadId: string) => Promise<void>;
  markThreadPaymentCompleted: (threadId: string) => void;

  subscribeRouteOfferTramo: (
    offerId: string,
    stopId: string,
    carrier: {
      userId: string;
      displayName: string;
      phone: string;
      trustScore: number;
    },
    vehicleLabel?: string,
  ) => boolean;
  /** Vendedor/comprador del hilo: acepta o rechaza la suscripción pendiente al tramo. */
  validateRouteOfferTramo: (
    offerId: string,
    stopId: string,
    accept: boolean,
  ) => boolean;
  /**
   * Transportista en el hilo: acepta o rechaza una versión editada de la hoja.
   * Si rechaza, libera sus tramos en la oferta pero sigue figurando en el chat (demo).
   */
  respondRouteSheetEdit: (
    threadId: string,
    routeSheetId: string,
    carrierUserId: string,
    accept: boolean,
  ) => boolean;

  /** Tiendas creadas por el usuario (vendedor) — flow-ui perfil. */
  createOwnerStore: (
    ownerUserId: string,
    values: OwnerStoreFormValues,
  ) => string | null;
  updateOwnerStore: (
    storeId: string,
    ownerUserId: string,
    values: OwnerStorePatch,
  ) => boolean;
  deleteOwnerStore: (storeId: string, ownerUserId: string) => boolean;
  addOwnerStoreProduct: (
    storeId: string,
    ownerUserId: string,
    product: StoreProductInput,
  ) => string | null;
  updateOwnerStoreProduct: (
    storeId: string,
    ownerUserId: string,
    productId: string,
    product: StoreProductInput,
  ) => boolean;
  removeOwnerStoreProduct: (
    storeId: string,
    ownerUserId: string,
    productId: string,
  ) => boolean;
  setOwnerStoreProductPublished: (
    storeId: string,
    ownerUserId: string,
    productId: string,
    published: boolean,
  ) => boolean;
  setOwnerStoreServicePublished: (
    storeId: string,
    ownerUserId: string,
    serviceId: string,
    published: boolean,
  ) => boolean;
  addOwnerStoreService: (
    storeId: string,
    ownerUserId: string,
    service: StoreServiceInput,
  ) => string | null;
  updateOwnerStoreService: (
    storeId: string,
    ownerUserId: string,
    serviceId: string,
    service: StoreServiceInput,
  ) => boolean;
  removeOwnerStoreService: (
    storeId: string,
    ownerUserId: string,
    serviceId: string,
  ) => boolean;
};
