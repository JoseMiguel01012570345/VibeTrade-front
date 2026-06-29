import type { RouteSheet, RouteSheetPayload } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import type {
  PostChatMessageBody,
} from "@features/chat/Dtos/thread/chatMessagePayloadTypes";
import type {
  ChatMessageDto,
  ChatNotificationDto,
  ChatThreadDto,
  ChatThreadMemberDto,
  ChatThreadSummaryDto,
  CarrierExpelledBySellerApiResult,
  CarrierWithdrawFromThreadApiResult,
  LinkPreviewResult,
  PartySoftLeaveChatResult,
  RouteSheetPreselectedInviteApi,
  RouteTramoSubscriptionItemApi,
  TradeAgreementApiDto,
} from "@features/chat/Dtos/thread/chatApiTypes";
import { buildPostTextBody } from "@features/chat/logic/realtime/chatMessagePayloadContract";
import { apiFetch } from "@shared/services/http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "@shared/services/http/apiErrorMessage";
import { VtHttpError } from "@shared/services/http/VtHttpError";
import { getSessionToken } from "@shared/services/http/sessionToken";

/** Mensaje para toasts; no exponer JSON crudo ni `{ error, message }` completo. */
function chatApiErrorMessage(body: string, httpStatus: number): string {
  return (
    apiErrorTextToUserMessage(body, defaultUnexpectedErrorMessage()) ||
    `HTTP ${httpStatus}`
  );
}

function throwVtHttpFromChatResponse(res: Response, bodyText: string): never {
  const msg = chatApiErrorMessage(bodyText, res.status);
  let code: string | undefined;
  try {
    const j = JSON.parse(bodyText) as { error?: unknown; message?: unknown };
    if (typeof j?.error === "string" && j.error.trim()) code = j.error.trim();
  } catch {
    code = undefined;
  }
  throw new VtHttpError(msg, { status: res.status, code, bodyText });
}

/** `Error.message` cuando el servidor rechaza abrir chat como comprador en tu propia oferta. */
export const CHAT_CANNOT_MESSAGE_SELF = "CHAT_CANNOT_MESSAGE_SELF";

