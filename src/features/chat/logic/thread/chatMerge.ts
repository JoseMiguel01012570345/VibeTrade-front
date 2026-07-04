import type {
  ChatDeliveryStatus,
  Message,
  ReplyQuote,
} from "@features/market/logic/store/marketStoreTypes";
import type {
  ChatMessageDto,
  ChatMessageStatusApi,
} from "@features/chat/Dtos/thread/chatApiTypes";
import type { ChatUnifiedMessagePayloadDto } from "@features/chat/Dtos/thread/chatMessagePayloadTypes";
import type { MergePersistedChatMessagesOptions } from "@features/chat/Dtos/thread/chatMergeTypes";
import { parsePaymentFeeReceiptPayload } from "@features/payments/Dtos/paymentFeeReceiptTypes";

function mapApiStatus(s: ChatMessageStatusApi): ChatDeliveryStatus {
  return s;
}

function supportsChatDeliveryMerge(m: Message): boolean {
  return (
    m.type === "text" ||
    m.type === "image" ||
    m.type === "audio" ||
    m.type === "doc" ||
    m.type === "docs" ||
    m.type === "agreement"
  );
}

function deliveryStatusFromMessage(m: Message): ChatDeliveryStatus {
  if (!supportsChatDeliveryMerge(m)) return "sent";
  if ("chatStatus" in m && m.chatStatus) return m.chatStatus;
  if ("read" in m && m.read === true) return "read";
  return "sent";
}

/**
 * Evita que un evento atrasado (`sent`) pise uno más nuevo (`delivered` / `read`) cuando
 * llegan POST, SignalR y refetch en distinto orden.
 */
export function preferHigherDeliveryStatus(
  a: ChatDeliveryStatus | undefined,
  b: ChatDeliveryStatus | undefined,
): ChatDeliveryStatus | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (a === "error" && b !== "error") return b;
  if (b === "error" && a !== "error") return a;
  if (a === "error" && b === "error") return "error";

  const order = ["pending", "sent", "delivered", "read"] as const;
  const ia = order.indexOf(a as (typeof order)[number]);
  const ib = order.indexOf(b as (typeof order)[number]);
  if (ia === -1) return b;
  if (ib === -1) return a;
  return order[Math.max(ia, ib)]!;
}

/** Conserva el contenido de `incoming` y el mayor estado de entrega entre ambos. */
export function mergeMessageByIdPreferMonotonicDelivery(
  prev: Message | undefined,
  incoming: Message,
): Message {
  if (!prev || prev.id !== incoming.id || prev.type !== incoming.type) {
    return incoming;
  }
  if (prev.from !== incoming.from) return incoming;
  if (!supportsChatDeliveryMerge(incoming)) {
    if (
      incoming.type === "payment_fee_receipt" &&
      prev.type === "payment_fee_receipt"
    ) {
      const prevR = "receipt" in prev ? prev.receipt : undefined;
      const nextR = incoming.receipt ?? prevR;
      if (nextR) {
        return { ...incoming, receipt: nextR } as Message;
      }
    }
    return incoming;
  }

  const merged =
    preferHigherDeliveryStatus(
      deliveryStatusFromMessage(prev),
      deliveryStatusFromMessage(incoming),
    ) ?? deliveryStatusFromMessage(incoming);
  const read = merged === "read";
  return { ...incoming, chatStatus: merged, read } as Message;
}

/** Inserta o sustituye por `id` sin duplicar y sin bajar el estado de entrega ya alcanzado. */
export function upsertMessageMergeDelivery(
  threadMessages: readonly Message[],
  incoming: Message,
): Message[] {
  const prev = threadMessages.find((x) => x.id === incoming.id);
  const merged = mergeMessageByIdPreferMonotonicDelivery(prev, incoming);
  const withoutDup = threadMessages.filter((x) => x.id !== incoming.id);
  return normalizeThreadMessages([...withoutDup, merged]);
}

