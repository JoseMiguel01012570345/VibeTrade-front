import { createElement as h } from "react";
import * as signalR from "@microsoft/signalr";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { notifyDesktopIfUnfocused } from "../notifications/desktopNotifications";
import { notificationDeepLink } from "../notifications/notificationRoutes";
import { syncChatNotificationsFromServer } from "../notifications/notificationsSync";
import { getSessionToken } from "../http/sessionToken";
import { postNotifyParticipantLeft } from "./chatApi";
import {
  getOpenChatThreadIdFromLocation,
  incomingChatAuthorLabel,
  previewLineFromChatMessageDto,
} from "./chatInboundUi";
import { mergeChatSenderLabelsIntoProfileStore } from "./chatSenderLabels";
import {
  fetchThreadRouteTramoSubscriptions,
  fetchThreadRouteSheets,
  patchChatMessageStatus,
  type ChatMessageDto,
  type ChatThreadDto,
  type RouteTramoSubscriptionItemApi,
} from "./chatApi";
import {
  type RouteSheet,
  routeSheetEditAcksRecordFromSheets,
} from "../../pages/chat/domain/routeSheetTypes";
import { mergeMissingChatListThreadsFromServer } from "./mergeMissingChatListThreadsFromServer";

function handleIncomingPersistedChatMessage(dto: ChatMessageDto): void {
  mergeChatSenderLabelsIntoProfileStore([dto]);
  const me = useAppStore.getState().me.id;
  if (dto.senderUserId === me || !dto.threadId.startsWith("cth_")) return;

  void patchChatMessageStatus(dto.threadId, dto.id, "delivered").catch(
    () => {},
  );

  if (getOpenChatThreadIdFromLocation() === dto.threadId) return;

  void syncChatNotificationsFromServer();

  const author = incomingChatAuthorLabel(dto);
  const preview = previewLineFromChatMessageDto(dto);

  notifyDesktopIfUnfocused({
    title: author,
    body: preview,
    tag: `chat-msg-${dto.id}`,
    navigateTo: `/chat/${encodeURIComponent(dto.threadId)}`,
  });

  toast.custom(
    (t) =>
      h(
        "button",
        {
          type: "button",
          className:
            "flex w-full max-w-[min(100vw-2rem,24rem)] cursor-pointer flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left shadow-lg transition hover:bg-[color-mix(in_oklab,var(--muted)_12%,var(--surface))]",
          onClick: () => {
            toast.dismiss(t.id);
            window.location.assign(`/chat/${encodeURIComponent(dto.threadId)}`);
          },
        },
        h(
          "div",
          { className: "text-[13px] font-black text-[var(--text)]" },
          author,
        ),
        h(
          "div",
          {
            className:
              "text-[13px] leading-snug text-[var(--muted)] [overflow-wrap:break-word] whitespace-pre-wrap",
          },
          preview,
        ),
        h(
          "div",
          { className: "text-[11px] font-bold text-[var(--primary)]" },
          "Abrir chat",
        ),
      ),
    { duration: 8000, id: `chat-in-${dto.id}` },
  );
}

let conn: signalR.HubConnection | null = null;
const joinedThreads = new Set<string>();
const joinedOffers = new Set<string>();

export type RouteTramoSubscriptionsChangedPayload = {
  threadId: string;
  routeSheetId: string;
  change: string;
  items: RouteTramoSubscriptionItemApi[];
  actorUserId: string;
  /** Publicación emergente <c>emo_*</c>; mismo id que <c>JoinOffer</c> en la ficha. */
  emergentOfferId: string | null;
};

const routeTramoSubsListeners = new Set<
  (p: RouteTramoSubscriptionsChangedPayload) => void
>();

/** Panel de suscriptores u otros: recibe la misma respuesta del GET ya aplicada al store. */
export function subscribeRouteTramoSubscriptionsChanged(
  cb: (p: RouteTramoSubscriptionsChangedPayload) => void,
): () => void {
  routeTramoSubsListeners.add(cb);
  return () => {
    routeTramoSubsListeners.delete(cb);
  };
}

