import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { cn } from "@shared/lib/cn";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@features/auth/store/useAppStore";
import {
  useMarketStore,
} from "@features/market/model/store/useMarketStore";
import {
  ChatComposerSection,
} from "../components/composer/ChatComposerSection";
import { ChatMessageList } from "../components/messages/ChatMessageList";
import { ChatRightRail } from "../components/rail/layout/ChatRightRail";
import { ChatRouteSubscribersPanel } from "../components/ChatRouteSubscribersPanel";
import {
  carrierHasChatAccessTramoOnOffer,
  confirmedStopIdsForCarrier,
  viewerIsConfirmedRouteCarrierOnThread,
  resolveRouteOfferPublicForThread,
  tramoNotifyLineFromOffer,
} from "@features/chat/model/routeSheetOfferGuards";
import { userHasTransportService } from "@features/market/model/transportEligibility";
import { fetchStoreDetail } from "@features/market/api/fetchStoreDetail";
import { mergeStoreCatalogWithLocalExtras } from "@features/market/model/storeCatalogTypes";
import {
  fetchSocialThreadMembers,
  patchChatMessageStatus,
  patchSocialGroupTitle,
  type ChatThreadMemberDto,
} from "@features/chat/api/chatApi";
import {
  disconnectFromChatThread,
  joinChatThread,
} from "@features/chat/model/chatRealtime";
import {
  fetchPublicProfile,
  mergePublicProfileIntoAppStore,
  wasPublicProfileHydrated,
} from "@features/auth/api/fetchPublicProfile";
import { VT_SOCIAL_PLACEHOLDER_OFFER_ID } from "@features/chat/model/chatThreadDtoFallbacks";
import {
  mergeBuyerLabelFromThreadDto,
  mergeSocialThreadMembersIntoProfileStore,
} from "@features/chat/model/chatSenderLabels";
import { resolveBuyerUserId } from "@features/chat/model/chatParticipantLabels";
import {
  isBuyerExpelledFromThread,
  isSellerExpelledFromThread,
} from "@features/chat/model/threadPartyExpelled";
import { getThreadPeerPartyExit } from "@features/chat/model/threadPeerPartyExit";
import { useMinWidth961 } from "../hooks/useMinWidth961";
import { useBuyerForRail } from "../hooks/useBuyerForRail";
import { useChatPeerProfileHydration } from "../hooks/useChatPeerProfileHydration";
import { useHydratePersistedChatThread } from "../hooks/useHydratePersistedChatThread";
import { useChatRouteRefresh } from "../hooks/useChatRouteRefresh";
import { useChatScrollUnread } from "../hooks/useChatScrollUnread";
import { useChatPageComposer } from "../hooks/useChatPageComposer";
import { useChatPageTradeActions } from "../hooks/useChatPageTradeActions";
import { ChatPageModals } from "../components/page/ChatPageModals";
import { useCarrierThreadGeolocationAndTelemetry } from "../hooks/useCarrierThreadGeolocationAndTelemetry";
import { incomingMessageSupportsDeliveryAck } from "../model/chatDeliveryAck";
import { CarrierBlockedChatView } from "../components/layout/CarrierBlockedChatView";
import { ChatJumpToBottomFab } from "../components/layout/ChatJumpToBottomFab";
import { ChatPageHeader } from "../components/layout/ChatPageHeader";
import { ChatTradeMobileActionsSheet } from "../components/layout/ChatTradeMobileActionsSheet";
import { ChatSocialOverlays } from "../components/social/ChatSocialOverlays";
import "./chat.css";