export async function createSocialGroupChatThread(
  memberUserIds: string[],
): Promise<ChatThreadDto> {
  const res = await apiFetch("/api/v1/chat/threads/social-group", {
    method: "POST",
    body: JSON.stringify({ memberUserIds }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatThreadDto;
}

export async function createOrGetChatThread(
  offerId: string,
  purchaseIntent: boolean = true,
  forceNew: boolean = false,
): Promise<ChatThreadDto> {
  const res = await apiFetch("/api/v1/chat/threads", {
    method: "POST",
    body: JSON.stringify({ offerId, purchaseIntent, forceNew }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 400) {
      try {
        const j = JSON.parse(t) as { error?: string };
        if (j.error === "cannot_message_self") {
          throw new Error(CHAT_CANNOT_MESSAGE_SELF);
        }
      } catch (e) {
        if (e instanceof Error && e.message === CHAT_CANNOT_MESSAGE_SELF)
          throw e;
      }
    }
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatThreadDto;
}

/** Avisa a la contraparte por SignalR (grupos user:*) de que quien llama salió del chat (lista / sin acuerdo). */
export async function postNotifyParticipantLeft(
  threadId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/notify-participant-left`,
    { method: "POST" },
  );
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
}

export async function deleteChatThread(threadId: string): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
}

/** Comprador/vendedor con acuerdo aceptado: expulsa a quien sale del hilo; el resto sigue pudiendo usar el chat. */
export async function postPartySoftLeaveChatThread(
  threadId: string,
  reason: string,
): Promise<PartySoftLeaveChatResult> {
  const res = await apiFetch(
    `/api/v1/policies/chat/threads/${encodeURIComponent(threadId)}/party-soft-leave`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim() }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throwVtHttpFromChatResponse(res, t);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await res.json()) as { skipClientTrustPenalty?: boolean };
    return { skipClientTrustPenalty: Boolean(j?.skipClientTrustPenalty) };
  }
  return { skipClientTrustPenalty: false };
}

export async function fetchChatThread(
  threadId: string,
): Promise<ChatThreadDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}`,
    {
      method: "GET",
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatThreadDto;
}

export async function fetchChatThreadByOffer(
  offerId: string,
): Promise<ChatThreadDto | null> {
  const res = await apiFetch(
    `/api/v1/chat/threads/by-offer/${encodeURIComponent(offerId)}`,
    { method: "GET" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatThreadDto;
}

export async function fetchSocialThreadMembers(
  threadId: string,
): Promise<ChatThreadMemberDto[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/members`,
    { method: "GET", cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatThreadMemberDto[];
}

export async function patchSocialGroupTitle(
  threadId: string,
  title: string | null,
): Promise<ChatThreadDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/social-title`,
    {
      method: "PATCH",
      body: JSON.stringify({ title: title ?? "" }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatThreadDto;
}

export async function fetchChatMessages(
  threadId: string,
): Promise<ChatMessageDto[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatMessageDto[];
}

export async function fetchThreadRouteSheets(
  threadId: string,
): Promise<RouteSheetPayload[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets`,
    { method: "GET", cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as RouteSheetPayload[];
}

/** True si el hilo permite crear otra hoja (acuerdo sin pago o con mercancía cobrada sin roadmap vinculado). */
export async function fetchThreadHasUnpaidRouteSheets(
  threadId: string,
): Promise<boolean> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/has-unpaid`,
    { method: "GET", cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await res.json()) as unknown;
    if (typeof j === "boolean") return j;
    if (typeof (j as { hasUnpaid?: unknown } | null)?.hasUnpaid === "boolean")
      return Boolean((j as { hasUnpaid?: unknown }).hasUnpaid);
  }
  const raw = await res.text().catch(() => "");
  return raw.trim().toLowerCase() === "true";
}

/** Invitación presel: hoja sin acceso al hilo (teléfono del usuario en un tramo). */
export async function fetchRouteSheetPreselPreview(
  threadId: string,
  routeSheetId: string,
): Promise<RouteSheetPayload> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(routeSheetId)}/presel-preview`,
    { method: "GET", cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as RouteSheetPayload;
}

/** Suscripciones a tramos persistidas en servidor (hojas publicadas del hilo). */
export async function fetchThreadRouteTramoSubscriptions(
  threadId: string,
): Promise<RouteTramoSubscriptionItemApi[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions`,
    { method: "GET", cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as RouteTramoSubscriptionItemApi[];
}

export async function postSellerExpelCarrier(
  threadId: string,
  body: {
    carrierUserId: string;
    reason: string;
    /** Ambos o ninguno: un solo tramo vs toda la operación. */
    routeSheetId?: string;
    stopId?: string;
  },
): Promise<CarrierExpelledBySellerApiResult> {
  const rs = body.routeSheetId?.trim() ?? "";
  const st = body.stopId?.trim() ?? "";
  const payload: Record<string, string> = {
    carrierUserId: body.carrierUserId,
    reason: body.reason,
  };
  if (rs.length > 0 && st.length > 0) {
    payload.routeSheetId = rs;
    payload.stopId = st;
  }
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/seller-expel-carrier`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as CarrierExpelledBySellerApiResult;
}

/** Transportista: abandona el hilo y des-suscribe tramos (no borra el hilo para comprador/vendedor). */
export async function postCarrierWithdrawFromThread(
  threadId: string,
  reason: string,
): Promise<CarrierWithdrawFromThreadApiResult> {
  const res = await apiFetch(
    `/api/v1/policies/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/carrier-withdraw`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throwVtHttpFromChatResponse(res, t);
  }
  return (await res.json()) as CarrierWithdrawFromThreadApiResult;
}

export async function postAcceptRouteTramoSubscriptions(
  threadId: string,
  body: { routeSheetId: string; carrierUserId: string; stopId?: string },
): Promise<{ acceptedCount: number }> {
  const sid = body.stopId?.trim();
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeSheetId: body.routeSheetId,
        carrierUserId: body.carrierUserId,
        ...(sid ? { stopId: sid } : {}),
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as { acceptedCount: number };
}

/** Transportista: responde a la invitación por contacto en hoja (<c>accepted</c> = suscripción al hilo; false = aviso al vendedor). */
export async function postCarrierRespondPreselInvite(
  threadId: string,
  body: { routeSheetId: string; stopId?: string; accepted: boolean },
): Promise<{ ok: boolean; accepted: boolean }> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheet-presel-invite`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeSheetId: body.routeSheetId,
        accepted: body.accepted,
        ...(body.stopId?.trim() ? { stopId: body.stopId.trim() } : {}),
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as { ok: boolean; accepted: boolean };
}

export async function postRejectRouteTramoSubscriptions(
  threadId: string,
  body: { routeSheetId: string; carrierUserId: string; stopId?: string },
): Promise<{ rejectedCount: number }> {
  const sid = body.stopId?.trim();
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeSheetId: body.routeSheetId,
        carrierUserId: body.carrierUserId,
        ...(sid ? { stopId: sid } : {}),
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as { rejectedCount: number };
}

export async function putThreadRouteSheet(
  threadId: string,
  sheet: RouteSheetPayload,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(sheet.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sheet),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
}

/** Aviso in-app solo por tramos cuyo teléfono cambió al guardar (tras confirmar en el modal). */
export async function postRouteSheetNotifyPreselected(
  threadId: string,
  routeSheetId: string,
  invites: RouteSheetPreselectedInviteApi[],
): Promise<{ notifiedCount: number }> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(routeSheetId)}/notify-preselected`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invites }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  const j = (await res.json()) as { notifiedCount?: number };
  return { notifiedCount: j.notifiedCount ?? 0 };
}

export async function deleteThreadRouteSheet(
  threadId: string,
  routeSheetId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(routeSheetId)}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
}

/** Transportista: acuse de edición de hoja (aceptar / rechazar). */
export async function postRouteSheetEditCarrierResponse(
  threadId: string,
  routeSheetId: string,
  accept: boolean,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(routeSheetId)}/edit-carrier-response`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
}

export async function fetchThreadTradeAgreements(
  threadId: string,
): Promise<TradeAgreementApiDto[]> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements`,
    { method: "GET", cache: "no-store" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as TradeAgreementApiDto[];
}

/** Persiste vínculo acuerdo ↔ hoja de ruta (seller). `routeSheetId` null = desvincular. */
export async function patchThreadTradeAgreementRouteLink(
  threadId: string,
  agreementId: string,
  routeSheetId: string | null,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}/route-link`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeSheetId }),
    },
  );
  await throwIfTradeAgreementResponseNotOk(res);
  return (await res.json()) as TradeAgreementApiDto;
}

async function throwIfTradeAgreementResponseNotOk(
  res: Response,
): Promise<void> {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  let message = text;
  try {
    const j = JSON.parse(text) as { message?: string };
    if (typeof j.message === "string" && j.message.trim())
      message = j.message.trim();
  } catch {
    /* raw body */
  }
  const err = new Error(message || `HTTP ${res.status}`) as Error & {
    status?: number;
  };
  err.status = res.status;
  throw err;
}

export async function postThreadTradeAgreement(
  threadId: string,
  body: Record<string, unknown>,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements`,
    { method: "POST", body: JSON.stringify(body) },
  );
  await throwIfTradeAgreementResponseNotOk(res);
  return (await res.json()) as TradeAgreementApiDto;
}

export async function patchThreadTradeAgreement(
  threadId: string,
  agreementId: string,
  body: Record<string, unknown>,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
  await throwIfTradeAgreementResponseNotOk(res);
  return (await res.json()) as TradeAgreementApiDto;
}

export async function postThreadTradeAgreementRespond(
  threadId: string,
  agreementId: string,
  accept: boolean,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}/respond`,
    { method: "POST", body: JSON.stringify({ accept }) },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as TradeAgreementApiDto;
}

export async function deleteThreadTradeAgreement(
  threadId: string,
  agreementId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
}

export async function postThreadTradeAgreementDuplicate(
  threadId: string,
  agreementId: string,
): Promise<TradeAgreementApiDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements/${encodeURIComponent(agreementId)}/duplicate`,
    { method: "POST" },
  );
  await throwIfTradeAgreementResponseNotOk(res);
  return (await res.json()) as TradeAgreementApiDto;
}

export async function postThreadRouteSheetDuplicate(
  threadId: string,
  routeSheetId: string,
): Promise<RouteSheet> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets/${encodeURIComponent(routeSheetId)}/duplicate`,
    { method: "POST" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as RouteSheet;
}

export async function postChatMessage(
  threadId: string,
  body: PostChatMessageBody,
): Promise<ChatMessageDto> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatMessageDto;
}

