import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import type { RouteOfferPublicState } from "@features/market/logic/store/marketStoreTypes";
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import {
  resolveRouteOfferPublicForThread,
} from "@features/chat/logic/route-sheet/routeSheetOfferGuards";
import { routeOfferPublicFromThreadRouteSheet } from "@features/market/logic/routeOfferPublicFromEmergentCard";
import { routeSheetHasPendingCarrierAck } from "@features/market/logic/store/marketSliceHelpers";
import {
  routeSheetStructuralEditBlockedByPaid,
} from "@features/chat/logic/route-sheet/routeSheetOfferGuards";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";
import { fetchAgreementRouteDeliveries, getCedeCarrierOwnership } from "@features/chat/api/routeLogisticsApi";
import { queryKeys } from "@shared/lib/queryKeys";
import type { RouteTramoSubscriptionItemApi } from "@features/chat/Dtos/thread/chatApiTypes";
import { fetchThreadRouteTramoSubscriptions } from "@features/chat/api/chatApi";
import { subscribeRouteDeliveriesRefresh } from "@features/chat/logic/realtime/chatRealtime";
import { RouteSheetLiveTrackingModal } from "../../modals/RouteSheetLiveTrackingModal";
import { InviteModal } from "../../modals/InviteModal";
import type {
  CarrierEvEditModalState,
  CarrierEvReadModalState,
  CedeOwnershipModalState,
  SellerPauseTramoModalState,
  SellerResumeTramoModalState,
} from "@features/chat/Dtos/rail/routesRailTypes";
import { RoutesRailSheetDetail } from "./RoutesRailSheetDetail";
import { RoutesRailSheetList } from "./RoutesRailSheetList";
import { RoutesRailEntryActions } from "./RoutesRailEntryActions";
import { CedeCarrierOwnershipModal } from "../modals/CedeCarrierOwnershipModal";
import { SellerPauseTramoModal } from "../modals/SellerPauseTramoModal";
import { SellerResumeTramoModal } from "../modals/SellerResumeTramoModal";
import { CarrierDeliveryEvidenceEditModal } from "../modals/CarrierDeliveryEvidenceEditModal";
import { RailCarrierEvidenceReadModal } from "../modals/RailCarrierEvidenceReadModal";
import {
  createRailRoutesBusService,
  registerRailRoutesBus,
} from "@features/chat/logic/rail/railRoutesBusRegistry";

type Props = {
  bodyClassName: string;
  buyerUserId?: string;
  sellerUserId?: string;
  agreements: TradeAgreement[];
  /** Dueño de la tienda del hilo: puede publicar u ocultar hojas. */
  isActingSeller: boolean;
  routeSheetsLoading?: boolean;
  routeSheets: RouteSheet[];
  linkedRouteSheetIds: ReadonlySet<string>;
  selRoute: RouteSheet | undefined;
  setSelRouteId: (id: string | null) => void;
  threadId: string;
  onOpenNewRouteSheet: () => void;
  onEditRouteSheet: (sheet: RouteSheet) => void;
  toggleRouteStop: (
    threadId: string,
    routeSheetId: string,
    stopId: string,
  ) => void;
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean;
  duplicateRouteSheet: (
    threadId: string,
    routeSheetId: string,
  ) => Promise<string | null>;
  publishRouteSheetsToPlatform: (
    threadId: string,
    routeSheetIds: string[],
  ) => void;
  unpublishRouteSheetFromPlatform: (
    threadId: string,
    routeSheetId: string,
  ) => void;
  routeOffer: RouteOfferPublicState | undefined;
  onOpenRouteSubscribers?: (routeSheetId: string) => void;
  onPersistedRouteDataRefresh?: () => Promise<void>;
  /** Bloquea acciones de edición de hoja hasta que exista pago registrado (mismo criterio que contratos). */
  actionsLocked?: boolean;
};

