import { expect } from "vitest";
import type { ChatMessageDto } from "@/utils/chat/chatApi";
import type { PostChatMessageBody } from "@/utils/chat/chatMessagePayloadContract";

function payload(dto: ChatMessageDto): Record<string, unknown> {
  return dto.payload as Record<string, unknown>;
}

export function assertPostTextBody(
  body: PostChatMessageBody,
  expectedText: string,
  replyToId?: string,
) {
  expect(body.text).toBe(expectedText);
  expect(body).not.toHaveProperty("type");
  if (replyToId) {
    expect(body.replyToIds).toContain(replyToId);
  }
}

export function assertPostImageBody(
  body: PostChatMessageBody,
  expectedUrl: string,
  expectedCaption: string,
) {
  expect(body).not.toHaveProperty("type");
  expect(body.images).toHaveLength(1);
  expect(body.images![0]!.url).toBe(expectedUrl);
  expect(body.caption).toBe(expectedCaption);
}

export function assertImagePayload(
  dto: ChatMessageDto,
  expectedImageUrl: string,
  expectedCaption: string,
) {
  const p = payload(dto);
  expect(p).not.toHaveProperty("type");
  const imgs = p.images as { url: string }[] | undefined;
  expect(imgs).toBeDefined();
  expect(imgs).toHaveLength(1);
  expect(imgs![0]!.url).toBe(expectedImageUrl);
  expect(p.caption).toBe(expectedCaption);
}

export function assertAudioPayload(
  dto: ChatMessageDto,
  expectedUrl: string,
  seconds: number,
  replyToId?: string,
) {
  const p = payload(dto);
  expect(p).not.toHaveProperty("type");
  expect(p.voiceUrl).toBe(expectedUrl);
  expect(p.voiceSeconds).toBe(seconds);
  expect(p.url).toBeUndefined();
  if (replyToId) {
    assertReplyTargetsContainsMessageId(p, replyToId);
  }
}

export function assertTextPayload(
  dto: ChatMessageDto,
  expectedText: string,
  replyToId?: string,
) {
  const p = payload(dto);
  expect(p).not.toHaveProperty("type");
  expect(p.text).toBe(expectedText);
  if (replyToId) {
    assertReplyTargetsContainsMessageId(p, replyToId);
  }
}

export function assertDocPayload(
  dto: ChatMessageDto,
  name: string,
  url: string,
  caption?: string,
) {
  const p = payload(dto);
  expect(p).not.toHaveProperty("type");
  const docs = p.documents as Record<string, unknown>[] | undefined;
  expect(docs?.length).toBeGreaterThanOrEqual(1);
  const doc = docs![0]!;
  expect(doc.name).toBe(name);
  expect(doc.url).toBe(url);
  if (caption !== undefined) expect(p.caption).toBe(caption);
}

function assertReplyTargetsContainsMessageId(
  payloadObj: Record<string, unknown>,
  quotedId: string,
) {
  const ids = payloadObj.replyToMessageIds as string[] | undefined;
  if (ids?.includes(quotedId)) return;

  const replies = payloadObj.repliesTo as
    | { messageId?: string }[]
    | undefined;
  expect(replies?.some((q) => q.messageId === quotedId)).toBe(true);
}