function mapReplyQuotes(
  p: ChatUnifiedMessagePayloadDto,
): ReplyQuote[] | undefined {
  const rt = p.repliesTo;
  if (rt?.length) {
    const out = rt
      .filter((x) => x.messageId && x.author && x.preview)
      .map((x) => ({
        id: x.messageId,
        author: x.author,
        preview: x.preview,
      }));
    if (out.length) return out;
  }
  return undefined;
}

function docKind(
  k: string | undefined,
): "pdf" | "doc" | "other" {
  return k === "pdf" || k === "doc" || k === "other" ? k : "other";
}

export function mapChatMessageDtoToMessage(
  dto: ChatMessageDto,
  meId: string,
): Message {
  const at = Date.parse(dto.createdAtUtc);
  const from = dto.senderUserId === meId ? "me" : "other";
  const p = dto.payload;
  const chatStatus = mapApiStatus(dto.status);
  /** Mismo campo que en servidor: lectura del mensaje (visto por destinatario o leído por ti en entrantes). */
  const read = dto.status === "read";
  const replyQuotes = mapReplyQuotes(p);

  const trimmedSenderId = dto.senderUserId?.trim();
  const senderMeta =
    trimmedSenderId && trimmedSenderId.length >= 2
      ? {
          chatSenderUserId: trimmedSenderId,
          ...(dto.senderDisplayLabel?.trim()
            ? { chatSenderDisplayLabel: dto.senderDisplayLabel.trim() }
            : {}),
        }
      : {};

  const common = {
    id: dto.id,
    at,
    read,
    chatStatus,
    ...(replyQuotes?.length ? { replyQuotes } : {}),
    ...senderMeta,
  };

  if (p.paymentFeeReceipt) {
    const receipt = parsePaymentFeeReceiptPayload(
      p.paymentFeeReceipt as Record<string, unknown>,
    );
    if (receipt) {
      return {
        ...common,
        from: "system",
        type: "payment_fee_receipt",
        receipt,
      };
    }
  }

  if (p.agreement?.agreementId) {
    return {
      ...common,
      from: from as "me" | "other",
      type: "agreement",
      agreementId: p.agreement.agreementId,
      title: p.agreement.title ?? "",
    };
  }

  if (p.certificate?.title) {
    const body = (p.certificate.body ?? "").trim();
    const txt = body ? `${p.certificate.title}: ${body}` : p.certificate.title;
    return {
      ...common,
      from: "system",
      type: "text",
      text: txt,
    };
  }

  if (p.systemText?.trim()) {
    return {
      ...common,
      from: "system",
      type: "text",
      text: p.systemText.trim(),
    };
  }

  const images = Array.isArray(p.images)
    ? p.images
        .filter((x) => typeof x?.url === "string" && x.url.length > 0)
        .map((x) => ({ url: x.url }))
    : [];

  if (images.length > 0) {
    return {
      ...common,
      from: from as "me" | "other",
      type: "image",
      images,
      ...(typeof p.caption === "string" && p.caption.trim()
        ? { caption: p.caption.trim() }
        : {}),
      ...(p.embeddedAudio &&
      typeof p.embeddedAudio.url === "string" &&
      typeof p.embeddedAudio.seconds === "number"
        ? {
            embeddedAudio: {
              url: p.embeddedAudio.url,
              seconds: Math.max(1, Math.round(p.embeddedAudio.seconds)),
            },
          }
        : {}),
    };
  }

  const rawDocs = Array.isArray(p.documents) ? p.documents : [];
  if (rawDocs.length === 1) {
    const d = rawDocs[0]!;
    return {
      ...common,
      from: from as "me" | "other",
      type: "doc",
      name: d.name ?? "",
      size: d.size ?? "",
      kind: docKind(d.kind),
      ...(d.url ? { url: d.url } : {}),
      ...(typeof p.caption === "string" && p.caption.trim()
        ? { caption: p.caption.trim() }
        : {}),
    };
  }

  if (rawDocs.length > 1) {
    const documents = rawDocs.map((d) => ({
      name: d.name ?? "",
      size: d.size ?? "",
      kind: docKind(d.kind),
      ...(d.url ? { url: d.url } : {}),
    }));
    return {
      ...common,
      from: from as "me" | "other",
      type: "docs",
      documents,
      ...(typeof p.caption === "string" && p.caption.trim()
        ? { caption: p.caption.trim() }
        : {}),
      ...(p.embeddedAudio &&
      typeof p.embeddedAudio.url === "string" &&
      typeof p.embeddedAudio.seconds === "number"
        ? {
            embeddedAudio: {
              url: p.embeddedAudio.url,
              seconds: Math.max(1, Math.round(p.embeddedAudio.seconds)),
            },
          }
        : {}),
    };
  }

  if (typeof p.voiceUrl === "string" && p.voiceUrl.trim()) {
    return {
      ...common,
      from: from as "me" | "other",
      type: "audio",
      url: p.voiceUrl.trim(),
      seconds:
        typeof p.voiceSeconds === "number"
          ? Math.max(1, Math.round(p.voiceSeconds))
          : 1,
    };
  }

  if (typeof p.text === "string" && p.text.length > 0) {
    return {
      ...common,
      from,
      type: "text",
      text: p.text,
    };
  }

  return {
    id: dto.id,
    from,
    type: "text",
    text: "",
    at,
    read,
    chatStatus,
  };
}