function hubUrl(): string {
  const base =
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
      /\/+$/,
      "",
    ) ?? "";
  if (base) return `${base}/ws/chat`;
  return "/ws/chat";
}

export function startChatRealtime(): void {
  const token = getSessionToken();
  if (!token) {
    stopChatRealtime();
    return;
  }
  if (conn?.state === signalR.HubConnectionState.Connected) return;
  if (conn) {
    void conn.start().catch((e) => console.error(e));
    return;
  }

  conn = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl(), {
      accessTokenFactory: () => getSessionToken() ?? "",
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.ServerSentEvents,
      // Debe coincidir con CORS `AllowCredentials()` en el servidor (negotiate cross-origin).
      withCredentials: true,
    })
    .withAutomaticReconnect()
    .build();

  conn.on("messageCreated", (payload: { message: ChatMessageDto }) => {
    const dto = payload?.message;
    if (!dto?.threadId) return;
    useMarketStore.getState().onChatMessageFromServer(dto.threadId, dto);
    handleIncomingPersistedChatMessage(dto);
  });

  conn.on(
    "messageStatusChanged",
    (payload: {
      threadId: string;
      messageId: string;
      status: string;
      updatedAtUtc?: string;
    }) => {
      if (!payload?.threadId || !payload.messageId) return;
      useMarketStore
        .getState()
        .onChatMessageStatusFromServer(
          payload.threadId,
          payload.messageId,
          payload.status,
          payload.updatedAtUtc,
        );
    },
  );

  conn.on("threadCreated", (payload: { thread?: ChatThreadDto }) => {
    const dto = payload?.thread;
    if (!dto?.id) return;
    useMarketStore.getState().onThreadCreatedFromServer(dto);
  });

  conn.on("notificationCreated", () => {
    void (async () => {
      await syncChatNotificationsFromServer();
      const items = useAppStore.getState().notifications;
      const head = items[0];
      if (!head || head.read) return;
      const open = getOpenChatThreadIdFromLocation();
      if (
        (head.kind === "chat_message" ||
          head.kind === "route_tramo_subscribe" ||
          head.kind === "route_tramo_subscribe_accepted" ||
          head.kind === "route_tramo_seller_expelled" ||
          head.kind === "route_sheet_presel" ||
          head.kind === "route_sheet_presel_decl" ||
          head.kind === "store_trust_penalty" ||
          head.kind === "peer_party_exited") &&
        open &&
        head.threadId === open
      )
        return;
      notifyDesktopIfUnfocused({
        title: head.title,
        body: head.body,
        tag: `notif-${head.id}`,
        navigateTo: notificationDeepLink(head),
      });
    })();
  });

  conn.on("offerCommentsUpdated", (payload: { offerId?: string }) => {
    const oid = payload?.offerId;
    if (!oid) return;
    void useMarketStore.getState().refreshOfferQaFromServer(oid);
  });

  conn.on(
    "routeTramoSubscriptionsChanged",
    (payload: {
      threadId?: string;
      routeSheetId?: string;
      change?: string;
      actorUserId?: string | null;
      emergentOfferId?: string | null;
    }) => {
      const tid = payload?.threadId?.trim() ?? "";
      const sid = payload?.routeSheetId?.trim() ?? "";
      const change = (payload?.change ?? "").trim().toLowerCase();
      const actor = payload?.actorUserId?.trim() ?? "";
      const emergentOfferId = payload?.emergentOfferId?.trim() ?? "";
      if (tid.length < 4 || sid.length < 1 || change.length < 1) return;

      void (async () => {
        let items: RouteTramoSubscriptionItemApi[];
        try {
          items = await fetchThreadRouteTramoSubscriptions(tid);
        } catch {
          return;
        }
        const me = useAppStore.getState().me.id;
        useMarketStore
          .getState()
          .applyThreadRouteTramoSubscriptions(tid, items, me);

        if (
          change === "accept" &&
          !useMarketStore.getState().threads[tid]
        ) {
          void mergeMissingChatListThreadsFromServer();
        }

        if (tid.startsWith("cth_") && useMarketStore.getState().threads[tid]) {
          try {
            const sheets = await fetchThreadRouteSheets(tid);
            const acks = routeSheetEditAcksRecordFromSheets(sheets as RouteSheet[]);
            useMarketStore.setState((s) => {
              const t = s.threads[tid];
              if (!t) return s;
              return {
                ...s,
                threads: {
                  ...s.threads,
                  [tid]: {
                    ...t,
                    routeSheets: sheets as unknown as typeof t.routeSheets,
                    routeSheetEditAcks: {
                      ...(t.routeSheetEditAcks ?? {}),
                      ...acks,
                    },
                  },
                },
              };
            });
            if (change === "sheet_edit_pending") {
              const t = useMarketStore.getState().threads[tid];
              const carrierAck = t?.routeSheetEditAcks?.[sid]?.byCarrier?.[me];
              if (
                carrierAck === "pending" &&
                getOpenChatThreadIdFromLocation() !== tid
              ) {
                notifyDesktopIfUnfocused({
                  title: "Cambios en la hoja de ruta",
                  body: "Aceptá o rechazá la edición en la pestaña Rutas del chat.",
                  tag: `route-edit-${tid}-${sid}`,
                  navigateTo: `/chat/${encodeURIComponent(tid)}`,
                });
              }
            }
          } catch {
            /* hilo sin acceso o red */
          }
        }

        const enriched: RouteTramoSubscriptionsChangedPayload = {
          threadId: tid,
          routeSheetId: sid,
          change,
          items,
          actorUserId: actor,
          emergentOfferId:
            emergentOfferId.length >= 4 ? emergentOfferId : null,
        };
        for (const cb of routeTramoSubsListeners) {
          try {
            cb(enriched);
          } catch {
            /* ignore */
          }
        }

        if (actor.length > 0 && me === actor) return;
        const msg =
          change === "request" ?
            "Nueva solicitud de suscripción a la hoja de ruta."
          : change === "accept" ?
            "Se confirmó un transportista en la hoja de ruta."
          : change === "reject" ?
            "Se rechazó una solicitud en la hoja de ruta."
          : change === "withdraw" ?
            "Un transportista se retiró de la hoja de ruta."
          : change === "sheet_edit_pending" ?
            "La hoja de ruta se editó: si tenés un tramo afectado, abrí Rutas para aceptar o rechazar."
          : change === "sheet_edit_accept" ?
            "Un transportista aceptó los cambios en la hoja de ruta."
          : change === "sheet_edit_reject" ?
            "Un transportista rechazó los cambios en la hoja de ruta."
          : change === "presel_decline" ?
            "Un transportista rechazó la invitación; la hoja de ruta se actualizó."
          : "Se actualizaron las suscripciones a la hoja de ruta.";
        if (change === "sheet_edit_pending") {
          const byCarrier =
            useMarketStore.getState().threads[tid]?.routeSheetEditAcks?.[sid]
              ?.byCarrier;
          const mustAck = byCarrier?.[me] === "pending";
          const ackHydrated = !!byCarrier;
          if (ackHydrated && !mustAck) return;
          if (getOpenChatThreadIdFromLocation() === tid) return;
        }
        toast.success(msg);
      })();
    },
  );

  conn.on(
    "participantLeft",
    (payload: { threadId?: string; userId?: string; displayName?: string }) => {
      if (!payload?.threadId || !payload.userId) return;
      useMarketStore
        .getState()
        .onParticipantLeftFromServer(
          payload.threadId,
          payload.userId,
          payload.displayName ?? "",
        );
    },
  );

  conn.on(
    "peerPartyExitedChat",
    (payload: {
      threadId?: string;
      leaverUserId?: string;
      reason?: string;
      atUtc?: string;
      leaverRole?: "buyer" | "seller";
    }) => {
      const tid = payload?.threadId?.trim() ?? "";
      const uid = payload?.leaverUserId?.trim() ?? "";
      if (tid.length < 4 || uid.length < 2) return;
      useMarketStore.getState().applyPeerPartyExitedFromServer(tid, {
        leaverUserId: uid,
        reason: payload?.reason,
        atUtc: payload?.atUtc,
        leaverRole: payload?.leaverRole,
      });
    },
  );

  conn.onreconnected(() => {
    void (async () => {
      if (!conn) return;
      for (const id of joinedThreads) {
        try {
          await conn.invoke("JoinThread", id);
        } catch {
          /* ignore */
        }
      }
      for (const oid of joinedOffers) {
        try {
          await conn.invoke("JoinOffer", oid);
        } catch {
          /* ignore */
        }
      }
    })();
  });

  void conn.start().catch((e) => console.error(e));
}

