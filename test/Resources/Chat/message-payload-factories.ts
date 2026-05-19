import type { ChatMessageDto } from "@/utils/chat/chatApi";
import type {
  ChatUnifiedMessagePayloadDto,
  PostChatMessageBody,
} from "@/utils/chat/chatMessagePayloadContract";
import {
  buildPostDocumentsBundleBody,
  buildPostImageBody,
  buildPostSingleDocumentBody,
  buildPostTextBody,
  buildPostVoiceBody,
} from "@/utils/chat/chatMessagePayloadContract";

export function makeChatMessageDto(
  overrides: Partial<ChatMessageDto> & {
    payload?: ChatUnifiedMessagePayloadDto;
  } = {},
): ChatMessageDto {
  const id = overrides.id ?? "cmg_api_1";
  return {
    id,
    threadId: overrides.threadId ?? "cth_test_001",
    senderUserId: overrides.senderUserId ?? "buyer-1",
    senderDisplayLabel: overrides.senderDisplayLabel ?? "Comprador",
    status: overrides.status ?? "sent",
    createdAtUtc: overrides.createdAtUtc ?? new Date().toISOString(),
    updatedAtUtc: null,
    payload: overrides.payload ?? { text: "Hola" },
  };
}

/** Payload de respuesta API (unificado, sin `type`). */
export function unifiedTextPayload(
  text: string,
  opts?: {
    replyToMessageIds?: string[];
    repliesTo?: ChatUnifiedMessagePayloadDto["repliesTo"];
    offerQaId?: string;
  },
): ChatUnifiedMessagePayloadDto {
  return {
    text,
    ...(opts?.offerQaId ? { offerQaId: opts.offerQaId } : {}),
    ...(opts?.replyToMessageIds?.length
      ? { replyToMessageIds: opts.replyToMessageIds }
      : {}),
    ...(opts?.repliesTo?.length ? { repliesTo: opts.repliesTo } : {}),
  };
}

export function unifiedImagePayload(url: string, caption: string) {
  return buildPostImageBody([{ url }], { caption });
}

export function unifiedImageResponsePayload(url: string, caption: string) {
  return { images: [{ url }], caption } satisfies ChatUnifiedMessagePayloadDto;
}

export function unifiedVoiceResponsePayload(
  voiceUrl: string,
  voiceSeconds: number,
  replyToMessageIds?: string[],
) {
  return {
    voiceUrl,
    voiceSeconds,
    ...(replyToMessageIds?.length ? { replyToMessageIds } : {}),
  } satisfies ChatUnifiedMessagePayloadDto;
}

export function unifiedVoicePostBody(
  url: string,
  seconds: number,
  replyToIds?: string[],
): PostChatMessageBody {
  return buildPostVoiceBody(url, seconds, replyToIds);
}

export function unifiedDocResponsePayload(
  name: string,
  url: string,
  caption?: string,
) {
  return {
    documents: [{ name, size: "12 KB", kind: "pdf" as const, url }],
    ...(caption ? { caption } : {}),
  } satisfies ChatUnifiedMessagePayloadDto;
}

export function unifiedDocPostBody(
  name: string,
  url: string,
  caption?: string,
  replyToIds?: string[],
): PostChatMessageBody {
  return buildPostSingleDocumentBody(
    { name, size: "12 KB", kind: "pdf", url },
    { caption, replyToIds },
  );
}

export function unifiedDocsBundleResponsePayload(
  doc1Url: string,
  doc2Url: string,
  caption: string,
  replyToMessageIds?: string[],
) {
  return {
    documents: [
      { name: "a.png", size: "1 KB", kind: "other" as const, url: doc1Url },
      { name: "b.png", size: "2 KB", kind: "other" as const, url: doc2Url },
    ],
    caption,
    ...(replyToMessageIds?.length ? { replyToMessageIds } : {}),
  } satisfies ChatUnifiedMessagePayloadDto;
}

export function unifiedDocsBundlePostBody(
  doc1Url: string,
  doc2Url: string,
  caption: string,
  replyToIds?: string[],
): PostChatMessageBody {
  return buildPostDocumentsBundleBody(
    [
      { name: "a.png", size: "1 KB", kind: "other", url: doc1Url },
      { name: "b.png", size: "2 KB", kind: "other", url: doc2Url },
    ],
    { caption, replyToIds },
  );
}

export function unifiedAgreementResponsePayload(
  agreementId: string,
  title: string,
) {
  return {
    agreement: { agreementId, title, status: "pending_buyer" },
  } satisfies ChatUnifiedMessagePayloadDto;
}

export { buildPostTextBody, buildPostImageBody };

/** Fixtures de respuesta API (sin `type`) — alias usados en tests existentes. */
export function textPayload(
  text: string,
  opts?: { replyToIds?: string[]; offerQaId?: string },
): ChatUnifiedMessagePayloadDto {
  return unifiedTextPayload(text, {
    replyToMessageIds: opts?.replyToIds,
    offerQaId: opts?.offerQaId,
  });
}

export const imagePayload = unifiedImageResponsePayload;

export function audioPayload(
  voiceUrl: string,
  voiceSeconds: number,
  replyToMessageIds?: string[],
): ChatUnifiedMessagePayloadDto {
  return unifiedVoiceResponsePayload(voiceUrl, voiceSeconds, replyToMessageIds);
}

export function docPayload(
  name: string,
  url: string,
  caption?: string,
): ChatUnifiedMessagePayloadDto {
  return unifiedDocResponsePayload(name, url, caption);
}

export function docsBundlePayload(
  doc1Url: string,
  doc2Url: string,
  caption: string,
  replyToMessageIds?: string[],
): ChatUnifiedMessagePayloadDto {
  return unifiedDocsBundleResponsePayload(
    doc1Url,
    doc2Url,
    caption,
    replyToMessageIds,
  );
}

export const agreementPayload = unifiedAgreementResponsePayload;
