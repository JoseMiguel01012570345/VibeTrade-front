import { createElement as h } from "react";
import * as signalR from "@microsoft/signalr";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { syncChatNotificationsFromServer } from "../notifications/notificationsSync";
import { getSessionToken } from "../http/sessionToken";
import {
  getOpenChatThreadIdFromLocation,
  incomingChatAuthorLabel,
  previewLineFromChatMessageDto,
} from "./chatInboundUi";
import { mergeChatSenderLabelsIntoProfileStore } from "./chatSenderLabels";
import {
  patchChatMessageStatus,
  type ChatMessageDto,
  type ChatThreadDto,
} from "./chatApi";

function handleIncomingPersistedChatMessage(dto: ChatMessageDto): void {
  mergeChatSenderLabelsIntoProfileStore([dto]);
  const me = useAppStore.getState().me.id;
  if (dto.senderUserId === me || !dto.threadId.startsWith("cth_")) return;

  void patchChatMessageStatus(dto.threadId, dto.id, "delivered").catch(
    () => {},
  );
  void syncChatNotificationsFromServer();

  if (getOpenChatThreadIdFromLocation() === dto.threadId) return;

  const author = incomingChatAuthorLabel(dto);
  const preview = previewLineFromChatMessageDto(dto);
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
  if (!token) return;
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
    })();
  });

  void conn.start().catch((e) => console.error(e));
}

export function stopChatRealtime(): void {
  joinedThreads.clear();
  if (conn) {
    void conn.stop();
    conn = null;
  }
}

export async function joinChatThread(threadId: string): Promise<void> {
  if (!threadId.startsWith("cth_")) return;
  joinedThreads.add(threadId);
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
    } catch (e) {
      console.error(e);
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
  if (conn?.state === signalR.HubConnectionState.Connected) {
    try {
      await conn.invoke("NotifyOthersUserLeftChat", threadId);
    } catch {
      /* ignore */
    }
  }
}
