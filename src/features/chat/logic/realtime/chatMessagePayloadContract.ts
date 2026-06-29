/**
 * Contrato alineado con el backend (fuente de verdad):
 * - POST: PostChatMessageBody (sin campo `type`)
 * - Respuesta: ChatUnifiedMessagePayload serializado en `payload` (sin discriminador `type`)
 */

import type { PostChatMessageBody } from "@features/chat/Dtos/thread/chatMessagePayloadTypes";

export function withReplyToIds(
  body: PostChatMessageBody,
  replyToIds?: string[],
): PostChatMessageBody {
  const ids = replyToIds?.filter(Boolean);
  if (!ids?.length) return body;
  return { ...body, replyToIds: ids };
}

export function buildPostTextBody(
  text: string,
  opts?: { replyToIds?: string[]; offerQaId?: string },
): PostChatMessageBody {
  return withReplyToIds(
    {
      text: text.trim(),
      ...(opts?.offerQaId ? { offerQaId: opts.offerQaId } : {}),
    },
    opts?.replyToIds,
  );
}

export function buildPostVoiceBody(
  url: string,
  seconds: number,
  replyToIds?: string[],
): PostChatMessageBody {
  return withReplyToIds(
    {
      url: url.trim(),
      seconds: Math.max(1, Math.round(seconds)),
    },
    replyToIds,
  );
}

export function buildPostImageBody(
  images: { url: string }[],
  opts?: {
    caption?: string;
    embeddedAudio?: { url: string; seconds: number };
    replyToIds?: string[];
  },
): PostChatMessageBody {
  const body: PostChatMessageBody = { images };
  const cap = opts?.caption?.trim();
  if (cap) body.caption = cap;
  if (opts?.embeddedAudio) {
    body.embeddedAudio = {
      url: opts.embeddedAudio.url,
      seconds: Math.max(1, Math.round(opts.embeddedAudio.seconds)),
    };
  }
  return withReplyToIds(body, opts?.replyToIds);
}

export function buildPostSingleDocumentBody(
  doc: {
    name: string;
    size: string;
    kind: "pdf" | "doc" | "other";
    url?: string;
  },
  opts?: {
    caption?: string;
    replyToIds?: string[];
  },
): PostChatMessageBody {
  const body: PostChatMessageBody = {
    name: doc.name,
    size: doc.size,
    kind: doc.kind,
    ...(doc.url ? { url: doc.url } : {}),
  };
  const cap = opts?.caption?.trim();
  if (cap) body.caption = cap;
  return withReplyToIds(body, opts?.replyToIds);
}

export function buildPostDocumentsBundleBody(
  documents: PostChatMessageBody["documents"],
  opts?: {
    caption?: string;
    embeddedAudio?: { url: string; seconds: number };
    replyToIds?: string[];
  },
): PostChatMessageBody {
  const body: PostChatMessageBody = { documents: documents ?? [] };
  const cap = opts?.caption?.trim();
  if (cap) body.caption = cap;
  if (opts?.embeddedAudio) {
    body.embeddedAudio = {
      url: opts.embeddedAudio.url,
      seconds: Math.max(1, Math.round(opts.embeddedAudio.seconds)),
    };
  }
  return withReplyToIds(body, opts?.replyToIds);
}