export function ChatPage() {
  const { threadId } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const me = useAppStore((s) => s.me);
  const profileDisplayNames = useAppStore((s) => s.profileDisplayNames);
  const profileAvatarUrls = useAppStore((s) => s.profileAvatarUrls);
  const profileTrustScores = useAppStore((s) => s.profileTrustScores);
  const setTrustScore = useAppStore((s) => s.setTrustScore);
  const pushNotification = useAppStore((s) => s.pushNotification);

  const syncThreadBuyerQa = useMarketStore((s) => s.syncThreadBuyerQa);
  const respondTradeAgreement = useMarketStore((s) => s.respondTradeAgreement);
  /** Una sola suscripción: evita referenciar `thread` antes de inicializarlo si el catálogo depende del hilo. */
  const { thread, sellerCatalog, routeOfferForThisThread, offerForThread } =
    useMarketStore(
      useShallow((s) => {
        const th = threadId ? s.threads[threadId] : undefined;
        const ro = resolveRouteOfferPublicForThread(s, th);
        const oid = th?.offerId?.trim();
        return {
          thread: th,
          sellerCatalog: th ? (s.storeCatalogs[th.storeId] ?? null) : null,
          routeOfferForThisThread: ro,
          offerForThread: oid ? s.offers[oid] : undefined,
        };
      }),
    );
  const markThreadPaymentCompleted = useMarketStore(
    (s) => s.markThreadPaymentCompleted,
  );
  const applyThreadRouteTramoSubscriptions = useMarketStore(
    (s) => s.applyThreadRouteTramoSubscriptions,
  );
  const refreshOfferQaFromServer = useMarketStore(
    (s) => s.refreshOfferQaFromServer,
  );
  const refreshThreadTradeAgreements = useMarketStore(
    (s) => s.refreshThreadTradeAgreements,
  );
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const hasTransportService = useMemo(
    () => userHasTransportService(me.id, stores, storeCatalogs),
    [me.id, stores, storeCatalogs],
  );

  const isActingSeller = useMemo(
    () =>
      !!thread &&
      !!thread.store.ownerUserId &&
      thread.store.ownerUserId === me.id,
    [thread, me.id],
  );

  const isSocialThread =
    !!thread &&
    (thread.isSocialGroup === true ||
      thread.offerId?.trim() === VT_SOCIAL_PLACEHOLDER_OFFER_ID);

  const isSocialGroupCreator = useMemo(
    () =>
      isSocialThread &&
      !!thread?.buyerUserId?.trim() &&
      thread.buyerUserId.trim() === me.id.trim(),
    [isSocialThread, thread?.buyerUserId, me.id],
  );

  const acceptedAgreementsForPayment = useMemo(
    () =>
      thread
        ? (thread.contracts ?? []).filter((c) => c.status === "accepted")
        : [],
    [thread],
  );

  const acceptedAgreementIdsForSubscribers = useMemo(
    () => acceptedAgreementsForPayment.map((c) => c.id),
    [acceptedAgreementsForPayment],
  );

  /** Cobro en chat: solo comprador (el backend también lo exige). Oculta «Pagar» para transportistas y terceros. */
  const showBuyerPaymentInChat = useMemo(() => {
    if (!thread) return false;
    if (isSocialThread) return false;
    if (isActingSeller) return false;
    return resolveBuyerUserId(thread, me.id) === me.id;
  }, [thread, me.id, isSocialThread, isActingSeller]);

  const viewerIsConfirmedCarrier = useMarketStore(
    useShallow((s) =>
      thread ? viewerIsConfirmedRouteCarrierOnThread(s, thread, me.id) : false,
    ),
  );

  /** Panel "gente": el comprador no es `me` cuando el vendedor abre el chat (antes se mostraba la ficha del vendedor). */
  const buyerForRail = useBuyerForRail(
    thread,
    me,
    profileDisplayNames,
    profileAvatarUrls,
    profileTrustScores,
    viewerIsConfirmedCarrier,
  );
  const excludeBuyerFromParticipants = useMemo(
    () => (thread ? isBuyerExpelledFromThread(thread) : false),
    [thread],
  );
  const excludeSellerFromParticipants = useMemo(
    () => (thread ? isSellerExpelledFromThread(thread) : false),
    [thread],
  );
  useChatPeerProfileHydration(thread, me.id, isSocialThread);

  useEffect(() => {
    setPeerPartyExitedInfo(null);
    peerExitModalPrimedRef.current = null;
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !thread) return;
    const exit = getThreadPeerPartyExit(thread);
    if (!exit?.userId || exit.userId === me.id) return;
    try {
      if (
        globalThis.sessionStorage?.getItem(`vt_party_exit_ack_${threadId}`) ===
        "1"
      )
        return;
    } catch {
      /* private mode */
    }
    if (peerExitModalPrimedRef.current === threadId) return;
    peerExitModalPrimedRef.current = threadId;
    const buyerId = resolveBuyerUserId(thread, me.id);
    const sellerUid =
      thread.sellerUserId?.trim() || thread.store.ownerUserId?.trim() || "";
    let roleLabel = "Un participante";
    if (exit.leaverRole === "buyer") roleLabel = "El comprador";
    else if (exit.leaverRole === "seller") roleLabel = "El vendedor";
    else if (buyerId && exit.userId === buyerId) roleLabel = "El comprador";
    else if (sellerUid && exit.userId === sellerUid) roleLabel = "El vendedor";
    setPeerPartyExitedInfo({
      roleLabel,
      reason: exit.reason.trim() || "Sin motivo indicado.",
    });
  }, [threadId, thread, me.id]);

  const sellerForPeople = useMemo(() => {
    if (!thread) return undefined;
    const st = thread.store;
    const oid = st.ownerUserId;
    if (oid) {
      const t = profileTrustScores[oid];
      if (t !== undefined) return { ...st, trustScore: t };
    }
    return st;
  }, [thread, profileTrustScores]);

  const [railOpen, setRailOpen] = useState(false);
  const trade = useChatPageTradeActions({
    thread,
    isActingSeller,
    routeOfferForThisThread,
    setRailOpen,
  });
  /** Tras cobro: refrescar entregas + volver a intentar permiso de ubicación para telemetría. */
  const [carrierGeoNonce, setCarrierGeoNonce] = useState(0);
  useEffect(() => {
    if (thread?.isSocialGroup) setRailOpen(false);
  }, [thread?.isSocialGroup]);

  const carrierTelemetryTargets = useCarrierThreadGeolocationAndTelemetry({
    threadId,
    viewerIsConfirmedCarrier,
    isSocialThread,
    meId: me.id,
    refreshNonce: carrierGeoNonce,
  });
  /** Panel izquierdo: suscriptores a la oferta de hoja de ruta (solo comprador). */
  const [routeSubscribersSheetId, setRouteSubscribersSheetId] = useState<
    string | null
  >(null);
  const subsSheetWideLayout = useMinWidth961();
  const [highlightSubscriberUserId, setHighlightSubscriberUserId] = useState<
    string | null
  >(null);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [chatPayOpen, setChatPayOpen] = useState(false);
  /** Comprador: refresco de acuerdos/hojas antes de abrir el modal de pago. */
  const [chatPayPreparing, setChatPayPreparing] = useState(false);

  useEffect(() => {
    if (!chatPayOpen || showBuyerPaymentInChat) return;
    setChatPayOpen(false);
  }, [chatPayOpen, showBuyerPaymentInChat]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [routeSheetsLoading, setRouteSheetsLoading] = useState(false);
  const { refreshChatRouteData, syncThreadRouteSheetsFromSubscribersPanel } =
    useChatRouteRefresh({
      threadId,
      applyThreadRouteTramoSubscriptions,
      setRouteSheetsLoading,
    });
  const chatPayOpenInFlightRef = useRef(false);
  /** Móvil: acciones Panel / Pagar / Emitir desde FAB + hoja inferior (más alto útil para mensajes). */
  const [mobileChatActionsOpen, setMobileChatActionsOpen] = useState(false);
  const [socialMembersOpen, setSocialMembersOpen] = useState(false);
  const [socialRenameOpen, setSocialRenameOpen] = useState(false);
  const [socialMembersLoading, setSocialMembersLoading] = useState(false);
  const [socialMembersList, setSocialMembersList] = useState<
    ChatThreadMemberDto[]
  >([]);
  const [socialRenameDraft, setSocialRenameDraft] = useState("");

  const openSocialMembersModal = useCallback(() => {
    const tid = thread?.id?.trim();
    if (!tid) return;
    const meId = me.id.trim();
    setSocialMembersLoading(true);
    setSocialMembersOpen(true);
    void (async () => {
      try {
        const list = await fetchSocialThreadMembers(tid);
        setSocialMembersList(list);
        mergeSocialThreadMembersIntoProfileStore(list);
        await Promise.all(
          list.map(async (m) => {
            const uid = m.userId?.trim();
            if (!uid || uid.length < 2 || uid === meId) return;
            if (m.avatarUrl?.trim()) return;
            if (wasPublicProfileHydrated(uid)) return;
            const p = await fetchPublicProfile(uid);
            if (!p) return;
            mergePublicProfileIntoAppStore(p);
          }),
        );
      } catch {
        toast.error("No se pudieron cargar los miembros.");
        setSocialMembersList([]);
      } finally {
        setSocialMembersLoading(false);
      }
    })();
  }, [thread?.id, me.id]);

  const submitSocialRename = useCallback(async () => {
    const tid = thread?.id?.trim();
    if (!tid) return;
    try {
      const dto = await patchSocialGroupTitle(
        tid,
        socialRenameDraft.trim() || null,
      );
      mergeBuyerLabelFromThreadDto(dto);
      useMarketStore.setState((s) => ({
        ...s,
        threads: {
          ...s.threads,
          [tid]: {
            ...s.threads[tid]!,
            ...(dto.socialGroupTitle !== undefined
              ? {
                  socialGroupTitle: dto.socialGroupTitle?.trim()
                    ? dto.socialGroupTitle.trim()
                    : null,
                }
              : {}),
          },
        },
      }));
      setSocialRenameOpen(false);
      toast.success("Nombre actualizado");
    } catch {
      toast.error("No se pudo cambiar el nombre.");
    }
  }, [thread?.id, socialRenameDraft]);

  const openBuyerPaymentModal = useCallback(async () => {
    if (chatPayOpenInFlightRef.current) return;
    const tid = thread?.id?.trim();
    if (!tid || !showBuyerPaymentInChat) return;
    chatPayOpenInFlightRef.current = true;
    setChatPayPreparing(true);
    setContractsLoading(true);
    try {
      if (tid.startsWith("cth_")) {
        await refreshThreadTradeAgreements(tid);
      }
    } catch {
      toast.error("No se pudieron actualizar los datos del chat.");
    } finally {
      chatPayOpenInFlightRef.current = false;
      setChatPayPreparing(false);
      setContractsLoading(false);
      setChatPayOpen(true);
    }
  }, [thread?.id, showBuyerPaymentInChat, refreshThreadTradeAgreements]);

  const [peerPartyExitedInfo, setPeerPartyExitedInfo] = useState<{
    roleLabel: string;
    reason: string;
  } | null>(null);
  const peerExitModalPrimedRef = useRef<string | null>(null);
  const {
    listRef,
    listEndRef,
    onChatListScroll,
    jumpChatToBottom,
    scrolledUpFromBottom,
    unreadBelowCount,
  } = useChatScrollUnread(thread, threadId);
  const [persistThreadError, setPersistThreadError] = useState(false);
  useHydratePersistedChatThread({
    threadId,
    searchParams,
    refreshOfferQaFromServer,
    setPersistThreadError,
    setContractsLoading,
    setRouteSheetsLoading,
  });

  const composer = useChatPageComposer({
    threadId,
    thread,
    chatActionsLocked: thread?.chatActionsLocked === true,
  });
  const {
    draft,
    setDraft,
    selected,
    setSelected,
    draftInputRef,
    pendingImages,
    pendingDocs,
    pendingAudio,
    selectedIds,
    selectedOrdered,
    recording,
    recordSecs,
    voiceRecorderContainerRef,
    toggleVoiceRecording,
    onPickDocument,
    onPickImages,
    removePendingImage,
    removePendingDoc,
    removePendingAudio,
    toggleSelectRow,
    submitComposer,
    blockTextWithVoiceAndFiles,
    hasComposeToSend,
    canSend,
  } = composer;

  useEffect(() => {
    if (!threadId) return;
    syncThreadBuyerQa(threadId, me.id);
  }, [me.id, syncThreadBuyerQa, threadId, thread?.buyerUserId]);

  useEffect(() => {
    setRouteSubscribersSheetId(null);
    setHighlightSubscriberUserId(null);
  }, [threadId]);

  /** QR/PDF «abrir chat en esta hoja» — ?presel=1&sheet= */
  useEffect(() => {
    if (!thread?.id) return;
    if (searchParams.get("presel") !== "1") return;
    const sheet = searchParams.get("sheet")?.trim();
    if (!sheet) return;
    /** El flujo subs+sheet+hi usa y borra estos query params. */
    if (searchParams.get("subs") === "1") return;

    setFocusRouteId(sheet);
    setRailOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("presel");
    next.delete("sheet");
    setSearchParams(next, { replace: true });
  }, [thread?.id, searchParams, setSearchParams]);

  /** Deep link desde notificación: ?subs=1&sheet=&hi= */
  useEffect(() => {
    if (!thread?.id) return;
    const subs = searchParams.get("subs");
    const sheet = searchParams.get("sheet");
    const hi = searchParams.get("hi");
    if (subs !== "1" || !sheet?.trim() || !hi?.trim()) return;
    setRouteSubscribersSheetId(sheet.trim());
    setHighlightSubscriberUserId(hi.trim());
    setRailOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("subs");
    next.delete("sheet");
    next.delete("hi");
    setSearchParams(next, { replace: true });
  }, [thread?.id, searchParams, setSearchParams]);

  /** Deep link: panel Rutas enfocado en una hoja (?rail=1&sheet=), p. ej. titularidad cedida */
  useEffect(() => {
    if (!thread?.id) return;
    if (searchParams.get("rail") !== "1") return;
    const sheet = searchParams.get("sheet")?.trim();
    if (!sheet) return;
    setFocusRouteId(sheet);
    setRailOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("rail");
    next.delete("sheet");
    setSearchParams(next, { replace: true });
  }, [thread?.id, searchParams, setSearchParams]);

  /** Catálogo de la tienda del hilo: sin esto el acuerdo muestra «Catálogo no disponible» hasta abrir /store/:id. */
  useEffect(() => {
    const sid = thread?.storeId;
    if (!sid) return;
    if (useMarketStore.getState().storeCatalogs[sid] !== undefined) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchStoreDetail(sid, { userId: me.id });
        if (cancelled) return;
        useMarketStore.setState((s) => ({
          stores: { ...s.stores, [sid]: data.store },
          storeCatalogs: {
            ...s.storeCatalogs,
            [sid]: mergeStoreCatalogWithLocalExtras(
              s.storeCatalogs[sid],
              data.catalog,
            ),
          },
        }));
      } catch {
        /* deja el select deshabilitado; el vendedor puede abrir su ficha de tienda */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [thread?.storeId, me.id]);

  useEffect(() => {
    if (!threadId?.startsWith("cth_")) return;
    if (searchParams.get("presel") === "1" && searchParams.get("sheet")?.trim())
      return;
    void joinChatThread(threadId);
    return () => {
      void disconnectFromChatThread(threadId);
    };
  }, [threadId, searchParams]);

  /** Evita reenviar PATCH si ya hubo intento exitoso por id en esta sesión de hilo. */
  const markReadAttemptedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    markReadAttemptedIdsRef.current = new Set();
  }, [threadId]);

  const deliveredAckIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    deliveredAckIdsRef.current = new Set();
  }, [threadId]);

  /**
   * Si faltó <c>messageCreated</c> (cliente apagado), al hidratar el hilo: ACK entregado para todos
   * los entrantes. El "visto" (API <c>read</c>) se envía con el scroll en <c>ChatMessageList</c>.
   */
  useEffect(() => {
    if (!threadId?.startsWith("cth_") || !thread) return;
    const candidates = thread.messages.filter(
      incomingMessageSupportsDeliveryAck,
    );
    for (const m of candidates) {
      if (deliveredAckIdsRef.current.has(m.id)) continue;
      deliveredAckIdsRef.current.add(m.id);
      void patchChatMessageStatus(threadId, m.id, "delivered").catch(() => {
        deliveredAckIdsRef.current.delete(m.id);
      });
    }
  }, [threadId, thread, me.id]);

  const onIncomingMessageVisibleForRead = useCallback(
    (messageId: string) => {
      if (!threadId?.startsWith("cth_")) return;
      if (markReadAttemptedIdsRef.current.has(messageId)) return;
      markReadAttemptedIdsRef.current.add(messageId);
      void patchChatMessageStatus(threadId, messageId, "read").catch(() => {
        markReadAttemptedIdsRef.current.delete(messageId);
      });
    },
    [threadId],
  );

  const prevCarrierStopsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!thread) {
      prevCarrierStopsRef.current = null;
      return;
    }
    const listedAsCarrier =
      thread.chatCarriers?.some((c) => c.id === me.id) ?? false;
    const carrierContext = hasTransportService || listedAsCarrier;
    if (!carrierContext) {
      prevCarrierStopsRef.current = null;
      return;
    }
    if (
      !routeOfferForThisThread ||
      routeOfferForThisThread.threadId !== thread.id
    ) {
      prevCarrierStopsRef.current = null;
      return;
    }
    const now = confirmedStopIdsForCarrier(routeOfferForThisThread, me.id);
    const prev = prevCarrierStopsRef.current;
    prevCarrierStopsRef.current = now;
    if (prev === null) return;
    for (const sid of now) {
      if (!prev.has(sid)) {
        toast.success(
          `Te asignaron a ${tramoNotifyLineFromOffer(routeOfferForThisThread, sid)}. Revisa la hoja en Rutas.`,
        );
      }
    }
  }, [
    thread?.id,
    me.id,
    hasTransportService,
    routeOfferForThisThread,
    thread?.chatCarriers,
  ]);

  useEffect(() => {
    if (!routeSubscribersSheetId || subsSheetWideLayout) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [routeSubscribersSheetId, subsSheetWideLayout]);

  useEffect(() => {
    if (!routeSubscribersSheetId || subsSheetWideLayout) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setRouteSubscribersSheetId(null);
      setHighlightSubscriberUserId(null);
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [routeSubscribersSheetId, subsSheetWideLayout]);

  useEffect(() => {
    if (!mobileChatActionsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileChatActionsOpen]);

  useEffect(() => {
    if (!mobileChatActionsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileChatActionsOpen(false);
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [mobileChatActionsOpen]);

  useEffect(() => {
    if (railOpen || routeSubscribersSheetId) setMobileChatActionsOpen(false);
  }, [railOpen, routeSubscribersSheetId]);

  useEffect(() => {
    if (thread?.chatActionsLocked) setSelected({});
  }, [thread?.chatActionsLocked]);

  const closeSubscriberRouteSheet = useCallback(() => {
    setRouteSubscribersSheetId(null);
    setHighlightSubscriberUserId(null);
  }, []);

  if (!threadId) return null;
  const legacyPreselSheet = searchParams.get("sheet")?.trim();
  if (
    threadId.startsWith("cth_") &&
    searchParams.get("presel") === "1" &&
    legacyPreselSheet
  ) {
    const q = new URLSearchParams({ sheet: legacyPreselSheet });
    const st = searchParams.get("stops")?.trim();
    if (st) q.set("stops", st);
    return (
      <Navigate
        to={`/invite/presel/${encodeURIComponent(threadId)}?${q}`}
        replace
      />
    );
  }
  if (!thread) {
    if (threadId.startsWith("cth_") && !persistThreadError) {
      return (
        <div className="container vt-page">
          <div className="vt-card vt-card-pad">Cargando chat…</div>
        </div>
      );
    }
    if (threadId.startsWith("cth_") && persistThreadError) {
      return (
        <div className="container vt-page">
          <div className="vt-card vt-card-pad">
            No se pudo cargar este chat. ¿Iniciaste sesión y tienes acceso al
            hilo?
          </div>
        </div>
      );
    }
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Chat no encontrado.</div>
      </div>
    );
  }

  const carrierInThreadIntegrantes =
    thread.chatCarriers?.some((c) => c.id === me.id) ?? false;
  const viewerIsThreadBuyer = resolveBuyerUserId(thread, me.id) === me.id;
  const sellerUid = thread.sellerUserId?.trim() || thread.store.ownerUserId;
  const viewerIsThreadSeller = !!sellerUid && sellerUid === me.id;
  /** Comprador/vendedor pueden tener servicio de transporte publicado; no son “transportista bloqueado”. */
  const threadHasRouteCarriageContext =
    (thread.routeSheets?.length ?? 0) > 0 ||
    !!routeOfferForThisThread ||
    offerForThread?.isEmergentRoutePublication === true ||
    !!offerForThread?.emergentRouteSheetId ||
    (offerForThread?.emergentRouteParadas?.length ?? 0) > 0 ||
    thread.offerId?.startsWith("emo_") === true;
  const carrierHasResolvedTramoAccess =
    !!routeOfferForThisThread &&
    routeOfferForThisThread.threadId === thread.id &&
    carrierHasChatAccessTramoOnOffer(routeOfferForThisThread, me.id);
  const carrierBlockedFromRouteChat =
    !isSocialThread &&
    hasTransportService &&
    !viewerIsThreadBuyer &&
    !viewerIsThreadSeller &&
    threadHasRouteCarriageContext &&
    !carrierHasResolvedTramoAccess &&
    !carrierInThreadIntegrantes;

  if (carrierBlockedFromRouteChat) {
    return <CarrierBlockedChatView nav={nav} offerId={thread.offerId} />;
  }

  const store = thread.store;
  const chatActionsLocked = thread.chatActionsLocked === true;

  return (
    <div className="container vt-page vt-chat-page">
      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5",
          "max-[960px]:grid-rows-[minmax(0,1fr)_auto] max-[960px]:gap-x-4 max-[960px]:row-gap-0",
          !isSocialThread &&
            "min-[961px]:[grid-template-columns:minmax(520px,_1fr)_minmax(260px,_min(420px,_28vw))]",
        )}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col px-0 min-[961px]:px-1">
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 max-[960px]:gap-2">
            <ChatPageHeader
              nav={nav}
              thread={thread}
              store={store}
              me={me}
              profileDisplayNames={profileDisplayNames}
              offerTitle={offerForThread?.title}
              isSocialThread={isSocialThread}
              railOpen={railOpen}
              mobileChatActionsOpen={mobileChatActionsOpen}
              setMobileChatActionsOpen={setMobileChatActionsOpen}
              setRailOpen={setRailOpen}
              isActingSeller={isActingSeller}
              showBuyerPayment={showBuyerPaymentInChat}
              chatPayPreparing={chatPayPreparing}
              onOpenBuyerPayment={() => void openBuyerPaymentModal()}
              chatActionsLocked={chatActionsLocked}
              onEmitAgreement={trade.openEmitAgreement}
            />

            {chatActionsLocked ? (
              <div
                className="mx-1 mt-2.5 rounded-xl border border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] p-3 text-sm leading-snug text-[var(--text)]"
                role="status"
              >
                Chat restringido: saliste con un acuerdo{" "}
                <strong>aceptado</strong> y el pago aún no registrado. Solo
                puedes usar <strong>Pago</strong> para continuar; no puedes
                enviar mensajes ni crear acuerdos u hojas de ruta hasta
                entonces.
              </div>
            ) : null}

            <div className="relative min-h-0 flex flex-1 flex-col">
              <ChatMessageList
                listRef={listRef}
                listEndRef={listEndRef}
                onListScroll={onChatListScroll}
                onIncomingMessageVisibleForRead={
                  onIncomingMessageVisibleForRead
                }
                thread={thread}
                me={me}
                selected={selected}
                chatActionsLocked={chatActionsLocked}
                toggleSelectRow={toggleSelectRow}
                setLightboxUrl={setLightboxUrl}
                respondTradeAgreement={respondTradeAgreement}
                setFocusRouteId={setFocusRouteId}
                setRailOpen={setRailOpen}
              />
              <ChatJumpToBottomFab
                visible={scrolledUpFromBottom}
                unreadBelowCount={unreadBelowCount}
                onJump={jumpChatToBottom}
              />
            </div>

            <ChatComposerSection
              thread={thread}
              me={me}
              storeName={store.name}
              chatActionsLocked={chatActionsLocked}
              draftInputRef={draftInputRef}
              draft={draft}
              setDraft={setDraft}
              selected={selected}
              setSelected={setSelected}
              selectedIds={selectedIds}
              selectedOrdered={selectedOrdered}
              pendingDocs={pendingDocs}
              pendingImages={pendingImages}
              pendingAudio={pendingAudio}
              recording={recording}
              recordSecs={recordSecs}
              voiceRecorderContainerRef={voiceRecorderContainerRef}
              blockTextWithVoiceAndFiles={blockTextWithVoiceAndFiles}
              hasComposeToSend={hasComposeToSend}
              canSend={canSend}
              onPickDocument={onPickDocument}
              onPickImages={onPickImages}
              removePendingDoc={removePendingDoc}
              removePendingImage={removePendingImage}
              removePendingAudio={removePendingAudio}
              submitComposer={submitComposer}
              toggleVoiceRecording={toggleVoiceRecording}
              markThreadPaymentCompleted={markThreadPaymentCompleted}
              pushNotification={pushNotification}
              setTrustScore={setTrustScore}
            />

            <ChatTradeMobileActionsSheet
              open={mobileChatActionsOpen && !isSocialThread}
              onClose={() => setMobileChatActionsOpen(false)}
              setRailOpen={(open) => setRailOpen(open)}
              isActingSeller={isActingSeller}
              showBuyerPayment={showBuyerPaymentInChat}
              chatPayPreparing={chatPayPreparing}
              onOpenBuyerPayment={openBuyerPaymentModal}
              chatActionsLocked={chatActionsLocked}
              onEmitAgreement={trade.openEmitAgreement}
            />

            <ChatSocialOverlays
              me={me}
              profileDisplayNames={profileDisplayNames}
              profileAvatarUrls={profileAvatarUrls}
              mobileSheetOpen={mobileChatActionsOpen && isSocialThread}
              onCloseMobileSheet={() => setMobileChatActionsOpen(false)}
              isSocialGroupCreator={isSocialGroupCreator}
              threadSocialTitle={thread.socialGroupTitle}
              onOpenMembers={openSocialMembersModal}
              onOpenRename={() => setSocialRenameOpen(true)}
              socialMembersOpen={socialMembersOpen}
              onCloseMembers={() => setSocialMembersOpen(false)}
              socialMembersLoading={socialMembersLoading}
              socialMembersList={socialMembersList}
              socialRenameOpen={socialRenameOpen}
              onCloseRename={() => setSocialRenameOpen(false)}
              socialRenameDraft={socialRenameDraft}
              onSocialRenameDraftChange={setSocialRenameDraft}
              onSubmitRename={submitSocialRename}
            />
          </div>
        </div>

        {!isSocialThread ? (
          <div
            className={cn(
              /* En móvil el drawer es fixed: hace falta z por encima del header (z-50) y del nav (z-60). */
              "relative flex min-h-0 flex-col min-[961px]:self-stretch min-[961px]:z-[2] max-[960px]:z-[100]",
              "vt-chat-rail-wrap",
              railOpen && "vt-chat-rail-wrap--open",
            )}
          >
            {railOpen ? (
              <button
                type="button"
                className="vt-chat-rail-backdrop"
                aria-label="Cerrar panel"
                onClick={() => setRailOpen(false)}
              />
            ) : null}
            <ChatRightRail
              threadId={thread.id}
              threadStoreId={thread.storeId}
              buyerUserId={thread.buyerUserId ?? buyerForRail.id}
              sellerUserId={
                thread.sellerUserId?.trim() ||
                thread.store?.ownerUserId?.trim() ||
                undefined
              }
              contracts={thread.contracts ?? []}
              routeSheets={thread.routeSheets ?? []}
              contractsLoading={contractsLoading}
              routeSheetsLoading={routeSheetsLoading}
              actionsLocked={chatActionsLocked}
              buyer={buyerForRail}
              seller={sellerForPeople ?? store}
              chatCarriers={thread.chatCarriers}
              excludeBuyerFromParticipants={excludeBuyerFromParticipants}
              excludeSellerFromParticipants={excludeSellerFromParticipants}
              focusRouteId={focusRouteId}
              onConsumedRouteFocus={() => setFocusRouteId(null)}
              onOpenNewRouteSheet={trade.onOpenNewRouteSheet}
              onEditRouteSheet={trade.onEditRouteSheet}
              toggleRouteStop={trade.onToggleRouteStop}
              isActingSeller={isActingSeller}
              onOpenRouteSubscribers={(routeSheetId) => {
                setRouteSubscribersSheetId(routeSheetId);
              }}
              onPersistedRouteDataRefresh={refreshChatRouteData}
              onRequestEditAgreement={trade.onRequestEditAgreement}
              onDuplicateAgreement={trade.onDuplicateAgreement}
              onDeleteAgreement={trade.onDeleteAgreement}
            />
            {routeSubscribersSheetId && subsSheetWideLayout ? (
              <div className="absolute inset-0 z-[38] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
                <ChatRouteSubscribersPanel
                  embedded
                  key={`${thread.id}-route-subscribers-desk`}
                  threadId={thread.id}
                  routeOffer={routeOfferForThisThread}
                  contextRouteSheetId={routeSubscribersSheetId}
                  routeSheets={(thread.routeSheets ?? []).map((r) => ({
                    id: r.id,
                    titulo:
                      (r.titulo ?? "Hoja de ruta").trim() || "Hoja de ruta",
                  }))}
                  canSellerManageRouteSubscriptions={viewerIsThreadSeller}
                  acceptedAgreementIds={acceptedAgreementIdsForSubscribers}
                  onSubscriptionsChanged={refreshChatRouteData}
                  highlightUserId={highlightSubscriberUserId}
                  onThreadRouteSheetsSynced={
                    syncThreadRouteSheetsFromSubscribersPanel
                  }
                  onClose={closeSubscriberRouteSheet}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ChatPageModals
        thread={thread}
        lightboxUrl={lightboxUrl}
        onCloseLightbox={() => setLightboxUrl(null)}
        agreementDeleteSheetsModal={trade.agreementDeleteSheetsModal}
        onCloseAgreementDeleteSheets={trade.onCloseAgreementDeleteSheets}
        chatPayOpen={chatPayOpen}
        showBuyerPaymentInChat={showBuyerPaymentInChat}
        acceptedAgreementsForPayment={acceptedAgreementsForPayment}
        onCloseChatPay={() => setChatPayOpen(false)}
        onPaymentFullySettled={() => {
          markThreadPaymentCompleted(thread.id);
          setCarrierGeoNonce((n) => n + 1);
        }}
        carrierTelemetryTargets={carrierTelemetryTargets}
        pendingRouteSheetTrustConfirm={trade.pendingRouteSheetTrustConfirm}
        onCloseRouteSheetTrustConfirm={trade.onCloseRouteSheetTrustConfirm}
        onConfirmRouteSheetTrust={trade.onConfirmRouteSheetTrust}
        showAgreementForm={trade.showAgreementForm}
        isActingSeller={isActingSeller}
        sellerCatalog={sellerCatalog}
        agreementBeingEditedId={trade.agreementBeingEditedId}
        agreementFormInitial={trade.agreementFormInitial}
        onCloseAgreementForm={trade.onCloseAgreementForm}
        onSubmitAgreement={trade.onSubmitAgreement}
        showRouteSheetForm={trade.showRouteSheetForm}
        routeSheetBeingEdited={trade.routeSheetBeingEdited}
        routeSheetLockedByPaidAgreement={trade.routeSheetLockedByPaidAgreement}
        routeSheetCarrierContactEditOnly={trade.routeSheetCarrierContactEditOnly}
        routeOfferForEditingRouteSheet={trade.routeOfferForEditingRouteSheet}
        routeOfferForThisThread={routeOfferForThisThread}
        routeLegPaymentCurrency={trade.routeLegPaymentCurrency}
        onCloseRouteSheetForm={trade.onCloseRouteSheetForm}
        onSubmitRouteSheet={trade.onSubmitRouteSheet}
        peerPartyExitedInfo={peerPartyExitedInfo}
        onAckPeerPartyExited={() => {
          if (threadId) {
            try {
              sessionStorage.setItem(`vt_party_exit_ack_${threadId}`, "1");
            } catch {
              /* ignore */
            }
          }
          setPeerPartyExitedInfo(null);
        }}
        routeSubscribersSheetId={routeSubscribersSheetId}
        subsSheetWideLayout={subsSheetWideLayout}
        viewerIsThreadSeller={viewerIsThreadSeller}
        acceptedAgreementIdsForSubscribers={acceptedAgreementIdsForSubscribers}
        highlightSubscriberUserId={highlightSubscriberUserId}
        refreshChatRouteData={refreshChatRouteData}
        syncThreadRouteSheetsFromSubscribersPanel={
          syncThreadRouteSheetsFromSubscribersPanel
        }
        onCloseSubscriberRouteSheet={closeSubscriberRouteSheet}
      />
    </div>
  );
}
