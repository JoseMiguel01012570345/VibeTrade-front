import { useEffect, useMemo, useRef, useState } from "react";
import { Subject } from "rxjs";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@app/store/useAppStore";
import { useMarketStore } from "@app/store/useMarketStore";
import type { RouteOfferPublicState } from "@app/store/marketStoreTypes";
import type { TradeAgreement } from "@features/market/model/tradeAgreementTypes";
import type { RouteSheet } from "@features/market/model/routeSheetTypes";
import {
  resolveRouteOfferPublicForSheet,
  resolveRouteOfferPublicForThread,
} from "@features/market/model/routeSheetOfferGuards";
import { routeSheetIdsLockedByPaidAgreements } from "@app/store/marketStoreHelpers";
import {
  fetchAgreementRouteDeliveries,
  getCedeCarrierOwnership,
  type RouteStopDeliveryStatusApi,
} from "@/utils/chat/routeLogisticsApi";
import { RouteSheetLiveTrackingModal } from "../../modals/RouteSheetLiveTrackingModal";
import { InviteModal } from "../../modals/InviteModal";
import type {
  CarrierEvEditModalState,
  CarrierEvReadModalState,
  CedeOwnershipModalState,
  SellerPauseTramoModalState,
  SellerResumeTramoModalState,
} from "../shared/routesRailSheetModalTypes";
import { RoutesRailSheetDetail } from "./RoutesRailSheetDetail";
import { RoutesRailSheetList } from "./RoutesRailSheetList";
import { RoutesRailEntryActions } from "./RoutesRailEntryActions";
import { CedeCarrierOwnershipModal } from "../modals/CedeCarrierOwnershipModal";
import { SellerPauseTramoModal } from "../modals/SellerPauseTramoModal";
import { SellerResumeTramoModal } from "../modals/SellerResumeTramoModal";
import { CarrierDeliveryEvidenceEditModal } from "../modals/CarrierDeliveryEvidenceEditModal";
import { RailCarrierEvidenceReadModal } from "../modals/RailCarrierEvidenceReadModal";
import type { RailRoutesCommand } from "../bus/railRoutesCommands";
import { RailRoutesBusProvider } from "../bus/RailRoutesBusContext";

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
  publishRouteSheetsToPlatform,
  unpublishRouteSheetFromPlatform,
  routeOffer,
  onOpenRouteSubscribers,
  onPersistedRouteDataRefresh,
  actionsLocked = false,
}: Props) {
  const me = useAppStore((s) => s.me);
  const routeOfferForSelectedSheet = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId];
      const sid = selRoute?.id?.trim();
      if (!sid) return undefined;
      return resolveRouteOfferPublicForSheet(s, th, sid);
    }),
  );
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

  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const [liveFocusStopId, setLiveFocusStopId] = useState<string | null>(null);
  const [deliveriesByAgreement, setDeliveriesByAgreement] = useState<
    Record<string, RouteStopDeliveryStatusApi[]>
  >({});
  const [cedeOwnershipByAgreement, setCedeOwnershipByAgreement] =
    useState<Record<string, Record<string, boolean>>>();
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

  function agreementForSheet(routeSheetId: string): TradeAgreement | null {
    const rsid = routeSheetId.trim();
    if (rsid.length < 2) return null;
    return (
      acceptedAgreements.find(
        (a) => (a.routeSheetId ?? "").trim() === rsid && !!a.includeMerchandise,
      ) ?? null
    );
  }

  async function refreshDeliveriesForAgreement(agreementId: string) {
    const aid = agreementId.trim();
    if (aid.length < 8) return;
    try {
      const rows = await fetchAgreementRouteDeliveries(threadId, aid);
      setDeliveriesByAgreement((prev) => ({ ...prev, [aid]: rows }));
    } catch {
      /* ignore */
    }
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

  useEffect(() => {
    void (async () => {
      const ids = acceptedAgreements
        .map((a) => a.id.trim())
        .filter((x) => x.length >= 8);
      if (ids.length === 0) return;
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const rows = await fetchAgreementRouteDeliveries(threadId, id);
            return [id, rows] as const;
          } catch {
            return [id, [] as RouteStopDeliveryStatusApi[]] as const;
          }
        }),
      );

      await refreshCedeOwnershipForAgreement();

      setDeliveriesByAgreement((prev) => {
        const next = { ...prev };
        for (const [id, rows] of entries) next[id] = rows;
        return next;
      });
    })();
  }, [threadId, acceptedAgreements]);

  const myCarrierAck =
    selRoute && me.id && chatCarriers?.some((c) => c.id === me.id)
      ? routeSheetEditAcks?.[selRoute.id]?.byCarrier[me.id]
      : undefined;

  const sheetEditBlockedByCarrierAck =
    !!selRoute &&
    !!routeSheetEditAcks?.[selRoute.id] &&
    Object.values(routeSheetEditAcks[selRoute.id].byCarrier).some(
      (v) => v === "pending",
    );

  const paidLockedSheetIds = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId];
      return th ? routeSheetIdsLockedByPaidAgreements(th) : new Set<string>();
    }),
  );
  const sheetLockedByPaid = !!selRoute && paidLockedSheetIds.has(selRoute.id);

  const subscribersTargetSheetId = useMemo(() => {
    if (routeSheets.length === 0) return null;
    if (selRoute && routeSheets.some((r) => r.id === selRoute.id))
      return selRoute.id;
    const offerSid = routeOfferResolved?.routeSheetId?.trim();
    if (offerSid && routeSheets.some((r) => r.id === offerSid)) return offerSid;
    return routeSheets[0].id;
  }, [routeSheets, selRoute, routeOfferResolved?.routeSheetId]);

  const railRoutesCommand$ = useMemo(
    () => new Subject<RailRoutesCommand>(),
    [],
  );

  const railRoutesHandlersRef = useRef({
    setLogisticsBusyKey,
    setCedeOwnershipModal,
    setCarrierEvEditModal,
    setCarrierEvReadModal,
    setSellerPauseTramoModal,
    setSellerResumeTramoModal,
    refreshDeliveriesForAgreement,
    toggleRouteStop,
  });
  railRoutesHandlersRef.current = {
    setLogisticsBusyKey,
    setCedeOwnershipModal,
    setCarrierEvEditModal,
    setCarrierEvReadModal,
    setSellerPauseTramoModal,
    setSellerResumeTramoModal,
    refreshDeliveriesForAgreement,
    toggleRouteStop,
  };

  useEffect(() => {
    const sub = railRoutesCommand$.subscribe((cmd) => {
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
    return () => sub.unsubscribe();
  }, [railRoutesCommand$, threadId]);

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
      <RailRoutesBusProvider subject={railRoutesCommand$}>
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
            publishRouteSheetsToPlatform={publishRouteSheetsToPlatform}
            unpublishRouteSheetFromPlatform={unpublishRouteSheetFromPlatform}
            getAgreementForSheet={agreementForSheet}
            deliveriesByAgreement={deliveriesByAgreement}
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
          refreshDeliveriesForAgreement={refreshDeliveriesForAgreement}
          setCedeOwnershipModal={setCedeOwnershipModal}
          setLogisticsBusyKey={setLogisticsBusyKey}
          threadId={threadId}
        />

        <SellerPauseTramoModal
          modal={sellerPauseTramoModal}
          refreshDeliveriesForAgreement={refreshDeliveriesForAgreement}
          setLogisticsBusyKey={setLogisticsBusyKey}
          setSellerPauseTramoModal={setSellerPauseTramoModal}
          threadId={threadId}
        />

        <SellerResumeTramoModal
          modal={sellerResumeTramoModal}
          refreshDeliveriesForAgreement={refreshDeliveriesForAgreement}
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
      </RailRoutesBusProvider>
    </div>
  );
}
