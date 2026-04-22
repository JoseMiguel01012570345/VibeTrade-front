import type {
  ChatDeliveryStatus,
  Message,
  ReplyQuote,
} from "../../app/store/marketStoreTypes";
import type { ChatMessageDto, ChatMessageStatusApi } from "./chatApi";

function mapApiStatus(s: ChatMessageStatusApi): ChatDeliveryStatus {
  return s;
}

function supportsChatDeliveryMerge(m: Message): boolean {
  return (
    m.type === "text" ||
    m.type === "image" ||
    m.type === "audio" ||
    m.type === "doc" ||
    m.type === "docs"
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
  if (!supportsChatDeliveryMerge(incoming)) return incoming;

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
  p: ChatMessageDto["payload"],
): ReplyQuote[] | undefined {
  const rq = p.replyQuotes;
  if (!rq?.length) return undefined;
  const out = rq
    .filter((x) => x.messageId && x.author && x.preview)
    .map((x) => ({
      id: x.messageId,
      author: x.author,
      preview: x.preview,
    }));
  return out.length ? out : undefined;
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

  const common = {
    id: dto.id,
    at,
    read,
    chatStatus,
    ...(replyQuotes?.length ? { replyQuotes } : {}),
  };

  const type = p.type;

  if (type === "text" && typeof p.text === "string") {
    return {
      ...common,
      from,
      type: "text",
      text: p.text,
      ...(typeof p.offerQaId === "string" && p.offerQaId.length > 0
        ? { offerQaId: p.offerQaId }
        : {}),
    };
  }

  if (type === "audio") {
    return {
      ...common,
      from: from as "me" | "other",
      type: "audio",
      url: typeof p.url === "string" ? p.url : "",
      seconds:
        typeof p.seconds === "number"
          ? Math.max(1, Math.round(p.seconds))
          : 1,
    };
  }

  if (type === "image") {
    const images = Array.isArray(p.images)
      ? p.images.map((x) => ({
          url: typeof x?.url === "string" ? x.url : "",
        }))
      : [];
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

  if (type === "doc") {
    const kind =
      p.kind === "pdf" || p.kind === "doc" || p.kind === "other"
        ? p.kind
        : "other";
    return {
      ...common,
      from: from as "me" | "other",
      type: "doc",
      name: typeof p.name === "string" ? p.name : "",
      size: typeof p.size === "string" ? p.size : "",
      kind,
      ...(typeof p.url === "string" && p.url.length > 0 ? { url: p.url } : {}),
      ...(typeof p.caption === "string" && p.caption.trim()
        ? { caption: p.caption.trim() }
        : {}),
    };
  }

  if (type === "docs") {
    const documents = Array.isArray(p.documents)
      ? p.documents.map((d) => {
          const kind: "pdf" | "doc" | "other" =
            d?.kind === "pdf" || d?.kind === "doc" || d?.kind === "other"
              ? d.kind
              : "other";
          return {
            name: typeof d?.name === "string" ? d.name : "",
            size: typeof d?.size === "string" ? d.size : "",
            kind,
            ...(typeof d?.url === "string" && d.url.length > 0
              ? { url: d.url }
              : {}),
          };
        })
      : [];
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

  if (type === "agreement") {
    const agreementId =
      typeof p.agreementId === "string" ? p.agreementId : "";
    const title = typeof p.title === "string" ? p.title : "";
    return {
      ...common,
      from: from as "me" | "other",
      type: "agreement",
      agreementId,
      title,
    };
  }

  if (type === "system_text" && typeof p.text === "string") {
    return {
      ...common,
      from: "system",
      type: "text",
      text: p.text,
    };
  }

  return {
    id: dto.id,
    from,
    type: "text",
    text: typeof p.text === "string" ? p.text : "",
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

/**
 * Dos copias de la misma Q&A pública (ids distintos: local `m_*` + servidor `cmg_*`).
 * Conserva preferentemente el mensaje persistido `cmg_*`.
 */
export function dedupePublicQaMirrors(messages: readonly Message[]): Message[] {
  const byKey = new Map<string, Message>();
  for (const m of messages) {
    if (m.type !== "text" || !m.offerQaId) continue;
    const key = `${m.offerQaId}:${m.from}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, m);
      continue;
    }
    const winner =
      m.id.startsWith("cmg_") && !prev.id.startsWith("cmg_")
        ? m
        : prev.id.startsWith("cmg_") && !m.id.startsWith("cmg_")
          ? prev
          : prev.at <= m.at
            ? prev
            : m;
    byKey.set(key, winner);
  }
  const out: Message[] = [];
  for (const m of sortMessagesChronological(messages)) {
    if (m.type !== "text" || !m.offerQaId) {
      out.push(m);
      continue;
    }
    const key = `${m.offerQaId}:${m.from}`;
    const w = byKey.get(key);
    if (w && w.id === m.id) out.push(m);
  }
  return sortMessagesChronological(out);
}

export function normalizeThreadMessages(messages: readonly Message[]): Message[] {
  return dedupePublicQaMirrors(dedupeMessagesById(messages));
}

/**
 * Combina mensajes persistidos con estado local.
 * Si ya hay mensajes del servidor, descarta texto local que no sea sistema/acuerdo/pendiente
 * para no duplicar la misma consulta pública (offer.qa) que ya viene en `serverMapped`.
 */
export function mergePersistedChatMessages(
  serverMapped: Message[],
  existingLocal: Message[],
): Message[] {
  const hasServer = serverMapped.length > 0;
  const serverAgreementIds = new Set(
    serverMapped
      .filter((m) => m.type === "agreement")
      .map((m) => m.agreementId),
  );
  const preservedLocal = hasServer
    ? existingLocal.filter((m) => {
        if (typeof m.id === "string" && m.id.startsWith("pend_")) return true;
        if (m.type === "agreement" && serverAgreementIds.has(m.agreementId))
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
