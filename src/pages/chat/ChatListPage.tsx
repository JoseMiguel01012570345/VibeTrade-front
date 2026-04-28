import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, LogOut, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import type { Message, Thread } from "../../app/store/useMarketStore";
import {
  threadHasAcceptedAgreement,
  useMarketStore,
} from "../../app/store/useMarketStore";
import {
  buyerFirstNameForThread,
  chatThreadHeaderTitle,
  resolveBuyerUserId,
  resolveSellerUserId,
} from "../../utils/chat/chatParticipantLabels";
import { cn } from "../../lib/cn";
import { notifyChatParticipantsUserLeft } from "../../utils/chat/chatRealtime";
import {
  fetchChatThread,
  postCarrierWithdrawFromThread,
  postPartySoftLeaveChatThread,
} from "../../utils/chat/chatApi";
import { counterpartyAlreadyRecordedPartyExit } from "../../utils/chat/threadPeerPartyExit";
import { getSessionToken } from "../../utils/http/sessionToken";
import {
  postMeTrustAdjust,
  postStoreTrustAdjust,
  trustHistoryItemFromApi,
} from "../../utils/trust/trustLedgerApi";
import {
  CARRIER_ROUTE_EXIT_TRUST_PENALTY,
  CHAT_PARTY_EXIT_TRUST_PER_MEMBER,
} from "./components/modals/TrustRiskEditConfirmModal";
import { ChatLeaveConfirmModal } from "./components/modals/ChatLeaveConfirmModal";
import { messagePreviewLine } from "./lib/chatAttachments";
import { mergeMissingChatListThreadsFromServer } from "../../utils/chat/mergeMissingChatListThreadsFromServer";

const PREMATURE_EXIT_TOOLTIP =
  "Este chat se resalta porque registraste una salida con un acuerdo ya aceptado; la plataforma puede revisar el caso.";

function threadLastActivity(th: Thread): number {
  let t = 0;
  for (const m of th.messages) {
    if ("at" in m) t = Math.max(t, m.at);
  }
  return t;
}

function lastMessage(th: Thread): Message | undefined {
  let best: Message | undefined;
  let bestAt = -1;
  for (const m of th.messages) {
    if ("at" in m && m.at > bestAt) {
      bestAt = m.at;
      best = m;
    }
  }
  return best;
}

