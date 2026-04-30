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
import type {
  ChatMessageDto,
  ChatThreadDto,
  RouteTramoSubscriptionItemApi,
} from "../../utils/chat/chatApi";
import type { PaymentFeeReceiptPayload } from "../../pages/chat/domain/paymentFeeReceiptTypes";
import type {
  OfferQaAuthorSnapshot,
  OfferQaCommentEnriched,
} from "../domain/offerQaTypes";

export type {
  OfferQaAuthorSnapshot,
  OfferQaComment,
  OfferQaCommentEnriched,
} from "../domain/offerQaTypes";

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
  /** Sitio web público (https), opcional. */
  websiteUrl?: string;
};

/** Alta de tienda desde perfil (flow-ui: nombre, categorías, descripción, transporte). */
export type OwnerStoreFormValues = {
  name: string;
  categories: string[];
  categoryPitch: string;
  transportIncluded: boolean;
  /** Opcional: pin en mapa (OpenStreetMap). */
  location?: StoreLocationPoint;
  /** Opcional: URL del sitio (se normaliza a https al guardar). */
  websiteUrl?: string;
};

/** Parcial permitido al actualizar tienda (incl. imagen de vitrina). */
export type OwnerStorePatch = Partial<
  OwnerStoreFormValues & {
    avatarUrl: string | null | undefined;
    websiteUrl: string | null | undefined;
  }
>;

export type StoreProductInput = Omit<StoreProduct, "id" | "storeId">;
export type StoreServiceInput = Omit<StoreService, "id" | "storeId">;

/**
 * QA fila en el cliente: modelo de dominio enriquecido + campo `question` usado en UI legada
 * (la API persiste `text` / `question` según el flujo).
 */
export type QAItem = OfferQaCommentEnriched & {
  question: string;
  askedBy: OfferQaAuthorSnapshot;
  answeredBy?: OfferQaAuthorSnapshot;
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
  /** Número de comentarios públicos (feed / recomendaciones). */
  publicCommentCount?: number;
  offerLikeCount?: number;
  viewerLikedOffer?: boolean;
  /**
   * Publicación emergente de hoja de ruta (`emo_…`); el `id` es la publicación, no el id de catálogo.
   * Viene de la API de recomendaciones; la imagen del producto sigue en `imageUrl` (oferta base).
   */
  isEmergentRoutePublication?: boolean;
  /** Oferta de catálogo (producto/servicio) asociada a la publicación emergente. */
  emergentBaseOfferId?: string;
  /** Hilo de chat de la operación (API `emergentThreadId`). */
  emergentThreadId?: string;
  /** Hoja de ruta persistida (API `emergentRouteSheetId`). */
  emergentRouteSheetId?: string;
  /** Tramos (snapshot) para mapa en feed sin `routeOfferPublic` local. Misma estructura que en la API. */
  emergentRouteParadas?: EmergentRouteParadaSnapshot[];
  /** Moneda de pago (snapshot) si la hoja de ruta la definió. */
  emergentMonedaPago?: string;
};

/** Parada en snapshot de publicación emergente; coords opcionales para Leaflet. */
export type EmergentRouteParadaSnapshot = {
  /** Id del tramo en la hoja persistida (API `stopId`); requerido para suscripción en servidor. */
  stopId?: string;
  /** Orden del tramo en la hoja (API `orden`). */
  orden?: number;
  origen: string;
  destino: string;
  origenLat?: string;
  origenLng?: string;
  destinoLat?: string;
  destinoLng?: string;
  /** Moneda del precio de este tramo (API `emergentRouteParadas[].monedaPago`). */
  monedaPago?: string;
  /** Tarifa / precio del transportista en este tramo (`precioTransportista` en API). */
  precioTransportista?: string;
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
  /** Servicio de catálogo con el que se suscribió (validado en servidor si aplica). */
  storeServiceId?: string;
};

