/**
 * Contrato alineado con el backend (fuente de verdad):
 * - POST: PostChatMessageBody (sin campo `type`)
 * - Respuesta: ChatUnifiedMessagePayload serializado en `payload` (sin discriminador `type`)
 */

export type PostChatMessageBody = {
  replyToIds?: string[];
  text?: string;
  offerQaId?: string;
  url?: string;
  seconds?: number;
  images?: { url: string }[];
  caption?: string;
  embeddedAudio?: { url: string; seconds: number };
  name?: string;
  size?: string;
  kind?: "pdf" | "doc" | "other";
  documents?: {
    name: string;
    size: string;
    kind: "pdf" | "doc" | "other";
    url?: string;
  }[];
};

/** Payload unificado tal como lo devuelve GET/POST /messages (camelCase JSON). */
export type ChatUnifiedMessagePayloadDto = {
  text?: string;
  offerQaId?: string;
  images?: { url: string }[];
  documents?: {
    name: string;
    size: string;
    kind: string;
    url?: string;
  }[];
  caption?: string;
  embeddedAudio?: { url: string; seconds: number };
  voiceUrl?: string;
  voiceSeconds?: number;
  replyToMessageIds?: string[];
  repliesTo?: Array<{
    messageId: string;
    author: string;
    preview: string;
    atUtc?: string;
  }>;
  systemText?: string;
  issuedByVibeTradePlatform?: boolean;
  agreement?: {
    agreementId: string;
    title: string;
    status?: string;
    body?: string;
  };
  certificate?: { title: string; body: string };
  paymentFeeReceipt?: Record<string, unknown>;
};