export function stopChatRealtime(): void {
  joinedThreads.clear();
  joinedOffers.clear();
  if (conn) {
    void conn.stop();
    conn = null;
  }
}

/** Suscripción al grupo <c>offer:{id}</c> (comentarios en tiempo real en la ficha). */
export async function joinOfferChannel(offerId: string): Promise<void> {
  if (!offerId || offerId.length < 2) return;
  startChatRealtime();
  joinedOffers.add(offerId);
  let attempts = 0;
  while (
    conn &&
    conn.state !== signalR.HubConnectionState.Connected &&
    attempts < 80
  ) {
    await new Promise((r) => setTimeout(r, 50));
    attempts++;
  }
  if (conn?.state === signalR.HubConnectionState.Connected) {
    try {
      await conn.invoke("JoinOffer", offerId);
    } catch (e) {
      console.error(e);
    }
  }
}

export async function leaveOfferChannel(offerId: string): Promise<void> {
  joinedOffers.delete(offerId);
  if (conn?.state === signalR.HubConnectionState.Connected) {
    try {
      await conn.invoke("LeaveOffer", offerId);
    } catch {
      /* ignore */
    }
  }
}

export async function joinChatThread(threadId: string): Promise<void> {
  if (!threadId.startsWith("cth_")) return;
  joinedThreads.add(threadId);
  for (let round = 0; round < 2; round++) {
    startChatRealtime();
    let attempts = 0;
    while (
      conn &&
      conn.state !== signalR.HubConnectionState.Connected &&
      attempts < 80
    ) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }
    if (conn?.state === signalR.HubConnectionState.Connected) {
      try {
        await conn.invoke("JoinThread", threadId);
        return;
      } catch (e) {
        console.error(e);
        if (round === 0) {
          // Negociar de nuevo con el token actual: el WS puede quedar con access_token/identidad
          // del connect anterior a login o cambio de sesión, y el hub denegaba el grupo del hilo.
          stopChatRealtime();
          joinedThreads.add(threadId);
        }
      }
    } else if (round === 0) {
      stopChatRealtime();
      joinedThreads.add(threadId);
    }
  }
}

/** Solo deja el grupo SignalR del hilo (p. ej. al navegar). No avisa a otros. */
export async function disconnectFromChatThread(
  threadId: string,
): Promise<void> {
  joinedThreads.delete(threadId);
  if (conn?.state === signalR.HubConnectionState.Connected) {
    try {
      await conn.invoke("DisconnectFromThread", threadId);
    } catch {
      /* ignore */
    }
  }
}

/** Tras confirmar «Salir»: avisa a los demás y deja el grupo. */
export async function notifyChatParticipantsUserLeft(
  threadId: string,
): Promise<void> {
  joinedThreads.delete(threadId);
  if (getSessionToken()) {
    try {
      await postNotifyParticipantLeft(threadId);
      return;
    } catch (e) {
      console.error(e);
    }
  }
  if (conn?.state === signalR.HubConnectionState.Connected) {
    try {
      await conn.invoke("NotifyOthersUserLeftChat", threadId);
    } catch {
      /* ignore */
    }
  }
}
