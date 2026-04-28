import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { cn } from "../../lib/cn";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  FileText,
  PanelRight,
  ShieldCheck,
} from "lucide-react";
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
import { createChatVoiceRecorderSession } from "./lib/chatWavesurferRecorder";
import { ensureMicPermission } from "./lib/voiceRecording";
import { ChatRightRail } from "./components/rail/ChatRightRail";
import { ChatRouteSubscribersPanel } from "./components/ChatRouteSubscribersPanel";
import {
  type RouteSheet,
  routeSheetEditAcksRecordFromSheets,
} from "./domain/routeSheetTypes";
import { RouteSheetFormModal } from "./components/modals/RouteSheetFormModal";
import { TradeAgreementFormModal } from "./components/modals/TradeAgreementFormModal";
import { TrustRiskEditConfirmModal } from "./components/modals/TrustRiskEditConfirmModal";
import { AgreementDeleteRouteSheetsModal } from "./components/modals/AgreementDeleteRouteSheetsModal";
import { PeerPartyExitedInfoModal } from "./components/modals/PeerPartyExitedInfoModal";
import {
  agreementDeleteBlockedByRouteSheetInvariant,
  carrierHasChatAccessTramoOnOffer,
  confirmedStopIdsForCarrier,
  resolveRouteOfferPublicForSheet,
  resolveRouteOfferPublicForThread,
  tramoNotifyLineFromOffer,
} from "./domain/routeSheetOfferGuards";
import { applyViewerRouteTramoSubscriptions } from "./domain/routeOfferSubscriptionMerge";
import { tradeAgreementToDraft } from "./domain/tradeAgreementTypes";
import {
  mergedRouteOfferPublicAfterChatThreadHydration,
  routeOfferPublicFromEmergentCardOffer,
} from "../../utils/market/routeOfferPublicFromEmergentCard";
import { userHasTransportService } from "../../utils/user/transportEligibility";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import { fetchPublicOfferCard } from "../../utils/market/marketPersistence";
import { mergeStoreCatalogWithLocalExtras } from "./domain/storeCatalogTypes";
import {
  fetchChatMessages,
  fetchChatThread,
  fetchThreadRouteSheets,
  fetchThreadRouteTramoSubscriptions,
  fetchThreadTradeAgreements,
  patchChatMessageStatus,
} from "../../utils/chat/chatApi";
import { mapTradeAgreementApiToTradeAgreement } from "../../utils/chat/tradeAgreementApiMapper";
import {
  disconnectFromChatThread,
  joinChatThread,
} from "../../utils/chat/chatRealtime";
import {
  mapChatMessageDtoToMessage,
  mergePersistedChatMessages,
  normalizeThreadMessages,
} from "../../utils/chat/chatMerge";
import { fetchPublicProfile } from "../../utils/auth/fetchPublicProfile";
import { minimalOfferStoreFromChatThreadDto } from "../../utils/chat/chatThreadDtoFallbacks";
import {
  mergeBuyerLabelFromThreadDto,
  mergeChatSenderLabelsIntoProfileStore,
} from "../../utils/chat/chatSenderLabels";
import {
  chatThreadHeaderTitle,
  resolveBuyerUserId,
} from "../../utils/chat/chatParticipantLabels";
import { getThreadPeerPartyExit } from "../../utils/chat/threadPeerPartyExit";
import {
  buildPurchaseThreadMessages,
  buildPurchaseThreadSystemOnly,
  syncOwnQaIntoMessages,
} from "../../app/store/marketStoreHelpers";
import type { Message } from "../../app/store/marketStoreTypes";
import "./chat.css";

const CHAT_SCROLL_BOTTOM_PX = 80;