/** Mensajes locales que no vienen del API (acuerdos, sistema, etc.). */
export function isLocalRichMessage(m: Message): boolean {
  if (m.type === "agreement") return true;
  if (m.type === "certificate") return true;
  if (m.type === "text" && m.from === "system") return true;
  if (m.type === "payment_fee_receipt" && m.from === "system") return true;
  return false;
}

/** Más antiguos primero (arriba en el hilo); desempate estable por id. */
export function sortMessagesChronological<T extends { at: number; id: string }>(
  messages: readonly T[],
): T[] {
  return [...messages].sort((a, b) => {
    const d = a.at - b.at;
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}

/** Evita el mismo mensaje dos veces (p. ej. POST + SignalR con el mismo id). */
export function dedupeMessagesById(messages: readonly Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of messages) {
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
      continue;
    }
    byId.set(m.id, mergeMessageByIdPreferMonotonicDelivery(prev, m));
  }
  return sortMessagesChronological([...byId.values()]);
}

export function normalizeThreadMessages(messages: readonly Message[]): Message[] {
  return dedupeMessagesById(messages);
}

/**
 * Combina mensajes persistidos con estado local.
 * Si ya hay mensajes del servidor, descarta texto local que no sea sistema/acuerdo/pendiente.
 */
export function mergePersistedChatMessages(
  serverMapped: Message[],
  existingLocal: Message[],
  options?: MergePersistedChatMessagesOptions,
): Message[] {
  const hasServer = serverMapped.length > 0;
  const serverAgreementIds = new Set(
    serverMapped
      .filter((m) => m.type === "agreement")
      .map((m) => m.agreementId),
  );
  const validIds = options?.validTradeAgreementIds;
  const preservedLocal = hasServer
    ? existingLocal.filter((m) => {
        if (typeof m.id === "string" && m.id.startsWith("pend_")) return true;
        if (m.type === "agreement" && serverAgreementIds.has(m.agreementId))
          return false;
        if (
          m.type === "agreement" &&
          validIds &&
          typeof m.agreementId === "string" &&
          m.agreementId.length > 0 &&
          !validIds.has(m.agreementId)
        )
          return false;
        return isLocalRichMessage(m);
      })
    : existingLocal;
  const mergedServer = serverMapped.map((sm) => {
    const ex = existingLocal.find((x) => x.id === sm.id);
    return ex ? mergeMessageByIdPreferMonotonicDelivery(ex, sm) : sm;
  });
  const combined = [...mergedServer, ...preservedLocal];
  return normalizeThreadMessages(combined);
}
