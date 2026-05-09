import {
  type ChangeEvent,
  type MouseEvent,
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
import { cn } from "../../lib/cn";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../../app/store/useAppStore";
import {
  threadHasAcceptedAgreement,
  useMarketStore,
} from "../../app/store/useMarketStore";
import { ImageLightbox } from "./components/media/ChatMedia";
import {
  ChatComposerSection,
  type PendingDoc,
  type PendingImg,
} from "./components/composer/ChatComposerSection";
import { ChatMessageList } from "./components/messages/ChatMessageList";
import { formatFileSize, inferDocKind } from "./lib/chatAttachments";
import { ChatRightRail } from "./components/rail/layout/ChatRightRail";
import { ChatRouteSubscribersPanel } from "./components/ChatRouteSubscribersPanel";
import { type RouteSheet } from "./domain/routeSheetTypes";
import { RouteSheetFormModal } from "./components/modals/RouteSheetFormModal";
import { TradeAgreementFormModal } from "./components/modals/TradeAgreementFormModal";
import { TrustRiskEditConfirmModal } from "./components/modals/TrustRiskEditConfirmModal";
import { AgreementDeleteRouteSheetsModal } from "./components/modals/AgreementDeleteRouteSheetsModal";
import { PeerPartyExitedInfoModal } from "./components/modals/PeerPartyExitedInfoModal";
import { ChatPaymentModal } from "./components/modals/ChatPaymentModal";
import {
  agreementDeleteBlockedByRouteSheetInvariant,
  carrierHasChatAccessTramoOnOffer,
  confirmedStopIdsForCarrier,
  viewerIsConfirmedRouteCarrierOnThread,
  resolveRouteOfferPublicForSheet,
  resolveRouteOfferPublicForThread,
  ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES,
  tramoNotifyLineFromOffer,
} from "./domain/routeSheetOfferGuards";
import { tradeAgreementToDraft } from "./domain/tradeAgreementTypes";
import { routeOfferPublicFromEmergentCardOffer } from "../../utils/market/routeOfferPublicFromEmergentCard";
import { userHasTransportService } from "../../utils/user/transportEligibility";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import { mergeStoreCatalogWithLocalExtras } from "./domain/storeCatalogTypes";
import {
  fetchSocialThreadMembers,
  patchChatMessageStatus,
  patchSocialGroupTitle,
  type ChatThreadMemberDto,
} from "../../utils/chat/chatApi";
import {
  disconnectFromChatThread,
  joinChatThread,
} from "../../utils/chat/chatRealtime";
import { normalizeThreadMessages } from "../../utils/chat/chatMerge";
import {
  fetchPublicProfile,
  mergePublicProfileIntoAppStore,
  wasPublicProfileHydrated,
} from "../../utils/auth/fetchPublicProfile";
import { VT_SOCIAL_PLACEHOLDER_OFFER_ID } from "../../utils/chat/chatThreadDtoFallbacks";
import {
  mergeBuyerLabelFromThreadDto,
  mergeSocialThreadMembersIntoProfileStore,
} from "../../utils/chat/chatSenderLabels";
import { resolveBuyerUserId } from "../../utils/chat/chatParticipantLabels";
import { getThreadPeerPartyExit } from "../../utils/chat/threadPeerPartyExit";
import { useMinWidth961 } from "./hooks/useMinWidth961";
import { useBuyerForRail } from "./hooks/useBuyerForRail";
import { useChatPeerProfileHydration } from "./hooks/useChatPeerProfileHydration";
import { useHydratePersistedChatThread } from "./hooks/useHydratePersistedChatThread";
import { useChatRouteRefresh } from "./hooks/useChatRouteRefresh";
import { useChatScrollUnread } from "./hooks/useChatScrollUnread";
import { useChatVoiceRecorder } from "./hooks/useChatVoiceRecorder";
import { useCarrierThreadGeolocationAndTelemetry } from "./hooks/useCarrierThreadGeolocationAndTelemetry";
import { CarrierTelemetryBridge } from "./components/logistics/CarrierTelemetryBridge";
import { incomingMessageSupportsDeliveryAck } from "./utils/chatDeliveryAck";
import { CarrierBlockedChatView } from "./components/layout/CarrierBlockedChatView";
import { ChatJumpToBottomFab } from "./components/layout/ChatJumpToBottomFab";
import { ChatPageHeader } from "./components/layout/ChatPageHeader";
import { ChatTradeMobileActionsSheet } from "./components/layout/ChatTradeMobileActionsSheet";
import { ChatSocialOverlays } from "./components/social/ChatSocialOverlays";
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
  const emitTradeAgreement = useMarketStore((s) => s.emitTradeAgreement);
  const updatePendingTradeAgreement = useMarketStore(
    (s) => s.updatePendingTradeAgreement,
  );
  const deleteTradeAgreement = useMarketStore((s) => s.deleteTradeAgreement);
  const respondTradeAgreement = useMarketStore((s) => s.respondTradeAgreement);
  const createRouteSheet = useMarketStore((s) => s.createRouteSheet);
  const updateRouteSheet = useMarketStore((s) => s.updateRouteSheet);
  const toggleRouteStop = useMarketStore((s) => s.toggleRouteStop);
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
  const sendText = useMarketStore((s) => s.sendText);
  const sendAudio = useMarketStore((s) => s.sendAudio);
  const sendDocsBundle = useMarketStore((s) => s.sendDocsBundle);
  const sendImages = useMarketStore((s) => s.sendImages);
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

  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [agreementBeingEditedId, setAgreementBeingEditedId] = useState<
    string | null
  >(null);
  const [showRouteSheetForm, setShowRouteSheetForm] = useState(false);
  const [routeSheetBeingEdited, setRouteSheetBeingEdited] =
    useState<RouteSheet | null>(null);
  /**
   * No usar un selector de Zustand con `routeSheetBeingEdited` en el closure: si solo cambia el estado
   * de React, el store no se actualiza y el selector puede no volver a ejecutarse → oferta `undefined` en el modal.
   */
  const routeOfferPublicSlice = useMarketStore((s) => s.routeOfferPublic);
  const marketOffersSlice = useMarketStore((s) => s.offers);
  const routeOfferForEditingRouteSheet = useMemo(() => {
    const rsid = routeSheetBeingEdited?.id?.trim();
    const th = thread;
    const s = useMarketStore.getState();
    const fromResolve = resolveRouteOfferPublicForSheet(
      s,
      th,
      routeSheetBeingEdited?.id,
    );
    if (fromResolve) return fromResolve;
    if (!th?.id || !rsid) return undefined;
    const emo = th.offerId?.trim();
    if (emo) {
      const atKey = s.routeOfferPublic[emo];
      if (atKey?.routeSheetId?.trim() === rsid) return atKey;
    }
    if (!th.offerId || !rsid) return undefined;
    const offer = s.offers[th.offerId];
    const fromCard = offer
      ? routeOfferPublicFromEmergentCardOffer(offer)
      : undefined;
    if (
      fromCard?.routeSheetId?.trim() === rsid &&
      fromCard.threadId?.trim() === th.id.trim()
    ) {
      return fromCard;
    }
    return undefined;
  }, [
    thread,
    routeSheetBeingEdited?.id,
    routeOfferPublicSlice,
    marketOffersSlice,
  ]);
  const routeSheetLockedByPaidAgreement = useMemo(() => {
    const rs = routeSheetBeingEdited;
    if (!rs?.id) return false;
    return (thread?.contracts ?? []).some(
      (c) => c.routeSheetId === rs.id && c.hasSucceededPayments === true,
    );
  }, [thread?.contracts, routeSheetBeingEdited?.id]);
  const [railOpen, setRailOpen] = useState(false);
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
  const [pendingRouteSheetTrustConfirm, setPendingRouteSheetTrustConfirm] =
    useState<RouteSheet | null>(null);
  const [agreementDeleteSheetsModal, setAgreementDeleteSheetsModal] =
    useState<null | { agreementId: string; title: string }>(null);
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
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const [persistThreadError, setPersistThreadError] = useState(false);
  useHydratePersistedChatThread({
    threadId,
    searchParams,
    refreshOfferQaFromServer,
    setPersistThreadError,
    setContractsLoading,
    setRouteSheetsLoading,
  });

  const [pendingImages, setPendingImages] = useState<PendingImg[]>([]);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [pendingAudio, setPendingAudio] = useState<{
    url: string;
    seconds: number;
  } | null>(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const pendingDocsRef = useRef(pendingDocs);
  pendingDocsRef.current = pendingDocs;
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  const pendingAudioRef = useRef(pendingAudio);
  pendingAudioRef.current = pendingAudio;

  function revokeBlob(url: string) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }

  function newPendingId() {
    return `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }

  const onPickDocument = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.currentTarget.value = "";
    if (!files.length) return;
    const added: PendingDoc[] = files.map((file) => ({
      id: newPendingId(),
      url: URL.createObjectURL(file),
      name: file.name,
      size: formatFileSize(file.size),
      kind: inferDocKind(file.name),
    }));
    setPendingDocs((prev) => [...prev, ...added]);
    queueMicrotask(() => draftInputRef.current?.focus());
  }, []);

  const onPickImages = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.currentTarget.value = "";
    if (!files.length) return;
    const added: PendingImg[] = files.map((file) => ({
      id: newPendingId(),
      url: URL.createObjectURL(file),
    }));
    setPendingImages((prev) => [...prev, ...added]);
    queueMicrotask(() => draftInputRef.current?.focus());
  }, []);

  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const img = prev.find((x) => x.id === id);
      if (img) revokeBlob(img.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const removePendingDoc = useCallback((id: string) => {
    setPendingDocs((prev) => {
      const row = prev.find((x) => x.id === id);
      if (row) revokeBlob(row.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const removePendingAudio = useCallback(() => {
    setPendingAudio((prev) => {
      if (prev) revokeBlob(prev.url);
      return null;
    });
  }, []);

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

  useEffect(() => {
    if (!isActingSeller) {
      setShowRouteSheetForm(false);
      setRouteSheetBeingEdited(null);
    }
  }, [isActingSeller]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const {
    recording,
    recordSecs,
    voiceRecorderContainerRef,
    toggleVoiceRecording,
  } = useChatVoiceRecorder({
    threadId,
    chatActionsLocked: thread?.chatActionsLocked === true,
    sendAudio,
    setSelected,
    selectedIdsRef,
    pendingDocsRef,
    pendingImagesRef,
    draftRef,
    pendingAudioRef,
    setPendingAudio,
  });

  const selectedOrdered = useMemo(() => {
    if (!thread) return [];
    const order = new Map(
      normalizeThreadMessages(thread.messages).map((m, i) => [m.id, i]),
    );
    return [...selectedIds].sort(
      (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
    );
  }, [selectedIds, thread]);

  const agreementFormInitial = useMemo(() => {
    if (!agreementBeingEditedId || !thread?.contracts) return null;
    const a = thread.contracts.find((c) => c.id === agreementBeingEditedId);
    return a ? tradeAgreementToDraft(a) : null;
  }, [agreementBeingEditedId, thread?.contracts]);

  useEffect(() => {
    if (selectedIds.length > 0) draftInputRef.current?.focus();
  }, [selectedIds.length]);

  const blockTextWithVoiceAndFiles =
    pendingAudio !== null &&
    (pendingDocs.length > 0 || pendingImages.length > 0);

  useEffect(() => {
    if (blockTextWithVoiceAndFiles) setDraft("");
  }, [blockTextWithVoiceAndFiles]);

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

  function toggleSelectRow(e: MouseEvent, id: string) {
    if (chatActionsLocked) return;
    if ((e.target as HTMLElement).closest("[data-chat-interactive]")) return;
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function submitComposer() {
    if (!threadId || !thread || recording || thread.chatActionsLocked) return;
    const replyIds = selectedIds;
    const hasDocsOrImages = pendingDocs.length > 0 || pendingImages.length > 0;
    const hasVoice = pendingAudio !== null;
    /** No caption when voice is bundled with files (product rule). */
    const noTextWithVoiceAndFiles = hasVoice && hasDocsOrImages;
    const caption = noTextWithVoiceAndFiles ? "" : draft.trim();
    const cap = caption || undefined;
    if (!hasDocsOrImages && !caption && !hasVoice) return;

    let first = true;
    let voiceEmbeddedInDocs = false;
    let voiceEmbeddedInImages = false;

    if (pendingDocs.length > 0) {
      sendDocsBundle(
        thread.id,
        {
          documents: pendingDocs.map((d) => ({
            name: d.name,
            size: d.size,
            kind: d.kind,
            url: d.url,
          })),
          embeddedAudio: pendingAudio ?? undefined,
        },
        { replyToIds: replyIds, caption: first ? cap : undefined },
      );
      voiceEmbeddedInDocs = pendingAudio !== null;
      first = false;
    }

    if (pendingImages.length > 0) {
      sendImages(
        thread.id,
        pendingImages.map((p) => ({ url: p.url })),
        {
          replyToIds: replyIds,
          caption: first ? cap : undefined,
          embeddedAudio:
            pendingAudio && !voiceEmbeddedInDocs ? pendingAudio : undefined,
        },
      );
      voiceEmbeddedInImages = pendingAudio !== null && !voiceEmbeddedInDocs;
      first = false;
    }

    if (!pendingDocs.length && !pendingImages.length && caption) {
      sendText(thread.id, caption, replyIds);
    }

    if (hasVoice && !voiceEmbeddedInDocs && !voiceEmbeddedInImages) {
      sendAudio(
        thread.id,
        {
          url: pendingAudio!.url,
          seconds: pendingAudio!.seconds,
        },
        replyIds.length ? { replyToIds: replyIds } : undefined,
      );
    }

    setPendingDocs([]);
    setPendingImages([]);
    setPendingAudio(null);
    setDraft("");
    setSelected({});
  }

  const hasComposeToSend =
    pendingDocs.length > 0 ||
    pendingImages.length > 0 ||
    draft.trim().length > 0 ||
    pendingAudio !== null;

  const canSend = !recording && hasComposeToSend && !chatActionsLocked;

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
              onEmitAgreement={() => {
                setAgreementBeingEditedId(null);
                setShowAgreementForm(true);
              }}
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
              onEmitAgreement={() => {
                setAgreementBeingEditedId(null);
                setShowAgreementForm(true);
              }}
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
              storeName={store.name}
              buyerName={buyerForRail.name}
              buyer={buyerForRail}
              seller={sellerForPeople ?? store}
              chatCarriers={thread.chatCarriers}
              focusRouteId={focusRouteId}
              onConsumedRouteFocus={() => setFocusRouteId(null)}
              onOpenNewRouteSheet={() => {
                if (!isActingSeller) {
                  toast.error("Solo la tienda puede crear hojas de ruta.");
                  return;
                }
                if (!threadHasAcceptedAgreement(thread)) {
                  toast.error(
                    "Necesitas al menos un contrato aceptado para crear una hoja de ruta.",
                  );
                  return;
                }
                const nAg = thread.contracts?.length ?? 0;
                const nSh = thread.routeSheets?.length ?? 0;
                if (nSh >= nAg) {
                  toast.error(
                    "No puedes tener más hojas de ruta que acuerdos. Emite otro acuerdo o elimina una hoja existente.",
                  );
                  return;
                }
                setRouteSheetBeingEdited(null);
                setShowRouteSheetForm(true);
                setRailOpen(true);
              }}
              onEditRouteSheet={(sheet) => {
                if (!isActingSeller) {
                  toast.error("Solo la tienda puede editar la hoja de ruta.");
                  return;
                }
                const lockedByPaid = (thread.contracts ?? []).some(
                  (c) =>
                    c.routeSheetId === sheet.id &&
                    c.hasSucceededPayments === true,
                );
                if (lockedByPaid) {
                  toast.error(ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES);
                  return;
                }
                const ack = thread.routeSheetEditAcks?.[sheet.id];
                if (
                  ack &&
                  Object.values(ack.byCarrier).some((v) => v === "pending")
                ) {
                  toast.error(
                    "No puedes editar de nuevo hasta que los transportistas del hilo acepten o rechacen la última versión de la hoja.",
                  );
                  return;
                }
                setPendingRouteSheetTrustConfirm(sheet);
              }}
              toggleRouteStop={(tid, routeSheetId, stopId) => {
                if (!isActingSeller) return;
                toggleRouteStop(tid, routeSheetId, stopId);
              }}
              isActingSeller={isActingSeller}
              onOpenRouteSubscribers={(routeSheetId) => {
                setRouteSubscribersSheetId(routeSheetId);
              }}
              onPersistedRouteDataRefresh={refreshChatRouteData}
              onRequestEditAgreement={(ag) => {
                if (!isActingSeller) return;
                if (ag.hasSucceededPayments) {
                  toast.error(
                    "No podés editar este acuerdo: ya hay cobros registrados.",
                  );
                  return;
                }
                if (ag.sellerEditBlockedUntilBuyerResponse) {
                  toast.error(
                    "Ya enviaste cambios en este acuerdo. Esperá la respuesta del comprador (aceptar o rechazar) antes de volver a editar.",
                  );
                  return;
                }
                setAgreementBeingEditedId(ag.id);
                setShowAgreementForm(true);
              }}
              onDeleteAgreement={(ag) => {
                if (ag.hasSucceededPayments) {
                  toast.error(
                    "No podés eliminar este acuerdo: ya hay cobros registrados.",
                  );
                  return;
                }
                const contracts = thread.contracts ?? [];
                const sheets = thread.routeSheets ?? [];
                if (
                  agreementDeleteBlockedByRouteSheetInvariant(
                    contracts.length,
                    sheets.length,
                  )
                ) {
                  setAgreementDeleteSheetsModal({
                    agreementId: ag.id,
                    title: ag.title,
                  });
                  return;
                }
                if (
                  !globalThis.confirm(
                    `¿Eliminar el acuerdo «${ag.title}»? No puedes eliminar acuerdos ya aceptados.`,
                  )
                )
                  return;
                void (async () => {
                  const ok = await deleteTradeAgreement(thread.id, ag.id);
                  if (ok) toast.success("Acuerdo eliminado");
                  else {
                    toast.error(
                      "No se pudo eliminar el acuerdo (aceptado, bloqueo del hilo o más hojas que acuerdos permitidos).",
                    );
                  }
                })();
              }}
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

      {routeSubscribersSheetId && !subsSheetWideLayout ? (
        <div
          className="fixed inset-0 z-[110] min-[961px]:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vt-chat-subs-sheet-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(2,6,23,0.52)] backdrop-blur-[3px]"
            aria-label="Cerrar suscriptores a la ruta"
            onClick={closeSubscriberRouteSheet}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,820px)] min-h-[40dvh] w-full flex-col pb-[env(safe-area-inset-bottom,0px)] pt-0">
            <div className="pointer-events-auto flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none rounded-t-[1.125rem] border-x-0 border-b-0 border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-12px_40px_rgba(2,6,23,0.28)]">
              <div id="vt-chat-subs-sheet-title" className="sr-only">
                Suscriptores a la hoja de ruta
              </div>
              <ChatRouteSubscribersPanel
                embedded
                key={`${thread.id}-route-subscribers-mob`}
                threadId={thread.id}
                routeOffer={routeOfferForThisThread}
                contextRouteSheetId={routeSubscribersSheetId}
                routeSheets={(thread.routeSheets ?? []).map((r) => ({
                  id: r.id,
                  titulo: (r.titulo ?? "Hoja de ruta").trim() || "Hoja de ruta",
                }))}
                canSellerManageRouteSubscriptions={viewerIsThreadSeller}
                onSubscriptionsChanged={refreshChatRouteData}
                highlightUserId={highlightSubscriberUserId}
                onThreadRouteSheetsSynced={
                  syncThreadRouteSheetsFromSubscribersPanel
                }
                onClose={closeSubscriberRouteSheet}
              />
            </div>
          </div>
        </div>
      ) : null}

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <AgreementDeleteRouteSheetsModal
        open={agreementDeleteSheetsModal !== null}
        threadId={thread.id}
        agreementId={agreementDeleteSheetsModal?.agreementId ?? ""}
        agreementTitle={agreementDeleteSheetsModal?.title ?? ""}
        onClose={() => setAgreementDeleteSheetsModal(null)}
        onAgreementDeleted={() => setAgreementDeleteSheetsModal(null)}
      />

      <ChatPaymentModal
        open={chatPayOpen && showBuyerPaymentInChat}
        threadId={thread.id}
        agreements={acceptedAgreementsForPayment}
        routeSheets={thread.routeSheets ?? []}
        onClose={() => setChatPayOpen(false)}
        onPaymentFullySettled={() => {
          markThreadPaymentCompleted(thread.id);
          setCarrierGeoNonce((n) => n + 1);
        }}
      />

      {carrierTelemetryTargets.map((t) => (
        <CarrierTelemetryBridge
          key={`${t.agreementId}:${t.routeStopId}`}
          enabled
          threadId={thread.id}
          agreementId={t.agreementId}
          routeSheetId={t.routeSheetId}
          routeStopId={t.routeStopId}
        />
      ))}

      <TrustRiskEditConfirmModal
        open={pendingRouteSheetTrustConfirm !== null}
        onClose={() => setPendingRouteSheetTrustConfirm(null)}
        onConfirm={() => {
          const sheet = pendingRouteSheetTrustConfirm;
          setPendingRouteSheetTrustConfirm(null);
          if (!sheet) return;
          setRouteSheetBeingEdited(sheet);
          setShowRouteSheetForm(true);
          setRailOpen(true);
        }}
      />

      <TradeAgreementFormModal
        open={showAgreementForm && isActingSeller}
        onClose={() => {
          setShowAgreementForm(false);
          setAgreementBeingEditedId(null);
        }}
        storeName={store.name}
        sellerCatalog={sellerCatalog}
        contextOfferId={thread.offerId}
        initialDraft={agreementBeingEditedId ? agreementFormInitial : null}
        editingAgreementId={agreementBeingEditedId}
        onSubmit={async (draft) => {
          if (!isActingSeller) return false;
          if (agreementBeingEditedId) {
            const r = await updatePendingTradeAgreement(
              thread.id,
              agreementBeingEditedId,
              draft,
            );
            if (r.ok) {
              toast.success("Acuerdo actualizado");
            } else {
              toast.error(r.message ?? "No se pudo guardar el acuerdo.");
            }
            return r.ok;
          }
          const r = await emitTradeAgreement(thread.id, draft);
          if (r.ok) toast.success("Acuerdo emitido al chat");
          else toast.error(r.message ?? "No se pudo emitir el acuerdo.");
          return r.ok;
        }}
      />

      <RouteSheetFormModal
        open={showRouteSheetForm && isActingSeller}
        threadId={thread.id}
        initialRouteSheet={routeSheetBeingEdited}
        lockedByPaidAgreement={routeSheetLockedByPaidAgreement}
        routeOfferForSheet={routeOfferForEditingRouteSheet}
        routeOfferForThread={routeOfferForThisThread}
        onClose={() => {
          setShowRouteSheetForm(false);
          setRouteSheetBeingEdited(null);
        }}
        onSubmit={(payload) => {
          if (!isActingSeller) return { ok: false };
          if (routeSheetBeingEdited) {
            const ok = updateRouteSheet(
              thread.id,
              routeSheetBeingEdited.id,
              payload,
            );
            if (!ok) {
              toast.error(
                "No se pudo guardar: revisa título, mercancías y al menos un tramo con origen y destino",
              );
            }
            return ok
              ? { ok: true, routeSheetId: routeSheetBeingEdited.id }
              : { ok: false };
          }
          const id = createRouteSheet(thread.id, payload);
          if (!id) {
            if (!threadHasAcceptedAgreement(thread)) {
              toast.error(
                "Necesitas al menos un contrato aceptado para crear una hoja de ruta.",
              );
            } else if (
              (thread.routeSheets?.length ?? 0) >=
              (thread.contracts?.length ?? 0)
            ) {
              toast.error(
                "No puedes tener más hojas de ruta que acuerdos. Emite otro acuerdo o elimina una hoja.",
              );
            } else {
              toast.error(
                "Completa título, mercancías y al menos un tramo con origen y destino",
              );
            }
            return { ok: false };
          }
          return { ok: true, routeSheetId: id };
        }}
      />
      <PeerPartyExitedInfoModal
        open={peerPartyExitedInfo != null}
        roleLabel={peerPartyExitedInfo?.roleLabel ?? ""}
        reason={peerPartyExitedInfo?.reason ?? ""}
        onAcknowledge={() => {
          if (threadId) {
            try {
              sessionStorage.setItem(`vt_party_exit_ack_${threadId}`, "1");
            } catch {
              /* ignore */
            }
          }
          setPeerPartyExitedInfo(null);
        }}
      />
    </div>
  );
}