/** Misma familia de tipos que el ping de entregado vía <c>messageCreated</c> (chatRealtime). */
function incomingMessageSupportsDeliveryAck(m: Message): boolean {
  if (m.from !== "other" || !m.id || m.id.startsWith("pend_")) return false;
  return (
    m.type === "text" ||
    m.type === "image" ||
    m.type === "audio" ||
    m.type === "doc" ||
    m.type === "docs" ||
    m.type === "agreement"
  );
}

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

  /** Panel "gente": el comprador no es `me` cuando el vendedor abre el chat (antes se mostraba la ficha del vendedor). */
  const buyerForRail = useMemo(() => {
    if (!thread) {
      return {
        id: me.id,
        name: me.name,
        trustScore: me.trustScore,
        avatarUrl: me.avatarUrl,
      };
    }
    if (thread.demoBuyer) return thread.demoBuyer;
    const buyerId = resolveBuyerUserId(thread, me.id);
    if (buyerId && buyerId === me.id) {
      return {
        id: me.id,
        name: me.name,
        trustScore: me.trustScore,
        avatarUrl: me.avatarUrl,
      };
    }
    if (buyerId) {
      const name =
        thread.buyerDisplayName?.trim() ||
        profileDisplayNames[buyerId]?.trim() ||
        "Comprador";
      const avatarUrl =
        thread.buyerAvatarUrl?.trim() ||
        profileAvatarUrls[buyerId]?.trim() ||
        undefined;
      return {
        id: buyerId,
        name,
        trustScore: profileTrustScores[buyerId] ?? 0,
        avatarUrl,
      };
    }
    const sellerUid = thread.sellerUserId ?? thread.store.ownerUserId;
    const viewerIsSeller = !!sellerUid && me.id === sellerUid;
    if (!viewerIsSeller) {
      return {
        id: me.id,
        name: me.name,
        trustScore: me.trustScore,
        avatarUrl: me.avatarUrl,
      };
    }
    const buid = thread.buyerUserId;
    return {
      id: buid ?? "unknown",
      name:
        thread.buyerDisplayName?.trim() ||
        (buid ? profileDisplayNames[buid]?.trim() : undefined) ||
        "Comprador",
      trustScore: buid ? (profileTrustScores[buid] ?? 0) : 0,
      avatarUrl:
        thread.buyerAvatarUrl?.trim() ||
        (buid ? profileAvatarUrls[buid]?.trim() : undefined) ||
        undefined,
    };
  }, [
    thread,
    me.id,
    me.name,
    me.trustScore,
    me.avatarUrl,
    profileDisplayNames,
    profileAvatarUrls,
    profileTrustScores,
  ]);

  useEffect(() => {
    if (!thread) return;
    const toFetch: string[] = [];
    const scores = useAppStore.getState().profileTrustScores;
    const bid = resolveBuyerUserId(thread, me.id);
    if (bid && bid !== me.id && scores[bid] === undefined) {
      toFetch.push(bid);
    }
    const oid = thread.store.ownerUserId;
    if (oid && scores[oid] === undefined) {
      toFetch.push(oid);
    }
    const unique = [...new Set(toFetch)];
    if (unique.length === 0) return;
    let cancelled = false;
    void Promise.all(
      unique.map((id) =>
        fetchPublicProfile(id).then((p) => {
          if (cancelled || !p) return;
          useAppStore.setState((s) => ({
            profileTrustScores: {
              ...s.profileTrustScores,
              [p.id]: p.trustScore,
            },
            profileDisplayNames: { ...s.profileDisplayNames, [p.id]: p.name },
            ...(p.avatarUrl?.trim()
              ? {
                  profileAvatarUrls: {
                    ...s.profileAvatarUrls,
                    [p.id]: p.avatarUrl.trim(),
                  },
                }
              : {}),
          }));
        }),
      ),
    );
    return () => {
      cancelled = true;
    };
  }, [thread, me.id]);

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
  }, [thread, routeSheetBeingEdited?.id, routeOfferPublicSlice, marketOffersSlice]);
  const [railOpen, setRailOpen] = useState(false);
  /** Panel izquierdo: suscriptores a la oferta de hoja de ruta (solo comprador). */
  const [routeSubscribersSheetId, setRouteSubscribersSheetId] = useState<
    string | null
  >(null);
  const [highlightSubscriberUserId, setHighlightSubscriberUserId] = useState<
    string | null
  >(null);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pendingRouteSheetTrustConfirm, setPendingRouteSheetTrustConfirm] =
    useState<RouteSheet | null>(null);
  const [agreementDeleteSheetsModal, setAgreementDeleteSheetsModal] =
    useState<null | { agreementId: string; title: string }>(null);
  const [peerPartyExitedInfo, setPeerPartyExitedInfo] = useState<{
    roleLabel: string;
    reason: string;
  } | null>(null);
  const peerExitModalPrimedRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  /** Sigue true si el usuario estaba al final del hilo (para decidir autoscroll al llegar mensajes). */
  const userWasAtBottomRef = useRef(true);
  const prevMessageCountInThreadRef = useRef(0);
  const chatListInitThreadIdRef = useRef<string | null>(null);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  /** True si el usuario scrolleó hacia arriba y el fondo del hilo no está a la vista. */
  const [scrolledUpFromBottom, setScrolledUpFromBottom] = useState(false);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const voiceRecorderContainerRef = useRef<HTMLDivElement | null>(null);
  const voiceSessionRef = useRef<ReturnType<
    typeof createChatVoiceRecorderSession
  > | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [persistThreadError, setPersistThreadError] = useState(false);

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
    const tid = threadId?.trim() ?? "";
    if (!tid.startsWith("cth_")) return;
    if (
      searchParams.get("presel") === "1" &&
      searchParams.get("sheet")?.trim()
    )
      return;
    const existingTh = useMarketStore.getState().threads[tid];
    setPersistThreadError(false);
    let cancelled = false;
    void (async () => {
      try {
        const dto = await fetchChatThread(tid);
        mergeBuyerLabelFromThreadDto(dto);
        let offer = useMarketStore.getState().offers[dto.offerId];
        let store = useMarketStore.getState().stores[dto.storeId];
        if (!offer || !store) {
          const card = await fetchPublicOfferCard(dto.offerId).catch(
            () => null,
          );
          if (card?.offer?.id) {
            const storeKey = card.store.id?.trim() || card.offer.storeId;
            useMarketStore.setState((s) => {
              const nextStores = { ...s.stores };
              if (storeKey) {
                nextStores[storeKey] = {
                  ...s.stores[storeKey],
                  ...card.store,
                  id: storeKey,
                };
              }
              return {
                ...s,
                offers: { ...s.offers, [card.offer.id]: card.offer },
                stores: nextStores,
              };
            });
            offer = useMarketStore.getState().offers[dto.offerId];
            store = useMarketStore.getState().stores[dto.storeId];
          }
        }
        if (!offer || !store) {
          const { offer: fo, store: st } =
            minimalOfferStoreFromChatThreadDto(dto);
          useMarketStore.setState((s) => ({
            ...s,
            offers: { ...s.offers, [fo.id]: fo },
            stores: { ...s.stores, [st.id]: st },
          }));
          offer = useMarketStore.getState().offers[dto.offerId];
          store = useMarketStore.getState().stores[dto.storeId];
        }
        if (!offer || !store) {
          if (!cancelled) setPersistThreadError(true);
          return;
        }
        const [msgs, agResult, routeSheetsRs, subsRs] = await Promise.all([
          fetchChatMessages(tid),
          fetchThreadTradeAgreements(tid)
            .then((a) => ({ ok: true as const, agreements: a }))
            .catch(() => ({ ok: false as const })),
          fetchThreadRouteSheets(tid).catch(() => null),
          fetchThreadRouteTramoSubscriptions(tid).catch(() => null),
        ]);
        const contracts = agResult.ok
          ? agResult.agreements.map(mapTradeAgreementApiToTradeAgreement)
          : (existingTh?.contracts ?? []);
        const validAgreementIds: Set<string> | undefined = agResult.ok
          ? new Set(agResult.agreements.map((a) => a.id))
          : existingTh?.contracts?.length
            ? new Set(existingTh.contracts.map((c) => c.id))
            : undefined;
        mergeChatSenderLabelsIntoProfileStore(msgs);
        const meId = useAppStore.getState().me.id;
        const mapped = msgs.map((d) => mapChatMessageDtoToMessage(d, meId));
        const prevMsgs = existingTh?.messages;
        const sellerUserId = dto.sellerUserId ?? store.ownerUserId;
        const localBasis =
          prevMsgs && prevMsgs.length > 0
            ? prevMsgs
            : msgs.length > 0
              ? dto.purchaseMode
                ? buildPurchaseThreadSystemOnly(offer)
                : []
              : dto.purchaseMode
                ? buildPurchaseThreadMessages(
                    offer,
                    dto.buyerUserId,
                    sellerUserId,
                    meId,
                  )
                : [];
        const merged = mergePersistedChatMessages(
          mapped,
          localBasis,
          validAgreementIds
            ? { validTradeAgreementIds: validAgreementIds }
            : undefined,
        );
        const qaSynced = syncOwnQaIntoMessages(
          merged,
          offer,
          dto.buyerUserId,
          sellerUserId,
          meId,
        );
        if (cancelled) return;
        const sheetsForThread =
          routeSheetsRs !== null
            ? (routeSheetsRs as RouteSheet[])
            : (existingTh?.routeSheets ?? []);
        const acksFromSheets = routeSheetEditAcksRecordFromSheets(sheetsForThread);
        useMarketStore.setState((s) => {
          const nextThread = {
            ...(s.threads[tid] ?? {}),
            id: tid,
            chatActionsLocked: false,
            offerId: dto.offerId,
            storeId: dto.storeId,
            store,
            buyerUserId: dto.buyerUserId,
            sellerUserId: dto.sellerUserId,
            ...(dto.buyerDisplayName?.trim()
              ? { buyerDisplayName: dto.buyerDisplayName.trim() }
              : {}),
            ...(dto.buyerAvatarUrl?.trim()
              ? { buyerAvatarUrl: dto.buyerAvatarUrl.trim() }
              : {}),
            purchaseMode: dto.purchaseMode,
            messages: qaSynced,
            contracts,
            routeSheets: sheetsForThread,
            ...(Object.keys(acksFromSheets).length > 0
              ? {
                  routeSheetEditAcks: {
                    ...(s.threads[tid]?.routeSheetEditAcks ?? {}),
                    ...acksFromSheets,
                  },
                }
              : {}),
          };
          const roNext = mergedRouteOfferPublicAfterChatThreadHydration(
            s.routeOfferPublic,
            nextThread,
            offer,
          );
          let next: typeof s = {
            ...s,
            threads: { ...s.threads, [tid]: nextThread },
            ...(roNext ? { routeOfferPublic: roNext } : {}),
          };
          if (subsRs && Array.isArray(subsRs)) {
            const mergedSubs = applyViewerRouteTramoSubscriptions(
              next,
              tid,
              subsRs,
              meId,
            );
            if (mergedSubs) next = mergedSubs;
          }
          return next;
        });
        if (dto.purchaseMode && dto.offerId?.trim()) {
          void refreshOfferQaFromServer(dto.offerId.trim());
        }
      } catch {
        if (!cancelled) setPersistThreadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, refreshOfferQaFromServer, searchParams]);

  const refreshChatRouteData = useCallback(async () => {
    const tid = threadId?.trim();
    if (!tid?.startsWith("cth_")) return;
    const uid = useAppStore.getState().me.id;
    const [sheets, subs, serverMsgs] = await Promise.all([
      fetchThreadRouteSheets(tid).catch(() => null),
      fetchThreadRouteTramoSubscriptions(tid).catch(() => null),
      fetchChatMessages(tid).catch(() => null),
    ]);
    if (serverMsgs !== null) {
      mergeChatSenderLabelsIntoProfileStore(serverMsgs);
      const mapped = serverMsgs.map((d) => mapChatMessageDtoToMessage(d, uid));
      useMarketStore.setState((s) => {
        const t = s.threads[tid];
        if (!t) return s;
        const validIds = new Set((t.contracts ?? []).map((c) => c.id));
        const merged = mergePersistedChatMessages(mapped, t.messages, {
          validTradeAgreementIds: validIds,
        });
        return {
          ...s,
          threads: {
            ...s.threads,
            [tid]: { ...t, messages: merged },
          },
        };
      });
    }
    if (sheets) {
      const sh = sheets as RouteSheet[];
      const acks = routeSheetEditAcksRecordFromSheets(sh);
      useMarketStore.setState((s) => {
        const t = s.threads[tid];
        if (!t) return s;
        const nextT = {
          ...t,
          routeSheets: sh,
          routeSheetEditAcks: { ...(t.routeSheetEditAcks ?? {}), ...acks },
        };
        const roNext = mergedRouteOfferPublicAfterChatThreadHydration(
          s.routeOfferPublic,
          nextT,
          s.offers[nextT.offerId],
        );
        let next: typeof s = {
          ...s,
          threads: { ...s.threads, [tid]: nextT },
          ...(roNext ? { routeOfferPublic: roNext } : {}),
        };
        if (subs && Array.isArray(subs)) {
          const mergedSubs = applyViewerRouteTramoSubscriptions(
            next,
            tid,
            subs,
            uid,
          );
          if (mergedSubs) next = mergedSubs;
        }
        return next;
      });
    } else if (subs && Array.isArray(subs)) {
      applyThreadRouteTramoSubscriptions(tid, subs, uid);
    }
  }, [threadId, applyThreadRouteTramoSubscriptions]);

  /** El visor de suscriptores hace GET /route-sheets; aplica al hilo en memoria. */
  const syncThreadRouteSheetsFromSubscribersPanel = useCallback(
    (sheets: RouteSheet[]) => {
      const tid = threadId?.trim();
      if (!tid?.startsWith("cth_")) return;
      const acks = routeSheetEditAcksRecordFromSheets(sheets);
      useMarketStore.setState((s) => {
        const t = s.threads[tid];
        if (!t) return s;
        const nextT = {
          ...t,
          routeSheets: sheets,
          routeSheetEditAcks: { ...(t.routeSheetEditAcks ?? {}), ...acks },
        };
        const roNext = mergedRouteOfferPublicAfterChatThreadHydration(
          s.routeOfferPublic,
          nextT,
          s.offers[nextT.offerId],
        );
        return {
          ...s,
          threads: { ...s.threads, [tid]: nextT },
          ...(roNext ? { routeOfferPublic: roNext } : {}),
        };
      });
    },
    [threadId],
  );

  useEffect(() => {
    if (!threadId?.startsWith("cth_")) return;
    if (
      searchParams.get("presel") === "1" &&
      searchParams.get("sheet")?.trim()
    )
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
    const candidates = thread.messages.filter(incomingMessageSupportsDeliveryAck);
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
          `Te asignaron a ${tramoNotifyLineFromOffer(routeOfferForThisThread, sid)}. Revisá la hoja en Rutas.`,
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
    if (thread?.chatActionsLocked) setSelected({});
  }, [thread?.chatActionsLocked]);

  useEffect(() => {
    if (!isActingSeller) {
      setShowRouteSheetForm(false);
      setRouteSheetBeingEdited(null);
    }
  }, [isActingSeller]);

  const onChatListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const atBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - CHAT_SCROLL_BOTTOM_PX;
    userWasAtBottomRef.current = atBottom;
    setScrolledUpFromBottom(!atBottom);
    if (atBottom) {
      setUnreadBelowCount(0);
    }
  }, []);

  const jumpChatToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnreadBelowCount(0);
    setScrolledUpFromBottom(false);
    userWasAtBottomRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (!thread) {
      if (!threadId) {
        chatListInitThreadIdRef.current = null;
        prevMessageCountInThreadRef.current = 0;
        setUnreadBelowCount(0);
        setScrolledUpFromBottom(false);
      }
      return;
    }
    const el = listRef.current;
    const n = thread.messages.length;
    const tid = thread.id;
    if (!el) {
      return;
    }
    if (chatListInitThreadIdRef.current !== tid) {
      chatListInitThreadIdRef.current = tid;
      el.scrollTo({ top: el.scrollHeight });
      prevMessageCountInThreadRef.current = n;
      setUnreadBelowCount(0);
      userWasAtBottomRef.current = true;
      queueMicrotask(() => {
        onChatListScroll();
      });
      return;
    }
    if (n < prevMessageCountInThreadRef.current) {
      prevMessageCountInThreadRef.current = n;
      return;
    }
    if (n > prevMessageCountInThreadRef.current) {
      const added = n - prevMessageCountInThreadRef.current;
      const ordered = normalizeThreadMessages(thread.messages);
      const newSlice = ordered.slice(-added);
      /** No sumar al badge los envíos propios mientras se está scrolleado arriba (sólo avisar de lo del otro/sistema). */
      const unreadFromNonMe = newSlice.filter((m) => m.from !== "me").length;
      if (userWasAtBottomRef.current) {
        el.scrollTo({ top: el.scrollHeight });
        setUnreadBelowCount(0);
        queueMicrotask(() => {
          onChatListScroll();
        });
      } else if (unreadFromNonMe > 0) {
        setUnreadBelowCount((c) => c + unreadFromNonMe);
      }
    }
    prevMessageCountInThreadRef.current = n;
  }, [thread, threadId, onChatListScroll]);

  useEffect(() => {
    if (!thread) return;
    const root = listRef.current;
    const target = listEndRef.current;
    if (!root || !target) return;
    const o = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setUnreadBelowCount(0);
            setScrolledUpFromBottom(false);
            userWasAtBottomRef.current = true;
          }
        }
      },
      { root, rootMargin: "0px", threshold: 0.01 },
    );
    o.observe(target);
    return () => o.disconnect();
  }, [thread?.id, thread?.messages.length]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

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

  function stopVoiceRecording() {
    voiceSessionRef.current?.stop();
  }

  async function startVoiceRecording() {
    if (thread?.chatActionsLocked === true) return;
    const ok = await ensureMicPermission();
    if (!ok) {
      toast.error(
        "No se pudo acceder al micrófono. Permití el permiso y usá HTTPS o localhost.",
      );
      return;
    }
    setRecordSecs(0);
    setRecording(true);
  }

  useLayoutEffect(() => {
    if (!recording) {
      voiceSessionRef.current = null;
      return;
    }
    const el = voiceRecorderContainerRef.current;
    if (!el || !threadId) {
      setRecording(false);
      return;
    }

    let cancelled = false;
    setRecordSecs(0);

    const session = createChatVoiceRecorderSession(el, {
      onProgressSec: (s) => {
        if (!cancelled) setRecordSecs(s);
      },
      onStartFailed: () => {
        if (!cancelled) {
          toast.error("No se pudo acceder al micrófono");
          setRecording(false);
          setRecordSecs(0);
        }
      },
      onEnd: (blob, seconds) => {
        if (cancelled) return;
        if (blob.size < 32) {
          toast.error(
            "No se grabó audio útil. Mantené pulsado un poco más el micrófono.",
          );
          setRecording(false);
          setRecordSecs(0);
          return;
        }
        const url = URL.createObjectURL(blob);
        const hasOtherStuff =
          pendingDocsRef.current.length > 0 ||
          pendingImagesRef.current.length > 0 ||
          draftRef.current.trim().length > 0 ||
          pendingAudioRef.current !== null;
        if (!hasOtherStuff) {
          const replyToIds = selectedIdsRef.current;
          sendAudio(
            threadId,
            { url, seconds },
            replyToIds.length ? { replyToIds } : undefined,
          );
          setSelected({});
          toast.success("Nota de voz enviada");
        } else {
          setPendingAudio((prev) => {
            if (prev) revokeBlob(prev.url);
            return { url, seconds };
          });
          toast.success("Nota de voz añadida al envío");
        }
        setRecording(false);
        setRecordSecs(0);
      },
    });

    voiceSessionRef.current = session;
    void session.start();

    return () => {
      cancelled = true;
      voiceSessionRef.current = null;
      session.destroy();
    };
  }, [recording, threadId, sendAudio]);

  function toggleVoiceRecording() {
    if (!recording && thread?.chatActionsLocked === true) return;
    if (recording) {
      stopVoiceRecording();
    } else {
      void startVoiceRecording();
    }
  }

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
            No se pudo cargar este chat. ¿Iniciaste sesión y tenés acceso al
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
    hasTransportService &&
    !viewerIsThreadBuyer &&
    !viewerIsThreadSeller &&
    threadHasRouteCarriageContext &&
    !carrierHasResolvedTramoAccess &&
    !carrierInThreadIntegrantes;

  if (carrierBlockedFromRouteChat) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad max-w-lg">
          <div className="text-lg font-black tracking-tight">
            Chat no disponible aún
          </div>
          <p className="vt-muted mt-2 text-[13px] leading-snug">
            Como transportista, necesitás una suscripción a un tramo de la hoja de
            ruta publicada (incluida una invitación aceptada). Si aún no te
            postulaste o no figura tu teléfono en la hoja, no podés entrar a este
            chat.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="vt-btn" onClick={() => nav(-1)}>
              Volver
            </button>
            <button
              type="button"
              className="vt-btn vt-btn-primary"
              onClick={() => nav(`/offer/${thread.offerId}`)}
            >
              Ir a la oferta de ruta
            </button>
          </div>
        </div>
      </div>
    );
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
    toast.success("Enviado");
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
          "min-[961px]:grid-cols-[minmax(0,1fr)_minmax(340px,480px)]",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col px-1 min-[961px]:pl-2 min-[961px]:pr-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-row gap-2.5">
            {routeSubscribersSheetId ? (
              <ChatRouteSubscribersPanel
                key={`${thread.id}-route-subscribers`}
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
                onThreadRouteSheetsSynced={syncThreadRouteSheetsFromSubscribersPanel}
                onClose={() => {
                  setRouteSubscribersSheetId(null);
                  setHighlightSubscriberUserId(null);
                }}
              />
            ) : null}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5">
              <div className="vt-card shrink-0 px-[22px] py-[18px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    className="vt-btn"
                    onClick={() => nav("/chat")}
                    aria-label="Volver a la lista de chats"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="font-black tracking-[-0.03em]">
                        {thread
                          ? chatThreadHeaderTitle(
                              thread,
                              me,
                              profileDisplayNames,
                            )
                          : store.name}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={
                          store.verified ?
                            "vt-pill inline-flex items-center gap-1"
                          : "vt-badge-verify-warn inline-flex items-center gap-1"
                        }
                      >
                        {store.verified ?
                          <ShieldCheck size={14} aria-hidden />
                        : <AlertTriangle size={14} aria-hidden />}
                        {store.verified
                          ? "Credenciales validadas"
                          : "No verificado"}
                      </span>
                      <span
                        className="vt-pill"
                        title="Disponibilidad de transporte indicada por el perfil del negocio."
                      >
                        Transporte:{" "}
                        {store.transportIncluded ? "incluido" : "NO incluido"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="vt-btn vt-chat-rail-toggle"
                      onClick={() => setRailOpen((o) => !o)}
                      title="Contratos y hojas de ruta"
                    >
                      <PanelRight size={16} /> Panel
                    </button>
                    {isActingSeller ? (
                      <button
                        type="button"
                        className="vt-btn"
                        disabled={chatActionsLocked}
                        title={
                          chatActionsLocked
                            ? "No disponible hasta registrar el pago"
                            : "Emitir acuerdo como negocio"
                        }
                        onClick={() => {
                          setAgreementBeingEditedId(null);
                          setShowAgreementForm(true);
                        }}
                      >
                        <FileText size={16} /> Emitir acuerdo
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {chatActionsLocked ? (
                <div
                  className="mx-1 mt-2.5 rounded-xl border border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_12%,var(--surface))] p-3 text-sm leading-snug text-[var(--text)]"
                  role="status"
                >
                  Chat restringido: saliste con un acuerdo{" "}
                  <strong>aceptado</strong> y el pago aún no registrado. Solo
                  podés usar <strong>Pago</strong> para continuar; no podés
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
                {scrolledUpFromBottom ? (
                  <div className="pointer-events-none absolute bottom-2 right-3 z-20 sm:bottom-3 sm:right-4">
                    <button
                      type="button"
                      onClick={jumpChatToBottom}
                      className="pointer-events-auto relative flex min-h-11 min-w-11 items-center justify-center gap-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_6px_24px_rgba(15,23,42,0.18)] transition hover:border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                      aria-label={
                        unreadBelowCount > 0
                          ? `${unreadBelowCount > 99 ? "99+" : unreadBelowCount} mensajes nuevos, ir al final del chat`
                          : "Ir al final del chat"
                      }
                      title="Ir al final del chat"
                    >
                      {unreadBelowCount > 0 ? (
                        <span className="absolute -right-1.5 -top-2 flex min-h-5 min-w-5 select-none items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-black leading-none text-white shadow-sm">
                          {unreadBelowCount > 99 ? "99+" : unreadBelowCount}
                        </span>
                      ) : null}
                      <ChevronDown
                        className="size-6 shrink-0"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </button>
                  </div>
                ) : null}
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
            </div>
          </div>
        </div>

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
            contracts={thread.contracts ?? []}
            routeSheets={thread.routeSheets ?? []}
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
                  "Necesitás al menos un contrato aceptado para crear una hoja de ruta.",
                );
                return;
              }
              const nAg = thread.contracts?.length ?? 0;
              const nSh = thread.routeSheets?.length ?? 0;
              if (nSh >= nAg) {
                toast.error(
                  "No podés tener más hojas de ruta que acuerdos. Emití otro acuerdo o eliminá una hoja existente.",
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
              const ack = thread.routeSheetEditAcks?.[sheet.id];
              if (
                ack &&
                Object.values(ack.byCarrier).some((v) => v === "pending")
              ) {
                toast.error(
                  "No podés editar de nuevo hasta que los transportistas del hilo acepten o rechacen la última versión de la hoja.",
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
                  `¿Eliminar el acuerdo «${ag.title}»? No podés eliminar acuerdos ya aceptados.`,
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
        </div>
      </div>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <AgreementDeleteRouteSheetsModal
        open={agreementDeleteSheetsModal !== null}
        threadId={thread.id}
        agreementId={agreementDeleteSheetsModal?.agreementId ?? ""}
        agreementTitle={agreementDeleteSheetsModal?.title ?? ""}
        onClose={() => setAgreementDeleteSheetsModal(null)}
        onAgreementDeleted={() => setAgreementDeleteSheetsModal(null)}
      />

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
            const ok = await updatePendingTradeAgreement(
              thread.id,
              agreementBeingEditedId,
              draft,
            );
            if (ok) {
              toast.success("Acuerdo actualizado");
            } else toast.error("No se pudo guardar el acuerdo.");
            return ok;
          }
          const id = await emitTradeAgreement(thread.id, draft);
          if (id) toast.success("Acuerdo emitido al chat");
          else
            toast.error(
              "No se pudo emitir: revisá los datos del acuerdo (validación del servidor).",
            );
          return id != null;
        }}
      />

      <RouteSheetFormModal
        open={showRouteSheetForm && isActingSeller}
        threadId={thread.id}
        initialRouteSheet={routeSheetBeingEdited}
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
                "No se pudo guardar: revisá título, mercancías y al menos un tramo con origen y destino",
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
                "Necesitás al menos un contrato aceptado para crear una hoja de ruta.",
              );
            } else if (
              (thread.routeSheets?.length ?? 0) >=
              (thread.contracts?.length ?? 0)
            ) {
              toast.error(
                "No podés tener más hojas de ruta que acuerdos. Emití otro acuerdo o eliminá una hoja.",
              );
            } else {
              toast.error(
                "Completá título, mercancías y al menos un tramo con origen y destino",
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
