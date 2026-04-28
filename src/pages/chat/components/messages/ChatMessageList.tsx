import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppStore } from "../../../../app/store/useAppStore";
import { cn } from "../../../../lib/cn";
import type { Message } from "../../../../app/store/marketStoreTypes";
import type { Thread } from "../../../../app/store/useMarketStore";
import {
  buyerFirstNameForThread,
  chatBubbleHeaderLabel,
  inferMessageFromSeller,
  resolveBuyerUserId,
  resolveSellerUserId,
} from "../../../../utils/chat/chatParticipantLabels";
import { normalizeThreadMessages } from "../../../../utils/chat/chatMerge";
import { ProtectedMediaImg } from "../../../../components/media/ProtectedMediaImg";
import {
  deliveryStateForMineMessage,
  MessageBody,
  MsgMeta,
} from "../media/ChatMedia";

/** Avatar + enlace de la columna lateral: mensajes del comprador no usan la tienda. */
function messageBubbleAvatarColumn(
  thread: Thread,
  store: Thread["store"],
  me: Me,
  m: Message,
  profileDisplayNames: Record<string, string>,
  profileAvatarUrls: Record<string, string>,
): { href: string; avatarUrl?: string; avatarLetter: string; trust: number } {
  if (m.from === "system") {
    return { href: `/chat/${thread.id}`, avatarLetter: "?", trust: 0 };
  }
  if (m.from === "me") {
    const sellerUid = resolveSellerUserId(thread);
    const imSeller = sellerUid != null && me.id === sellerUid;
    if (imSeller) {
      return {
        href: `/store/${store.id}/vitrina`,
        avatarUrl: store.avatarUrl,
        avatarLetter: store.name.slice(0, 1).toUpperCase(),
        trust: store.trustScore,
      };
    }
    return {
      href: `/profile/${me.id}`,
      avatarUrl: me.avatarUrl,
      avatarLetter: me.name.slice(0, 1).toUpperCase(),
      trust: me.trustScore,
    };
  }
  const peerMsgFromSeller = inferMessageFromSeller(m, thread, me.id);
  if (peerMsgFromSeller) {
    return {
      href: `/store/${store.id}/vitrina`,
      avatarUrl: store.avatarUrl,
      avatarLetter: store.name.slice(0, 1).toUpperCase(),
      trust: store.trustScore,
    };
  }
  const buyerUid = resolveBuyerUserId(thread, me.id);
  const letter =
    buyerFirstNameForThread(thread, me.id, me.name, profileDisplayNames)
      .slice(0, 1)
      .toUpperCase() || "C";
  const buyerPic =
    thread.buyerAvatarUrl?.trim() ||
    (buyerUid ? profileAvatarUrls[buyerUid]?.trim() : undefined) ||
    undefined;
  return {
    href: buyerUid ? `/profile/${buyerUid}` : `/chat/${thread.id}`,
    avatarUrl: buyerPic,
    avatarLetter: letter,
    trust: 0,
  };
}

/** Sólo hilo cth_: marcar leído en API cuando el mensaje entra al viewport (no mientras B scrolleó hacia arriba). */
function incomingMessageCanMarkReadOnVisible(
  m: Message,
  hasReadHandler: boolean,
): boolean {
  if (!hasReadHandler) return false;
  if (m.from !== "other" || !m.id || m.id.startsWith("pend_")) return false;
  if (
    m.type !== "text" &&
    m.type !== "image" &&
    m.type !== "audio" &&
    m.type !== "doc" &&
    m.type !== "docs" &&
    m.type !== "agreement"
  ) {
    return false;
  }
  if ("chatStatus" in m && m.chatStatus === "read") return false;
  if ("read" in m && m.read === true) return false;
  return true;
}

/**
 * Fila con IntersectionObserver (root = lista con scroll) para enviar visto al hub
 * sólo cuando B ve el mensaje en el área visible.
 */
function TrackedMessageRow({
  listRef,
  m,
  onIncomingMessageVisible,
  className,
  onClick,
  children,
}: {
  listRef: RefObject<HTMLDivElement | null>;
  m: Message;
  onIncomingMessageVisible?: (messageId: string) => void;
  className: string;
  onClick: (e: MouseEvent) => void;
  children: ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const shouldTrack = useMemo(
    () => incomingMessageCanMarkReadOnVisible(m, !!onIncomingMessageVisible),
    [m, onIncomingMessageVisible],
  );

  useLayoutEffect(() => {
    if (!shouldTrack) return;
    const el = rowRef.current;
    const root = listRef.current;
    if (!el || !root) return;
    const o = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            onIncomingMessageVisible?.(m.id);
          }
        }
      },
      { root, rootMargin: "0px 0px 0px 0px", threshold: 0.12 },
    );
    o.observe(el);
    return () => o.disconnect();
  }, [shouldTrack, m.id, onIncomingMessageVisible, listRef]);

  return (
    <div
      ref={rowRef}
      className={className}
      onClick={onClick}
      data-chat-message-row={m.id}
    >
      {children}
    </div>
  );
}

