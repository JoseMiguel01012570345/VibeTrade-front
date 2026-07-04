import type { RouteTramoSubscriptionItemApi } from "./chatApiTypes";
import type { PaymentFeeReceiptPayload } from "@features/payments/Dtos/paymentFeeReceiptTypes";
import type { StoreBadge } from "@features/market/Dtos/marketTypes";
import type { RouteSheet } from "../route-sheet/routeSheetTypes";
import type { TradeAgreement } from "../agreement/tradeAgreementTypes";

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
  /** Foto de perfil del usuario (API suscripciones / cuenta). */
  avatarUrl?: string;
};

/** Estado de entrega/lectura (chat persistido + SignalR). */
export type ChatDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "error";

export type Message =
  | {
      id: string;
      from: "me" | "other" | "system";
      type: "text";
      text: string;
      at: number;
      read?: boolean;
      replyQuotes?: ReplyQuote[];
      /** Solo mensajes de texto persistidos / realtime. */
      chatStatus?: ChatDeliveryStatus;
      /** Emisor (API); hilos sociales: avatar y cabecera por usuario. */
      chatSenderUserId?: string;
      chatSenderDisplayLabel?: string;
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
      chatSenderUserId?: string;
      chatSenderDisplayLabel?: string;
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
      chatSenderUserId?: string;
      chatSenderDisplayLabel?: string;
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
      chatSenderUserId?: string;
      chatSenderDisplayLabel?: string;
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
      chatSenderUserId?: string;
      chatSenderDisplayLabel?: string;
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
      chatSenderUserId?: string;
      chatSenderDisplayLabel?: string;
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
  /** Comprador que hizo soft-leave o notify-participant-left (API). */
  buyerExpelledAtUtc?: string;
  /** Vendedor que hizo soft-leave o notify-participant-left (API). */
  sellerExpelledAtUtc?: string;
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
  /** Último GET de suscripciones de tramo del hilo (guards multi-hoja con cobros). */
  routeTramoSubscriptionsSnapshot?: RouteTramoSubscriptionItemApi[];
  /** Hilo de mensajería sin oferta (grupo / directo): sin acuerdos, pagos ni panel de rutas. */
  isSocialGroup?: boolean;
  /** Chat de soporte tienda-comprador (sin acuerdos comerciales ni panel de rutas). */
  isSupportThread?: boolean;
  /** Título personalizado del grupo social (API; solo el creador puede cambiarlo). */
  socialGroupTitle?: string | null;
};