export async function postChatTextMessage(
  threadId: string,
  text: string,
  options?: { replyToIds?: string[] },
): Promise<ChatMessageDto> {
  return postChatMessage(
    threadId,
    buildPostTextBody(text, { replyToIds: options?.replyToIds }),
  );
}

export async function fetchChatThreads(): Promise<ChatThreadSummaryDto[]> {
  const res = await apiFetch("/api/v1/chat/threads", { method: "GET" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatThreadSummaryDto[];
}

export async function fetchChatNotifications(options?: {
  /** ISO 8601; inicio del rango (inclusive). */
  from?: string;
  /** ISO 8601; fin del rango (inclusive). */
  to?: string;
}): Promise<ChatNotificationDto[]> {
  const q = new URLSearchParams();
  if (options?.from?.trim()) q.set("from", options.from.trim());
  if (options?.to?.trim()) q.set("to", options.to.trim());
  const qs = q.toString();
  const url =
    qs.length > 0
      ? `/api/v1/me/notifications?${qs}`
      : "/api/v1/me/notifications";
  const res = await apiFetch(url, { method: "GET" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatNotificationDto[];
}

/**
 * Tras el login: el backend marca <c>delivered</c> en bloque en mensajes entrantes pendientes
 * (hasta 500 recientes por hilo) para notificar a emisores vía hub.
 */
export async function postAckPendingDeliveryOnLogin(): Promise<number> {
  const res = await apiFetch("/api/v1/chat/ack-pending-delivery-on-login", {
    method: "POST",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  const j = (await res.json()) as { applied: number };
  return typeof j.applied === "number" ? j.applied : 0;
}

export async function patchChatMessageStatus(
  threadId: string,
  messageId: string,
  status: "delivered" | "read",
): Promise<ChatMessageDto | null> {
  const res = await apiFetch(
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
  // Mensaje ya no existe / no visible para este hilo: no reintentar en loop.
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
  return (await res.json()) as ChatMessageDto;
}

export async function markChatNotificationsRead(ids?: string[]): Promise<void> {
  const res = await apiFetch("/api/v1/me/notifications/mark-read", {
    method: "POST",
    body: JSON.stringify({ ids: ids ?? null }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(chatApiErrorMessage(t, res.status));
  }
}

export async function fetchLinkPreview(
  url: string,
): Promise<LinkPreviewResult | null> {
  const q = new URLSearchParams();
  q.set("url", url);
  const res = await apiFetch(`/api/v1/link-preview?${q.toString()}`, {
    method: "GET",
  });
  if (!res.ok) return null;
  return (await res.json()) as LinkPreviewResult;
}

export function hasChatSession(): boolean {
  return !!getSessionToken();
}