function fmtShort(ts: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatListPage() {
  const me = useAppStore((s) => s.me);
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);
  const setTrustScore = useAppStore((s) => s.setTrustScore);
  const threads = useMarketStore((s) => s.threads);
  const offers = useMarketStore((s) => s.offers);
  const removeThreadFromList = useMarketStore((s) => s.removeThreadFromList);
  const unpublishRouteSheetFromPlatform = useMarketStore(
    (s) => s.unpublishRouteSheetFromPlatform,
  );
  const [leaveModalThreadId, setLeaveModalThreadId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (me.id === "guest") return;
    void mergeMissingChatListThreadsFromServer();
  }, [me.id]);

  async function runExitChatAfterConfirm(threadId: string) {
    const th = threads[threadId];
    if (!th) return;
    const buyerId = resolveBuyerUserId(th, me.id);
    const sellerId = resolveSellerUserId(th);
    const isBuyerOrSeller =
      me.id === buyerId || (sellerId != null && me.id === sellerId);

    let withdrewAsCarrier = false;
    let notifiedParticipantsBeforeCarrierWithdraw = false;
    if (!isBuyerOrSeller && threadId.startsWith("cth_") && getSessionToken()) {
      await notifyChatParticipantsUserLeft(threadId);
      notifiedParticipantsBeforeCarrierWithdraw = true;
      try {
        const r = await postCarrierWithdrawFromThread(threadId);
        if (r.withdrawnRowCount > 0) {
          withdrewAsCarrier = true;
          if (r.applyTrustPenalty) {
            const nextTrust =
              typeof r.trustScoreAfterPenalty === "number"
                ? r.trustScoreAfterPenalty
                : Math.max(
                    -10_000,
                    me.trustScore - CARRIER_ROUTE_EXIT_TRUST_PENALTY,
                  );
            setTrustScore(nextTrust);
            toast(
              `Tu barra de confianza se ajustó en −${CARRIER_ROUTE_EXIT_TRUST_PENALTY} por abandonar la ruta antes de entregarla (demo).`,
              { icon: "⚠️" },
            );
          } else {
            toast.success(
              "Te des-suscribiste de los tramos. El chat sigue para comprador y vendedor.",
            );
          }
        }
      } catch {
        /* sin suscripciones activas o error de red */
      }
    }

    const hadAccepted = threadHasAcceptedAgreement(th);
    if (isBuyerOrSeller) {
      if (hadAccepted) {
        const reason = globalThis.prompt("Motivo para salir del chat");
        if (reason == null || !String(reason).trim()) return;
        const reasonTrim = String(reason).trim();
        const imSeller = sellerId != null && me.id === sellerId;
        for (const rs of th.routeSheets ?? []) {
          if (rs.publicadaPlataforma) {
            unpublishRouteSheetFromPlatform(threadId, rs.id);
          }
        }
        let partyExitedFromServer = (th.partyExitedUserId ?? "").trim();
        try {
          const dto = await fetchChatThread(threadId);
          if (dto.partyExitedUserId?.trim())
            partyExitedFromServer = dto.partyExitedUserId.trim();
        } catch {
          /* estado local o sin red */
        }
        const skipPartyExitTrustPenalty = counterpartyAlreadyRecordedPartyExit(
          partyExitedFromServer,
          me.id,
        );
        let groupMemberCount = 0;
        if (buyerId && buyerId.trim().length >= 2) groupMemberCount++;
        if (sellerId && sellerId.trim().length >= 2) groupMemberCount++;
        groupMemberCount += th.chatCarriers?.length ?? 0;
        groupMemberCount = Math.max(1, groupMemberCount);
        const appliedPenalty = skipPartyExitTrustPenalty
          ? 0
          : CHAT_PARTY_EXIT_TRUST_PER_MEMBER * groupMemberCount;
        const exitReasonDetail = `Salida con acuerdo aceptado: ${reasonTrim}`;
        try {
          await postPartySoftLeaveChatThread(threadId, reasonTrim);
        } catch {
          toast.error("No se pudo registrar la salida en el servidor.");
          return;
        }
        const token = getSessionToken();
        if (token && appliedPenalty > 0) {
          try {
            if (imSeller && th.storeId?.trim()) {
              const sid = th.storeId.trim();
              const r = await postStoreTrustAdjust(
                sid,
                -appliedPenalty,
                exitReasonDetail,
              );
              useMarketStore.setState((s) => {
                const score = r.trustScore;
                const nextThreads = { ...s.threads };
                for (const tid of Object.keys(nextThreads)) {
                  const t = nextThreads[tid];
                  if (t.storeId === sid) {
                    nextThreads[tid] = {
                      ...t,
                      store: { ...t.store, trustScore: score },
                    };
                  }
                }
                const b = s.stores[sid];
                if (!b) return { ...s, threads: nextThreads };
                return {
                  ...s,
                  stores: { ...s.stores, [sid]: { ...b, trustScore: score } },
                  threads: nextThreads,
                };
              });
              useAppStore
                .getState()
                .prependStoreTrustHistory(
                  sid,
                  trustHistoryItemFromApi(r.entry),
                );
            } else {
              const r = await postMeTrustAdjust(
                -appliedPenalty,
                exitReasonDetail,
              );
              useAppStore.setState((s) => ({
                me: { ...s.me, trustScore: r.trustScore },
                profileTrustScores: {
                  ...s.profileTrustScores,
                  [me.id]: r.trustScore,
                },
                lastThresholdState:
                  r.trustScore < s.trustThreshold ? "below" : "above",
              }));
              useAppStore
                .getState()
                .prependUserTrustHistory(
                  me.id,
                  trustHistoryItemFromApi(r.entry),
                );
            }
          } catch {
            const sid = th.storeId?.trim();
            if (imSeller && sid) {
              useMarketStore
                .getState()
                .applyStoreTrustPenalty(sid, appliedPenalty, exitReasonDetail, {
                  forceLocal: true,
                });
            } else {
              useAppStore
                .getState()
                .applyTrustPenalty(me.id, appliedPenalty, exitReasonDetail, {
                  forceLocal: true,
                });
            }
          }
        }
        if (appliedPenalty > 0) {
          const scope = imSeller
            ? "La confianza de tu tienda"
            : "Tu barra de confianza";
          toast(
            `${scope} se ajustó en −${appliedPenalty} por salir con acuerdo aceptado (${groupMemberCount} integrantes × ${CHAT_PARTY_EXIT_TRUST_PER_MEMBER}). Las hojas publicadas se retiraron del mercado. Saliendo, dejaste de formar parte de este hilo: no lo verás en la lista y no podrás reabrirlo.`,
            { icon: "⚠️" },
          );
        } else if (skipPartyExitTrustPenalty) {
          toast.success(
            "La otra parte ya había salido del chat con acuerdo: no aplica un ajuste extra a tu confianza. Las hojas publicadas se retiraron. Saliendo, dejaste de formar parte de este hilo: no lo verás en la lista y no podrás reabrirlo.",
          );
        } else {
          toast(
            "Salida registrada. Las hojas publicadas se retiraron del mercado. Podría revisarse. Saliendo, dejaste de formar parte de este hilo: no lo verás en la lista y no podrás reabrirlo.",
            { icon: "⚠️" },
          );
        }
      } else {
        toast.success(
          "Saliste de este hilo. Sin acuerdo aceptado, sin impacto en tu confianza.",
        );
      }
    } else if (!withdrewAsCarrier) {
      toast.success("Conversación quitada de tu lista.");
    }

    const shouldNotifyOthersLeft =
      threadId.startsWith("cth_") &&
      !notifiedParticipantsBeforeCarrierWithdraw &&
      !(isBuyerOrSeller && hadAccepted);
    if (shouldNotifyOthersLeft) {
      await notifyChatParticipantsUserLeft(threadId);
    }
    const skipServerDelete =
      !isBuyerOrSeller || (isBuyerOrSeller && hadAccepted);
    await removeThreadFromList(threadId, { skipServerDelete });
  }

  const rows = useMemo(() => {
    const list = Object.values(threads);
    list.sort((a, b) => threadLastActivity(b) - threadLastActivity(a));
    return list.map((th) => {
      const offer = offers[th.offerId];
      const last = lastMessage(th);
      return {
        th,
        offerTitle: offer?.title ?? "Oferta",
        preview: last ? messagePreviewLine(last) : "Sin mensajes",
        at: threadLastActivity(th),
      };
    });
  }, [threads, offers]);

  return (
    <div className="container vt-page">
      <ChatLeaveConfirmModal
        open={leaveModalThreadId !== null}
        variant="list"
        onClose={() => setLeaveModalThreadId(null)}
        onConfirm={async () => {
          const id = leaveModalThreadId;
          if (!id) return;
          await runExitChatAfterConfirm(id);
        }}
      />
      <div className="mb-4">
        <h1 className="vt-h1">Chats</h1>
      </div>

      <div className="vt-card vt-card-pad">
        {rows.length === 0 ? (
          <div className="px-4 py-7 text-center">
            <MessageCircle
              size={40}
              strokeWidth={1.25}
              className="mb-3 opacity-[0.35]"
            />
            <div className="vt-muted">Todavía no tenés conversaciones.</div>
            <div className="vt-muted mt-1.5 text-[13px]">
              Abrí una oferta y tocá «Comprar» para iniciar un chat.
            </div>
            <Link to="/home" className="vt-btn vt-btn-primary mt-4 inline-flex">
              Ver ofertas
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map(({ th, offerTitle, preview, at }) => {
              const inv = Boolean(th.prematureExitUnderInvestigation);
              const listTitle = chatThreadHeaderTitle(
                th,
                me,
                profileDisplayNames,
              );
              const sellerUid = resolveSellerUserId(th);
              const imSeller = sellerUid != null && me.id === sellerUid;
              const avatarLetter = imSeller
                ? (
                    buyerFirstNameForThread(
                      th,
                      me.id,
                      me.name,
                      profileDisplayNames,
                    ) || "?"
                  ).charAt(0)
                : (th.store.name || "?").charAt(0);
              return (
                <div
                  key={th.id}
                  className={cn(
                    "flex items-stretch gap-2 border-b border-[var(--border)] transition-colors duration-150 last:border-b-0",
                    inv &&
                      "-ml-0.5 border-l-4 border-l-amber-600 bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] pl-2",
                  )}
                >
                  <Link
                    to={`/chat/${th.id}`}
                    className={cn(
                      "relative flex min-w-0 flex-1 items-start gap-3 py-3.5 text-inherit no-underline transition-colors duration-150",
                      inv
                        ? "hover:bg-[color-mix(in_oklab,#d97706_16%,var(--surface))]"
                        : "hover:bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]",
                    )}
                    title={inv ? PREMATURE_EXIT_TOOLTIP : undefined}
                  >
                    {inv ? (
                      <span className="sr-only">{PREMATURE_EXIT_TOOLTIP}</span>
                    ) : null}
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_18%,var(--surface))] text-base font-bold text-[var(--primary)]"
                      aria-hidden
                    >
                      {avatarLetter.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="truncate text-[15px] font-semibold">
                          {listTitle}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {inv ? (
                            <span
                              className="flex leading-none text-amber-700"
                              aria-hidden
                            >
                              <HelpCircle size={18} strokeWidth={2.25} />
                            </span>
                          ) : null}
                          <span className="shrink-0 text-xs text-[var(--muted)]">
                            {fmtShort(at)}
                          </span>
                        </div>
                      </div>
                      <div className="mb-0.5 truncate text-[13px] text-[var(--muted)]">
                        {offerTitle}
                      </div>
                      <div className="truncate text-[13px] text-[var(--muted)]">
                        {preview}
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="vt-btn my-2 mr-1 inline-flex shrink-0 items-center gap-1.5 self-center text-nowrap text-[13px]"
                    title="Salir: con acuerdo aceptado te expulsa del hilo y pedimos motivo; sin acuerdo, sin motivo ni impacto en confianza"
                    onClick={() => setLeaveModalThreadId(th.id)}
                  >
                    <LogOut size={16} aria-hidden /> Salir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