export function ChatRightRailRoutesPanel({
  bodyClassName,
  buyerUserId: _buyerUserId,
  sellerUserId,
  agreements,
  isActingSeller,
  routeSheetsLoading = false,
  routeSheets,
  linkedRouteSheetIds,
  selRoute,
  setSelRouteId,
  threadId,
  onOpenNewRouteSheet,
  onEditRouteSheet,
  toggleRouteStop,
  deleteRouteSheet,
  duplicateRouteSheet,
  publishRouteSheetsToPlatform,
  unpublishRouteSheetFromPlatform,
  routeOffer,
  onOpenRouteSubscribers,
  onPersistedRouteDataRefresh,
  actionsLocked = false,
}: Props) {
  const me = useAppStore((s) => s.me);
  /** Solo referencias del store; el fallback sintético va en useMemo (evita bucle de re-render). */
  const storedRouteOfferForSelectedSheet = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId];
      const sid = selRoute?.id?.trim();
      if (!sid || !th) return undefined;
      for (const ro of Object.values(s.routeOfferPublic)) {
        if (ro.threadId === threadId && ro.routeSheetId?.trim() === sid) {
          return ro;
        }
      }
      const forThread = resolveRouteOfferPublicForThread(s, th);
      if (forThread?.routeSheetId?.trim() === sid) return forThread;
      return undefined;
    }),
  );
  const routeOfferForSelectedSheet = useMemo(() => {
    if (storedRouteOfferForSelectedSheet) return storedRouteOfferForSelectedSheet;
    if (!selRoute?.paradas?.length) return undefined;
    return routeOfferPublicFromThreadRouteSheet(threadId, selRoute);
  }, [storedRouteOfferForSelectedSheet, selRoute, threadId]);
  const routeOfferFromThread = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId];
      return resolveRouteOfferPublicForThread(s, th);
    }),
  );
  const routeOfferResolved =
    routeOfferForSelectedSheet ?? routeOffer ?? routeOfferFromThread;
  const routeSheetEditAcks = useMarketStore(
    (s) => s.threads[threadId]?.routeSheetEditAcks,
  );
  const chatCarriers = useMarketStore((s) => s.threads[threadId]?.chatCarriers);
  const respondRouteSheetEdit = useMarketStore((s) => s.respondRouteSheetEdit);
  const removeThreadFromList = useMarketStore((s) => s.removeThreadFromList);
  const applyThreadRouteTramoSubscriptions = useMarketStore(
    (s) => s.applyThreadRouteTramoSubscriptions,
  );

  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const [liveFocusStopId, setLiveFocusStopId] = useState<string | null>(null);
  const [cedeOwnershipByAgreement, setCedeOwnershipByAgreement] =
    useState<Record<string, Record<string, boolean>>>();
  const [routeTramoSubscriptions, setRouteTramoSubscriptions] = useState<
    RouteTramoSubscriptionItemApi[]
  >([]);
  const [logisticsBusyKey, setLogisticsBusyKey] = useState<string | null>(null);
  const [carrierEvEditModal, setCarrierEvEditModal] =
    useState<CarrierEvEditModalState | null>(null);
  const [carrierEvReadModal, setCarrierEvReadModal] =
    useState<CarrierEvReadModalState | null>(null);
  const [cedeOwnershipModal, setCedeOwnershipModal] =
    useState<CedeOwnershipModalState | null>(null);
  const [sellerPauseTramoModal, setSellerPauseTramoModal] =
    useState<SellerPauseTramoModalState | null>(null);
  const [sellerResumeTramoModal, setSellerResumeTramoModal] =
    useState<SellerResumeTramoModalState | null>(null);
  const [inviteRouteSheet, setInviteRouteSheet] = useState<RouteSheet | null>(
    null,
  );
  const sellerUid = (sellerUserId ?? "").trim();

  const acceptedAgreements = useMemo(
    () => agreements.filter((a) => a.status === "accepted"),
    [agreements],
  );
  const acceptedAgreementIdsKey = useMemo(
    () =>
      acceptedAgreements
        .map((a) => a.id.trim())
        .filter((id) => id.length >= 8)
        .sort()
        .join("\0"),
    [acceptedAgreements],
  );

  const deliveryAgreementIds = useMemo(
    () =>
      acceptedAgreements
        .map((a) => a.id.trim())
        .filter((id) => id.length >= 8),
    [acceptedAgreements],
  );

  const queryClient = useQueryClient();

  const deliveryQueries = useQueries({
    queries: deliveryAgreementIds.map((id) => ({
      queryKey: queryKeys.agreementRouteDeliveries(threadId, id),
      queryFn: () => fetchAgreementRouteDeliveries(threadId, id),
      enabled: deliveryAgreementIds.length > 0,
      staleTime: 15_000,
    })),
  });

  const deliverySnapshotKey = deliveryQueries
    .map((q, i) => `${deliveryAgreementIds[i] ?? ""}:${q.status}:${q.dataUpdatedAt}`)
    .join("\0");

  const deliveriesByAgreement = useMemo(() => {
    const next: Record<string, RouteStopDeliveryStatusApi[]> = {};
    deliveryAgreementIds.forEach((id, i) => {
      next[id] = deliveryQueries[i]?.data ?? [];
    });
    return next;
  }, [deliveryAgreementIds, deliverySnapshotKey]);

  function agreementForSheet(routeSheetId: string): TradeAgreement | null {
    const rsid = routeSheetId.trim();
    if (rsid.length < 2) return null;
    return (
      acceptedAgreements.find(
        (a) => (a.routeSheetId ?? "").trim() === rsid,
      ) ?? null
    );
  }

  async function refreshDeliveriesForAgreement(agreementId: string) {
    const aid = agreementId.trim();
    if (aid.length < 8) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.agreementRouteDeliveries(threadId, aid),
    });
  }

  async function refreshRouteTramoSubscriptions() {
    try {
      const subs = await fetchThreadRouteTramoSubscriptions(threadId);
      const items = subs ?? [];
      setRouteTramoSubscriptions(items);
      const meId = (me.id ?? "").trim();
      if (meId.length >= 2) {
        applyThreadRouteTramoSubscriptions(threadId, items, meId);
      }
    } catch {
      /* ignore */
    }
  }

  async function refreshLogisticsForAgreement(agreementId: string) {
    await refreshDeliveriesForAgreement(agreementId);
    await refreshCedeOwnershipForAgreement();
    await refreshRouteTramoSubscriptions();
  }

  async function refreshCedeOwnershipForAgreement() {
    let cedeOwnershipEntries: Record<string, Record<string, boolean>> = {};
    for (const rsheet of routeSheets) {
      let stopEntries: Record<string, boolean> = {};
      for (const rstop of rsheet.paradas) {
        const isCedeOwneShip = await getCedeCarrierOwnership({
          threadId,
          agreementId: rsheet.id,
          routeSheetId: rsheet.id,
          routeStopId: rstop.id,
        });
        stopEntries[rstop.id] = isCedeOwneShip.ok;
      }
      cedeOwnershipEntries[rsheet.id] = stopEntries;
    }
    setCedeOwnershipByAgreement(cedeOwnershipEntries);
  }

  function markCedeOwnershipLocal(routeSheetId: string, routeStopId: string) {
    const rsid = routeSheetId.trim();
    const sid = routeStopId.trim();
    if (!rsid || !sid) return;
    setCedeOwnershipByAgreement((prev) => ({
      ...prev,
      [rsid]: {
        ...(prev?.[rsid] ?? {}),
        [sid]: true,
      },
    }));
  }

  useEffect(() => {
    if (deliveryAgreementIds.length === 0) return;
    void refreshCedeOwnershipForAgreement();
    void refreshRouteTramoSubscriptions();
  }, [threadId, acceptedAgreementIdsKey]);

  const refreshDeliveriesRef = useRef(refreshDeliveriesForAgreement);
  refreshDeliveriesRef.current = refreshDeliveriesForAgreement;
  const refreshCedeOwnershipRef = useRef(refreshCedeOwnershipForAgreement);
  refreshCedeOwnershipRef.current = refreshCedeOwnershipForAgreement;
  const agreementsRef = useRef(acceptedAgreements);
  agreementsRef.current = acceptedAgreements;

  useEffect(() => {
    const tid = threadId.trim();
    if (tid.length < 4) return;
    return subscribeRouteDeliveriesRefresh((p) => {
      if (p.threadId !== tid) return;
      void refreshCedeOwnershipRef.current();
      const rsid = p.routeSheetId.trim();
      const agreements = agreementsRef.current;
      const linked = agreements.find(
        (a) => (a.routeSheetId ?? "").trim() === rsid,
      );
      if (linked) {
        void refreshDeliveriesRef.current(linked.id);
        return;
      }
      for (const a of agreements) {
        if ((a.routeSheetId ?? "").trim().length >= 2) {
          void refreshDeliveriesRef.current(a.id);
        }
      }
    });
  }, [threadId]);

  const myCarrierAck =
    selRoute && me.id && chatCarriers?.some((c) => c.id === me.id)
      ? routeSheetEditAcks?.[selRoute.id]?.byCarrier[me.id]
      : undefined;

  const threadForAck = useMarketStore((s) => s.threads[threadId]);

  const sheetEditBlockedByCarrierAck =
    !!selRoute &&
    !!threadForAck &&
    routeSheetHasPendingCarrierAck(
      threadForAck,
      selRoute.id,
      routeOfferResolved,
    );

  const sheetLockedByPaid = useMarketStore((s) => {
    const th = s.threads[threadId];
    const sid = selRoute?.id?.trim();
    if (!th || !sid) return false;
    for (const c of th.contracts ?? []) {
      if (c.routeSheetId === sid && c.hasSucceededPayments === true) return true;
    }
    return false;
  });
  const sheetStructuralEditBlockedByPaid =
    !!selRoute &&
    routeSheetStructuralEditBlockedByPaid(
      sheetLockedByPaid,
      routeOfferResolved,
      selRoute.id,
      selRoute,
      routeTramoSubscriptions,
    );

  const subscribersTargetSheetId = useMemo(() => {
    if (routeSheets.length === 0) return null;
    if (selRoute && routeSheets.some((r) => r.id === selRoute.id))
      return selRoute.id;
    const offerSid = routeOfferResolved?.routeSheetId?.trim();
    if (offerSid && routeSheets.some((r) => r.id === offerSid)) return offerSid;
    return routeSheets[0].id;
  }, [routeSheets, selRoute, routeOfferResolved?.routeSheetId]);

  const railRoutesBus = useMemo(() => createRailRoutesBusService(), []);

  const railRoutesHandlersRef = useRef({
    setLogisticsBusyKey,
    setCedeOwnershipModal,
    setCarrierEvEditModal,
    setCarrierEvReadModal,
    setSellerPauseTramoModal,
    setSellerResumeTramoModal,
    refreshDeliveriesForAgreement: refreshLogisticsForAgreement,
    toggleRouteStop,
  });
  railRoutesHandlersRef.current = {
    setLogisticsBusyKey,
    setCedeOwnershipModal,
    setCarrierEvEditModal,
    setCarrierEvReadModal,
    setSellerPauseTramoModal,
    setSellerResumeTramoModal,
    refreshDeliveriesForAgreement: refreshLogisticsForAgreement,
    toggleRouteStop,
  };

  useEffect(() => {
    const unregister = registerRailRoutesBus(railRoutesBus);
    const sub = railRoutesBus.commands$.subscribe((cmd) => {
      const h = railRoutesHandlersRef.current;
      switch (cmd.type) {
        case "logisticsBusyKey":
          h.setLogisticsBusyKey(cmd.key);
          break;
        case "cedeOwnershipModal":
          h.setCedeOwnershipModal(cmd.modal);
          break;
        case "carrierEvEditModal":
          h.setCarrierEvEditModal(cmd.modal);
          break;
        case "carrierEvReadModal":
          h.setCarrierEvReadModal(cmd.modal);
          break;
        case "sellerPauseTramoModal":
          h.setSellerPauseTramoModal(cmd.modal);
          break;
        case "sellerResumeTramoModal":
          h.setSellerResumeTramoModal(cmd.modal);
          break;
        case "refreshDeliveries":
          void h.refreshDeliveriesForAgreement(cmd.agreementId);
          break;
        case "toggleRouteStop":
          h.toggleRouteStop(threadId, cmd.routeSheetId, cmd.stopId);
          break;
        default: {
          const _exhaustive: never = cmd;
          void _exhaustive;
        }
      }
    });
    return () => {
      sub.unsubscribe();
      unregister();
    };
  }, [railRoutesBus, threadId]);

  function openLiveMapAllStops(): void {
    setLiveFocusStopId(null);
    setLiveMapOpen(true);
  }

  function closeLiveMap(): void {
    setLiveMapOpen(false);
    setLiveFocusStopId(null);
  }

  function agreementIdForSelectedSheet(): string {
    if (!selRoute) return "";
    return (agreementForSheet(selRoute.id)?.id ?? "").trim();
  }

  function liveTrackingOfferTramos() {
    if (!selRoute || routeOfferResolved?.routeSheetId !== selRoute.id) {
      return undefined;
    }
    return routeOfferResolved.tramos;
  }

  return (
    <div className={bodyClassName}>
        <RoutesRailEntryActions
          isActingSeller={isActingSeller}
          onOpenNewRouteSheet={onOpenNewRouteSheet}
          onOpenRouteSubscribers={onOpenRouteSubscribers}
          routeSheetsLoading={routeSheetsLoading}
          subscribersTargetSheetId={subscribersTargetSheetId}
        />

        {selRoute ? (
          <RoutesRailSheetDetail
            selRoute={selRoute}
            setSelRouteId={setSelRouteId}
            threadId={threadId}
            isActingSeller={isActingSeller}
            sheetLockedByPaid={sheetLockedByPaid}
            sheetStructuralEditBlockedByPaid={sheetStructuralEditBlockedByPaid}
            sheetEditBlockedByCarrierAck={sheetEditBlockedByCarrierAck}
            linkedRouteSheetIds={linkedRouteSheetIds}
            routeOfferResolved={routeOfferResolved}
            routeSheetEditAcks={routeSheetEditAcks}
            myCarrierAck={myCarrierAck}
            meId={(me.id ?? "").trim()}
            sellerUid={sellerUid}
            respondRouteSheetEdit={respondRouteSheetEdit}
            removeThreadFromList={removeThreadFromList}
            onPersistedRouteDataRefresh={onPersistedRouteDataRefresh}
            onEditRouteSheet={onEditRouteSheet}
            onInviteTransportista={() => setInviteRouteSheet(selRoute)}
            deleteRouteSheet={deleteRouteSheet}
            duplicateRouteSheet={duplicateRouteSheet}
            publishRouteSheetsToPlatform={publishRouteSheetsToPlatform}
            unpublishRouteSheetFromPlatform={unpublishRouteSheetFromPlatform}
            getAgreementForSheet={agreementForSheet}
            deliveriesByAgreement={deliveriesByAgreement}
            routeTramoSubscriptions={routeTramoSubscriptions}
            cedeOwnershipByAgreement={cedeOwnershipByAgreement}
            logisticsBusyKey={logisticsBusyKey}
            onOpenLiveMapAllStops={openLiveMapAllStops}
            actionsLocked={actionsLocked}
          />
        ) : (
          <RoutesRailSheetList
            routeSheets={routeSheets}
            isActingSeller={isActingSeller}
            routeOfferResolved={routeOfferResolved}
            onSelectSheetId={(id) => setSelRouteId(id)}
          />
        )}

        <CedeCarrierOwnershipModal
          modal={cedeOwnershipModal}
          refreshDeliveriesForAgreement={refreshLogisticsForAgreement}
          setCedeOwnershipModal={setCedeOwnershipModal}
          setLogisticsBusyKey={setLogisticsBusyKey}
          threadId={threadId}
          onCedeSuccess={markCedeOwnershipLocal}
        />

        <SellerPauseTramoModal
          modal={sellerPauseTramoModal}
          refreshDeliveriesForAgreement={refreshLogisticsForAgreement}
          setLogisticsBusyKey={setLogisticsBusyKey}
          setSellerPauseTramoModal={setSellerPauseTramoModal}
          threadId={threadId}
        />

        <SellerResumeTramoModal
          modal={sellerResumeTramoModal}
          refreshDeliveriesForAgreement={refreshLogisticsForAgreement}
          setLogisticsBusyKey={setLogisticsBusyKey}
          setSellerResumeTramoModal={setSellerResumeTramoModal}
          threadId={threadId}
        />

        {carrierEvEditModal && selRoute ? (
          <CarrierDeliveryEvidenceEditModal
            agreementId={agreementIdForSelectedSheet()}
            modal={carrierEvEditModal}
            refreshDeliveriesForAgreement={refreshDeliveriesForAgreement}
            selRoute={selRoute}
            setCarrierEvEditModal={setCarrierEvEditModal}
            threadId={threadId}
          />
        ) : null}

        {carrierEvReadModal && selRoute ? (
          <RailCarrierEvidenceReadModal
            agreementId={agreementIdForSelectedSheet()}
            logisticsBusyKey={logisticsBusyKey}
            modal={carrierEvReadModal}
            refreshDeliveriesForAgreement={refreshDeliveriesForAgreement}
            routeSheetId={selRoute.id}
            sellerUid={sellerUid}
            setCarrierEvReadModal={setCarrierEvReadModal}
            setLogisticsBusyKey={setLogisticsBusyKey}
            threadId={threadId}
            viewerUserId={(me.id ?? "").trim()}
          />
        ) : null}

        {liveMapOpen && selRoute ? (
          <RouteSheetLiveTrackingModal
            agreementId={agreementIdForSelectedSheet()}
            highlightStopId={liveFocusStopId}
            offerTramos={liveTrackingOfferTramos()}
            open={liveMapOpen}
            routeSheet={selRoute}
            threadId={threadId}
            onClose={closeLiveMap}
          />
        ) : null}

        {inviteRouteSheet ? (
          <InviteModal
            routeSheet={inviteRouteSheet}
            onAccepted={() => setInviteRouteSheet(null)}
            onClose={() => setInviteRouteSheet(null)}
          />
        ) : null}
    </div>
  );
}
