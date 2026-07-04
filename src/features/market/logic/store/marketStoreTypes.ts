import type { ChatMessageDto, ChatThreadDto, RouteTramoSubscriptionItemApi } from "@features/chat/Dtos/thread/chatApiTypes";
import type {
  StoreCatalog,
} from "@features/market/Dtos/storeCatalogTypes";
import type { TradeAgreementDraft } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import type { RouteSheetCreatePayload, RouteSheetStatus } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import type {
  Offer,
  RouteOfferPublicState,
  StoreBadge,
} from "@features/market/Dtos/marketTypes";

export type {
  OfferQaAuthorSnapshot,
  OfferQaComment,
  OfferQaCommentEnriched,
} from "@features/market/Dtos/offerQaTypes";

export type {
  TradeAgreement,
  TradeAgreementDraft,
} from "@features/chat/Dtos/agreement/tradeAgreementTypes";
export type {
  RouteSheet,
  RouteSheetCreatePayload,
  RouteSheetStatus,
  RouteStop,
} from "@features/chat/Dtos/route-sheet/routeSheetTypes";

export type {
  EmergentRouteParadaSnapshot,
  Offer,
  RouteOfferPublicState,
  RouteOfferTramoAssignment,
  RouteOfferTramoPublic,
  StoreBadge,
  StoreLocationPoint,
} from "@features/market/Dtos/marketTypes";

export type {
  OwnerStoreFormValues,
  OwnerStorePatch,
} from "@features/profile/Dtos/ownerStoreFormTypes";
export type {
  StoreProductInput,
  StoreServiceInput,
  RecommendationStoreStripAnchor,
  RecommendationHomeBulk,
} from "@features/market/Dtos/marketFeedTypes";
export type {
  ReplyQuote,
  ThreadChatCarrier,
  Message,
  RouteSheetEditAckState,
  Thread,
  ChatDeliveryStatus,
} from "@features/chat/Dtos/thread/threadTypes";
import type {
  OwnerStoreFormValues,
  OwnerStorePatch,
} from "@features/profile/Dtos/ownerStoreFormTypes";
import type {
  RecommendationHomeBulk,
  RecommendationStoreStripAnchor,
  StoreProductInput,
  StoreServiceInput,
} from "@features/market/Dtos/marketFeedTypes";
import type { Thread } from "@features/chat/Dtos/thread/threadTypes";

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

  ensureThreadForOffer: (
    offerId: string,
    opts?: { buyerId?: string; forceNewThread?: boolean },
  ) => Promise<string>;
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
  /** Copia el contenido del acuerdo en un borrador nuevo (sin hoja vinculada). */
  duplicateTradeAgreement: (
    threadId: string,
    agreementId: string,
  ) => Promise<string | null>;
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
  /** Clona la hoja en el mismo hilo (nuevo id, sin publicar). Devuelve el id de la copia. */
  duplicateRouteSheet: (
    threadId: string,
    routeSheetId: string,
  ) => Promise<string | null>;
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

export function threadHasAcceptedAgreement(th: Thread): boolean {
  return (th.contracts ?? []).some((c) => c.status === "accepted");
}

/** Todos los acuerdos en estado aceptado tienen cobro registrado en servidor (`hasSucceededPayments`). */
export function threadAcceptedAgreementsAllLiquidated(th: Thread): boolean {
  const accepted = (th.contracts ?? []).filter((c) => c.status === "accepted");
  if (accepted.length === 0) return false;
  return accepted.every((c) => c.hasSucceededPayments === true);
}

export function threadHasAcceptedAgreementUnpaid(th: Thread): boolean {
  return threadHasAcceptedAgreement(th) && !th.paymentCompleted;
}
