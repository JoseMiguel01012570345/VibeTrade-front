import type { ChatUnifiedMessagePayloadDto } from "./chatMessagePayloadTypes";

export type ChatThreadDto = {
  id: string;
  offerId: string;
  storeId: string;
  buyerUserId: string;
  sellerUserId: string;
  initiatorUserId: string;
  firstMessageSentAtUtc: string | null;
  createdAtUtc: string;
  /** false = hilo originado solo por consultas desde la ficha; true = flujo Comprar (chat). */
  purchaseMode: boolean;
  /** DisplayName del comprador (p. ej. título del chat para el vendedor). */
  buyerDisplayName?: string | null;
  /** Foto de perfil del comprador (`/api/v1/media/…`; usar componente protegido en UI). */
  buyerAvatarUrl?: string | null;
  partyExitedUserId?: string | null;
  partyExitedReason?: string | null;
  partyExitedAtUtc?: string | null;
  buyerExpelledAtUtc?: string | null;
  sellerExpelledAtUtc?: string | null;
  /** Chat directo/grupal sin oferta comercial (sin acuerdos ni rutas). */
  isSocialGroup?: boolean;
  /** Nombre del grupo (solo lo edita el creador en API). */
  socialGroupTitle?: string | null;
};

/** Aligned with backend <see cref="VibeTrade.Backend.Data.ChatMessageStatus" /> (camelCase JSON). */
export type ChatMessageStatusApi =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "error";

export type TradeAgreementExtraFieldApiDto = {
  id?: string;
  title: string;
  valueKind: "text" | "image" | "document";
  textValue?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  /** Opcional: respuestas antiguas; el servidor ya no persiste ni devuelve alcance por fila. */
  scope?: "merchandise" | "service" | "legacy_combined";
};

/** Coincide con el JSON de payload del backend (camelCase). */
/** Respuesta GET/POST/PATCH acuerdos (camelCase API). */
export type TradeAgreementApiDto = {
  id: string;
  threadId: string;
  title: string;
  issuedAt: number;
  issuedByStoreId: string;
  issuerLabel: string;
  status: "pending_buyer" | "accepted" | "rejected" | "deleted";
  deletedAt?: number | null;
  respondedAt?: number | null;
  sellerEditBlockedUntilBuyerResponse?: boolean | null;
  hadBuyerAcceptance?: boolean | null;
  includeMerchandise: boolean;
  includeService: boolean;
  merchandise: Record<string, unknown>[];
  merchandiseMeta?: Record<string, unknown> | null;
  services: Record<string, unknown>[];
  /** Cláusulas extras cuando el acuerdo tiene mercancías y servicios. */
  extraFields?: TradeAgreementExtraFieldApiDto[];
  routeSheetId?: string | null;
  routeSheetUrl?: string | null;
  /** Hay al menos un cobro exitoso (pasarela); bloquea edición y borrado. */
  hasSucceededPayments?: boolean | null;
  /** Hay al menos un tramo de transporte cobrado; bloquea cambiar o desvincular la hoja. */
  hasSucceededRoutePayments?: boolean | null;
  /** Evidencia de mercancía aceptada; bloquea vincular o desvincular hoja de ruta. */
  hasAcceptedMerchandiseEvidence?: boolean | null;
};

/** Payload unificado del mensaje (respuesta API); alineado a ChatUnifiedMessagePayload del backend. */
export type ChatMessagePayloadDto = ChatUnifiedMessagePayloadDto;

export type ChatMessageDto = {
  id: string;
  threadId: string;
  senderUserId: string;
  payload: ChatMessagePayloadDto;
  status: ChatMessageStatusApi;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  /** Nombre mostrable del remitente (API: comprador = DisplayName, vendedor = tienda). */
  senderDisplayLabel?: string | null;
};

export type ChatThreadSummaryDto = {
  id: string;
  offerId: string;
  storeId: string;
  createdAtUtc: string;
  lastMessageAtUtc: string | null;
  lastPreview: string | null;
  purchaseMode: boolean;
  buyerUserId: string;
  sellerUserId: string;
  buyerDisplayName?: string | null;
  buyerAvatarUrl?: string | null;
  partyExitedUserId?: string | null;
  partyExitedReason?: string | null;
  partyExitedAtUtc?: string | null;
  buyerExpelledAtUtc?: string | null;
  sellerExpelledAtUtc?: string | null;
  isSocialGroup?: boolean;
  socialGroupTitle?: string | null;
};

export type ChatThreadMemberDto = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type ChatNotificationDto = {
  id: string;
  threadId: string | null;
  messageId: string | null;
  /** Presente cuando el aviso es por comentario en ficha (enlace a `/offer/:id`). */
  offerId: string | null;
  messagePreview: string;
  /** Nombre tienda o nombre del comprador (según emisor). */
  authorLabel: string;
  authorTrustScore: number;
  senderUserId: string;
  createdAtUtc: string;
  readAtUtc: string | null;
  /** Backend: offer_comment, offer_like, qa_comment_like, route_tramo_subscribe, route_tramo_subscribe_accepted, route_tramo_subscribe_rejected, peer_party_exited; ausente en avisos de chat por hilo. */
  kind?: string | null;
  /** JSON con routeSheetId, stopId, carrierUserId (camelCase). */
  metaJson?: string | null;
};

/** Respuesta de salida con acuerdo: el servidor puede aplicar ya la penalización (p. ej. reembolso + abandono solo servicios). */
export type PartySoftLeaveChatResult = {
  skipClientTrustPenalty: boolean;
};

/** Ítem de GET <c>threads/{id}/route-tramo-subscriptions</c> (camelCase). */
export type RouteTramoSubscriptionItemApi = {
  routeSheetId: string;
  stopId: string;
  orden: number;
  carrierUserId: string;
  displayName: string;
  phone: string;
  trustScore: number;
  storeServiceId?: string | null;
  transportServiceLabel: string;
  status: string;
  origenLine: string;
  destinoLine: string;
  createdAtUnixMs: number;
  carrierServiceStoreId?: string | null;
  carrierAvatarUrl?: string | null;
};

export type CarrierExpelledBySellerApiResult = {
  withdrawnRowCount: number;
  /** En la demo: penalización a la confianza de la tienda al expulsar a un transportista confirmado. */
  applyStoreTrustPenalty: boolean;
  storeTrustScoreAfter?: number | null;
  /** Tramos confirmados incluidos en esta expulsión (unidad de penalización por tramo en la demo). */
  confirmedStopsWithdrawnCount?: number;
  /** Ya no queda ninguna suscripción activa del transportista en el hilo (pierde el chat de esta operación). */
  carrierFullyRemovedFromThread?: boolean;
};

export type CarrierWithdrawFromThreadApiResult = {
  withdrawnRowCount: number;
  applyTrustPenalty: boolean;
  /** Trust persistido en servidor tras penalización (si aplica). */
  trustScoreAfterPenalty?: number | null;
};

export type RouteSheetPreselectedInviteApi = { stopId: string; phone: string };

export type LinkPreviewResult = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
};