export type RouteOfferTramoPublic = {
  stopId: string;
  orden: number;
  origenLine: string;
  destinoLine: string;
  origenLat?: string;
  origenLng?: string;
  destinoLat?: string;
  destinoLng?: string;
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
  /** Moneda del precio de este tramo en la hoja. */
  monedaPago?: string;
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
      from: "me" | "other";
      type: "agreement";
      agreementId: string;
      title: string;
      at: number;
      read?: boolean;
      replyQuotes?: ReplyQuote[];
      /** Entrega/lectura en el propio anuncio de acuerdo (GET / messages + SignalR). */
      chatStatus?: ChatDeliveryStatus;
    }
  | {
      id: string;
      from: "system";
      type: "payment_fee_receipt";
      receipt: PaymentFeeReceiptPayload;
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
  /** Datos del comprador desde bootstrap / GET thread (foto para vendedor sin pedir otro endpoint). */
  buyerDisplayName?: string;
  buyerAvatarUrl?: string;
  purchaseMode?: boolean;
  messages: Message[];
  contracts?: TradeAgreement[];
  routeSheets?: RouteSheet[];
  prematureExitUnderInvestigation?: boolean;
  /** Salida de comprador/vendedor con acuerdo aceptado (también puede venir en JSON plano como partyExited*). */
  peerPartyExit?: {
    userId: string;
    reason: string;
    atUtc: string;
    leaverRole?: "buyer" | "seller";
  };
  partyExitedUserId?: string;
  partyExitedReason?: string;
  partyExitedAtUtc?: string;
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

/** Un “bulk” del feed home: tiendas sugeridas del lote + ids de ofertas de ese lote (alineado al API de recomendaciones). */
export type RecommendationHomeBulk = {
  /** Clave estable para React cuando dos lotes comparten los mismos offerIds. */
  instanceKey?: string;
  storeIds: string[];
  offerIds: string[];
  /** Página siguiente (memoria + API en el borde inferior de la ventana). */
  next: string | null;
  /** Página anterior (API solo desde el bulk índice 0). */
  prev: string | null;
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
  /** `true` cuando el API devolvió un lote vacío: no hay más recomendaciones (no usar solo `totalAvailable` vs cap en memoria). */
  recommendationFeedExhausted: boolean;
  recommendationTotalAvailable: number;
  recommendationBatchSize: number;
  recommendationThreshold: number;
  /** Tiendas sugeridas al inicio de cada lote (orden por `beforeOfferIndex`). */
  recommendationStoreStripAnchors: RecommendationStoreStripAnchor[];
  /** Lotes del home (card = tiendas del lote + ofertas del lote). */
  recommendationHomeBulks: RecommendationHomeBulk[];
  /**
   * Índice del primer bulk de la bolsa API actual en {@link recommendationHomeBulks}
   * (prefetch en +4 relativos, merge en +6). Necesario cuando hay más de 7 bulks en el carrusel.
   */
  recommendationBagStartBulkIdx: number;
  /**
   * Ids de ofertas en el feed de recomendaciones (puede repetir el mismo id por cada hueco);
   * al fusionar, se podan entradas que ya no están en {@link recommendationHomeBulks}.
   */
  recommendationCachedOfferIds: string[];
  recommendationCachedStoreIds: string[];
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
  /**
   * Demo / local: resta puntos de confianza del badge de la tienda y sincroniza `thread.store` en hilos abiertos.
   */
  applyStoreTrustPenalty: (
    storeId: string,
    penalty: number,
    reason?: string,
    opts?: { forceLocal?: boolean },
  ) => void;

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
    opts?: { buyerId?: string; forceNewThread?: boolean },
  ) => Promise<string>;
  /** `viewerId` = usuario conectado; el comprador del hilo se toma de `thread.buyerUserId`. */
  syncThreadBuyerQa: (threadId: string, viewerId: string) => void;
  /** Reemplaza `offer.qa` desde el API (otros comentarios / otra pestaña). */
  applyOfferQaFromServer: (offerId: string, qa: QAItem[]) => void;
  /** GET `/market/offers/:id/qa` y aplica en store + hilos de compra. */
  refreshOfferQaFromServer: (offerId: string) => Promise<void>;
  /** GET acuerdos del hilo y reemplaza `thread.contracts` (p. ej. tras SignalR, sin refetch de todos los mensajes). */
  refreshThreadTradeAgreements: (threadId: string) => Promise<void>;
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
  /** `message` incluye el texto del API cuando falla la persistencia (p. ej. 409 nombre duplicado). */
  emitTradeAgreement: (
    threadId: string,
    draft: TradeAgreementDraft,
  ) => Promise<{ ok: true; agreementId: string } | { ok: false; message?: string }>;
  /** Si `pending_buyer` o `rejected` (en ese caso pasa otra vez a pendiente). Emisor = tienda del hilo. */
  updatePendingTradeAgreement: (
    threadId: string,
    agreementId: string,
    draft: TradeAgreementDraft,
  ) => Promise<{ ok: true } | { ok: false; message?: string }>;
  /** Sólo si el acuerdo no está aceptado y, tras el borrado, hojas ≤ acuerdos. */
  deleteTradeAgreement: (threadId: string, agreementId: string) => Promise<boolean>;
  respondTradeAgreement: (
    threadId: string,
    agreementId: string,
    response: "accept" | "reject",
  ) => Promise<boolean>;
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
  /** Retira la hoja del mercado (demo) y sincroniza con el API. */
  unpublishRouteSheetFromPlatform: (
    threadId: string,
    routeSheetId: string,
  ) => void;
  linkAgreementToRouteSheet: (
    threadId: string,
    agreementId: string,
    routeSheetId: string,
  ) => Promise<boolean>;
  /** Quitar vínculo solo si la hoja no está publicada en la plataforma. */
  unlinkAgreementFromRouteSheet: (
    threadId: string,
    agreementId: string,
  ) => Promise<boolean>;
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean;
  /**
   * Marca salida prematura con acuerdo y aplica penalización demo al comprador o vendedor que sale:
   * puntos base × cantidad de integrantes (comprador + vendedor + transportistas en el hilo).
   */
  recordChatExitFromList: (
    threadId: string,
    leaverUserId: string,
    opts?: { skipTrustAdjust?: boolean },
  ) => { appliedPenalty: number; groupMemberCount: number };
  applyPeerPartyExitedFromServer: (
    threadId: string,
    payload: {
      leaverUserId: string;
      reason?: string;
      atUtc?: string | number;
      leaverRole?: "buyer" | "seller";
    },
  ) => void;
  /** Quita el hilo del estado local y, si es persistido, lo borra en el servidor. */
  removeThreadFromList: (
    threadId: string,
    opts?: { skipServerDelete?: boolean },
  ) => Promise<void>;
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
    storeServiceId?: string,
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

  /** Sincroniza suscripciones persistidas (GET) con oferta pública y transportistas en hilo. */
  applyThreadRouteTramoSubscriptions: (
    threadId: string,
    items: RouteTramoSubscriptionItemApi[],
    viewerId: string,
  ) => void;

  /** Hidrata solo <c>routeOfferPublic[key]</c> desde GET emergente (sin hilo en memoria). */
  hydrateRouteOfferCarrierSubscriptions: (
    routeOfferPublicKey: string,
    items: RouteTramoSubscriptionItemApi[],
    viewerId: string,
  ) => void;

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