function TrustChip({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-1 text-xs font-black text-[var(--muted)]",
        className,
      )}
      data-chat-interactive
      title="Indicador de confianza. Helper: reputación basada en historial de acciones."
    >
      {score}
    </span>
  );
}

type Me = {
  id: string;
  name: string;
  phone: string;
  trustScore: number;
  avatarUrl?: string;
};

type Props = {
  listRef: RefObject<HTMLDivElement | null>;
  /** Anclaje al final del hilo: visible en el visor = el usuario vio el último mensaje. */
  listEndRef?: RefObject<HTMLDivElement | null>;
  onListScroll?: () => void;
  thread: Thread;
  me: Me;
  selected: Record<string, boolean>;
  chatActionsLocked: boolean;
  toggleSelectRow: (e: MouseEvent, id: string) => void;
  setLightboxUrl: (url: string) => void;
  respondTradeAgreement: (
    threadId: string,
    agreementId: string,
    response: "accept" | "reject",
  ) => Promise<boolean>;
  setFocusRouteId: (id: string | null) => void;
  setRailOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  /** Hilos cth_: «read» al API sólo cuando el mensaje entra al viewport. */
  onIncomingMessageVisibleForRead?: (messageId: string) => void;
};

export function ChatMessageList({
  listRef,
  listEndRef,
  onListScroll,
  thread,
  me,
  selected,
  chatActionsLocked,
  toggleSelectRow,
  setLightboxUrl,
  respondTradeAgreement,
  setFocusRouteId,
  setRailOpen,
  onIncomingMessageVisibleForRead,
}: Props) {
  const store = thread.store;
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);
  const profileAvatarUrls = useAppStore((s) => s.profileAvatarUrls);

  const orderedMessages = useMemo(
    () => normalizeThreadMessages(thread.messages),
    [thread.messages],
  );

  const scrollToQuotedMessage = useCallback(
    (messageId: string) => {
      const root = listRef.current;
      if (!root || !messageId) return;
      const rows = root.querySelectorAll<HTMLElement>("[data-chat-message-row]");
      const el = [...rows].find((r) => r.dataset.chatMessageRow === messageId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [listRef],
  );

  /** Solo el comprador puede aceptar/rechazar; el vendedor ve estado pendiente sin esas acciones. */
  const viewerIsBuyer = useMemo(() => {
    const buyerUid = resolveBuyerUserId(thread, me.id);
    return buyerUid != null && buyerUid === me.id;
  }, [thread, me.id]);

  return (
    <div
      ref={listRef as RefObject<HTMLDivElement>}
      onScroll={onListScroll}
      className="vt-card flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[color-mix(in_oklab,var(--bg)_60%,var(--surface))] to-[var(--surface)] px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {orderedMessages.map((m) => {
        const mine = m.from === "me";
        const system = m.from === "system";
        const agreementDoc =
          m.type === "agreement"
            ? thread.contracts?.find((c) => c.id === m.agreementId)
            : undefined;
        const isSelected = !!selected[m.id];
        const phone = mine ? me.phone : "+54 11 0000-0000";
        const pendingRead = mine && "read" in m && m.read === false;
        const {
          href: peerProfileHref,
          avatarUrl,
          avatarLetter,
          trust,
        } = messageBubbleAvatarColumn(
          thread,
          store,
          me,
          m,
          profileDisplayNames,
          profileAvatarUrls,
        );
        const waVoiceSent = mine && m.type === "audio";
        const isAudio = m.type === "audio";

        const rowClassName = cn(
          "grid items-end gap-2.5",
          system
            ? "grid-cols-1"
            : mine
              ? "grid-cols-[minmax(0,1fr)_36px]"
              : "grid-cols-[36px_minmax(0,1fr)]",
        );
        const rowOnClick = (e: MouseEvent) => {
          if (chatActionsLocked || system || m.type === "agreement") return;
          toggleSelectRow(e, m.id);
        };
        return (
          <TrackedMessageRow
            key={m.id}
            listRef={listRef}
            m={m}
            onIncomingMessageVisible={onIncomingMessageVisibleForRead}
            className={rowClassName}
            onClick={rowOnClick}
          >
            {!system && (
              <Link
                to={peerProfileHref}
                className={cn(
                  "relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/35 bg-gradient-to-br from-[var(--primary)] to-[#7c3aed] font-black text-white",
                  mine ? "col-start-2 justify-self-end" : "col-start-1",
                )}
                title="Ver perfil"
                data-chat-interactive
                onClick={(e) => e.stopPropagation()}
              >
                {avatarUrl ? (
                  <ProtectedMediaImg
                    src={avatarUrl}
                    alt=""
                    wrapperClassName="absolute inset-0 size-full"
                    className="size-full object-cover"
                  />
                ) : (
                  avatarLetter
                )}
              </Link>
            )}

            <div
              className={cn(
                isAudio
                  ? "w-[min(420px,100%)] max-w-[420px] min-w-0 [contain:inline-size]"
                  : "w-fit max-w-[min(920px,96%)] min-w-0",
                "break-words rounded-2xl border border-[var(--border)] px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.06)] [overflow-wrap:anywhere]",
                system && "col-start-1 bg-[var(--surface)]",
                !system &&
                  mine &&
                  !waVoiceSent &&
                  "col-start-1 justify-self-end bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]",
                !system &&
                  mine &&
                  waVoiceSent &&
                  "col-start-1 justify-self-end",
                !system && !mine && "col-start-2 bg-[var(--surface)]",
                !system &&
                  !mine &&
                  isAudio &&
                  "w-full max-w-[420px] justify-self-stretch",
                waVoiceSent &&
                  "border-[color-mix(in_oklab,var(--primary)_32%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_20%,var(--surface))] text-[var(--text)] shadow-[0_1px_0_rgba(15,23,42,0.06)]",
                pendingRead &&
                  !waVoiceSent &&
                  "border-[color-mix(in_oklab,var(--muted)_35%,var(--border))] bg-[color-mix(in_oklab,var(--muted)_22%,var(--surface))] shadow-[0_8px_20px_rgba(15,23,42,0.05)]",
                isSelected &&
                  "outline outline-2 outline-[color-mix(in_oklab,var(--primary)_25%,transparent)]",
              )}
            >
              {!system && (
                <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2.5 text-xs">
                  <span className="min-w-0 truncate font-black">
                    {chatBubbleHeaderLabel(
                      mine,
                      thread,
                      me,
                      profileDisplayNames,
                    )}
                  </span>
                  <span
                    className="vt-muted shrink-0 whitespace-nowrap"
                    data-chat-interactive
                  >
                    {phone}
                  </span>
                  <TrustChip
                    score={trust}
                    className={
                      waVoiceSent
                        ? "border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] text-[var(--muted)]"
                        : undefined
                    }
                  />
                </div>
              )}
              {m.type === "text" &&
              !system &&
              "offerQaId" in m &&
              m.offerQaId ? (
                <div className="mb-2">
                  <span
                    className="inline-flex rounded-full border border-[color-mix(in_oklab,#d97706_40%,var(--border))] bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[color-mix(in_oklab,#b45309_90%,var(--text))]"
                    title="Visible en la ficha del producto o servicio"
                  >
                    Consulta pública
                  </span>
                </div>
              ) : null}
              <MessageBody
                m={m}
                onReplyQuoteNavigate={scrollToQuotedMessage}
                onImageOpen={setLightboxUrl}
                agreementDoc={agreementDoc}
                onAcceptAgreement={
                  m.type === "agreement" && viewerIsBuyer
                    ? () => {
                        void (async () => {
                          const ok = await respondTradeAgreement(
                            thread.id,
                            m.agreementId,
                            "accept",
                          );
                          if (ok) {
                            toast.success(
                              "Compra aceptada. No puede derogarse; podés emitir otros contratos nuevos.",
                            );
                          } else {
                            toast.error("No se pudo confirmar la compra.");
                          }
                        })();
                      }
                    : undefined
                }
                onRejectAgreement={
                  m.type === "agreement" && viewerIsBuyer
                    ? () => {
                        void (async () => {
                          const ok = await respondTradeAgreement(
                            thread.id,
                            m.agreementId,
                            "reject",
                          );
                          if (ok) toast("Acuerdo rechazado");
                          else toast.error("No se pudo rechazar el acuerdo.");
                        })();
                      }
                    : undefined
                }
                canRespondAgreement={
                  m.type === "agreement" &&
                  agreementDoc?.status === "pending_buyer" &&
                  !chatActionsLocked &&
                  viewerIsBuyer
                }
                agreementViewerIsBuyer={viewerIsBuyer}
                onOpenAgreementRouteSheet={
                  m.type === "agreement" &&
                  agreementDoc?.status !== "deleted" &&
                  agreementDoc?.routeSheetId
                    ? () => {
                        setFocusRouteId(agreementDoc.routeSheetId!);
                        setRailOpen(true);
                      }
                    : undefined
                }
                isMine={mine}
              />
              {"at" in m && (
                <MsgMeta
                  at={m.at}
                  delivery={mine ? deliveryStateForMineMessage(m) : undefined}
                />
              )}
            </div>
          </TrackedMessageRow>
        );
      })}
      {listEndRef ? (
        <div
          ref={listEndRef as RefObject<HTMLDivElement>}
          className="h-px w-full min-h-px shrink-0"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
