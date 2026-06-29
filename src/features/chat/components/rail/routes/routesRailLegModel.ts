import type {
  RouteOfferPublicState,
  RouteOfferTramoPublic,
} from "@features/market/model/store/marketStoreTypes";
import type { RouteTramoSubscriptionItemApi } from "@features/chat/api/chatApi";
import type { RouteStopDeliveryStatusApi } from "@features/chat/api/routeLogisticsApi";
import type { TradeAgreement } from "@features/chat/model/tradeAgreementTypes";
import type { RouteSheet, RouteStop } from "@features/chat/model/routeSheetTypes";
import { confirmedCarrierUidForOfferStop } from "./routesRailSheetDetailFlows";

export type RailLegResumeCandidate = {
  userId: string;
  displayName: string;
};

function confirmedCarriersForStopFromOffer(
  routeOfferResolved: RouteOfferPublicState | undefined,
  sheetId: string,
  stopId: string,
): RailLegResumeCandidate[] {
  const sid = sheetId.trim();
  const pid = (stopId ?? "").trim();
  if (!routeOfferResolved || routeOfferResolved.routeSheetId.trim() !== sid)
    return [];
  const map = new Map<string, RailLegResumeCandidate>();
  for (const t of routeOfferResolved.tramos ?? []) {
    if ((t.stopId ?? "").trim() !== pid) continue;
    const a = t.assignment;
    if (a?.status !== "confirmed") continue;
    const uid = (a.userId ?? "").trim();
    if (uid.length < 2) continue;
    if (!map.has(uid)) {
      map.set(uid, {
        userId: uid,
        displayName: (a.displayName ?? "").trim() || "Transportista",
      });
    }
  }
  return [...map.values()];
}

function confirmedCarriersForStopFromSubscriptions(
  routeTramoSubscriptions: RouteTramoSubscriptionItemApi[] | undefined,
  sheetId: string,
  stopId: string,
): RailLegResumeCandidate[] {
  const sid = sheetId.trim();
  const pid = (stopId ?? "").trim();
  if (!routeTramoSubscriptions?.length || !sid || !pid) return [];
  const map = new Map<string, RailLegResumeCandidate>();
  for (const it of routeTramoSubscriptions) {
    if ((it.routeSheetId ?? "").trim() !== sid) continue;
    if ((it.stopId ?? "").trim() !== pid) continue;
    if ((it.status ?? "").trim().toLowerCase() !== "confirmed") continue;
    const uid = (it.carrierUserId ?? "").trim();
    if (uid.length < 2) continue;
    if (!map.has(uid)) {
      map.set(uid, {
        userId: uid,
        displayName: (it.displayName ?? "").trim() || "Transportista",
      });
    }
  }
  return [...map.values()];
}

function mergeResumeCandidates(
  ...lists: RailLegResumeCandidate[][]
): RailLegResumeCandidate[] {
  const map = new Map<string, RailLegResumeCandidate>();
  for (const list of lists) {
    for (const c of list) {
      const uid = c.userId.trim();
      if (uid.length >= 2 && !map.has(uid)) map.set(uid, c);
    }
  }
  return [...map.values()];
}

export type RailLegModel = {
  agreement: TradeAgreement | null;
  agreementId: string;
  deliveries: RouteStopDeliveryStatusApi[];
  row: RouteStopDeliveryStatusApi | undefined;
  logisticsState: string;
  ot: RouteOfferTramoPublic | undefined;
  nextParada: RouteStop | undefined;
  nextOt: RouteOfferTramoPublic | undefined;
  busyKeyBase: string;
  activeLike: boolean;
  showEvidenceBtn: boolean;
  showCedeOwnership: boolean;
  viewerIsConfirmedOnThisStop: boolean;
  viewerIsSeller: boolean;
  viewerIsOwnerCarrierStrict: boolean;
  /** Transportistas confirmados en este `routeStopId` (para reanudar desde IDLE). */
  resumeCandidateCarriers: RailLegResumeCandidate[];
  showSellerPauseTramo: boolean;
  showSellerResumeTramo: boolean;
};

function railLegAgreementAndDeliveryRow(
  selRoute: RouteSheet,
  p: RouteStop,
  getAgreementForSheet: (routeSheetId: string) => TradeAgreement | null,
  deliveriesByAgreement: Record<string, RouteStopDeliveryStatusApi[]>,
): Pick<
  RailLegModel,
  "agreement" | "agreementId" | "deliveries" | "row" | "logisticsState"
> {
  const sheetId = selRoute.id.trim();
  const agreement = getAgreementForSheet(sheetId);
  const agreementId = (agreement?.id ?? "").trim();
  const deliveries = agreementId
    ? (deliveriesByAgreement[agreementId] ?? [])
    : [];
  const row = deliveries.find(
    (d) =>
      (d.routeSheetId ?? "").trim() === sheetId &&
      (d.routeStopId ?? "").trim() === (p.id ?? "").trim(),
  );
  const logisticsState = (row?.state ?? "unpaid").trim().toLowerCase();
  return { agreement, agreementId, deliveries, row, logisticsState };
}

function railLegOfferTramosForStop(
  routeOfferResolved: RouteOfferPublicState | undefined,
  sheetId: string,
  p: RouteStop,
  selRoute: RouteSheet,
): Pick<RailLegModel, "ot" | "nextParada" | "nextOt"> {
  const sid = sheetId.trim();
  const ot =
    routeOfferResolved?.routeSheetId === sid
      ? routeOfferResolved?.tramos.find((t) => t.stopId === p.id)
      : undefined;

  const orderedParadas = [...selRoute.paradas].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
  );
  const stopIndex = orderedParadas.findIndex((x) => x.id === p.id);
  const nextParada =
    stopIndex >= 0 && stopIndex < orderedParadas.length - 1
      ? orderedParadas[stopIndex + 1]
      : undefined;
  const nextOt =
    routeOfferResolved?.routeSheetId === sid && nextParada
      ? routeOfferResolved?.tramos.find((t) => t.stopId === nextParada.id)
      : undefined;

  return { ot, nextParada, nextOt };
}

function viewerIsConfirmedCarrierOnStop(
  routeOfferResolved: RouteOfferPublicState | undefined,
  routeTramoSubscriptions: RouteTramoSubscriptionItemApi[] | undefined,
  sheetId: string,
  stopId: string | undefined,
  meId: string,
): boolean {
  if (!meId) return false;
  const fromOffer = confirmedCarrierUidForOfferStop(
    routeOfferResolved,
    sheetId,
    stopId,
  );
  if (fromOffer.length >= 2 && fromOffer === meId) return true;
  return confirmedCarriersForStopFromSubscriptions(
    routeTramoSubscriptions,
    sheetId,
    stopId ?? "",
  ).some((c) => c.userId === meId);
}

function railLegUiFlags(args: {
  logisticsState: string;
  routeOfferResolved: RouteOfferPublicState | undefined;
  routeTramoSubscriptions: RouteTramoSubscriptionItemApi[] | undefined;
  sheetId: string;
  stopId: string | undefined;
  meId: string;
  sellerUid: string;
  row: RouteStopDeliveryStatusApi | undefined;
  cedeOwnershipByAgreement: Record<string, Record<string, boolean>> | undefined;
}): Pick<
  RailLegModel,
  | "activeLike"
  | "showEvidenceBtn"
  | "showCedeOwnership"
  | "viewerIsConfirmedOnThisStop"
  | "viewerIsSeller"
  | "viewerIsOwnerCarrierStrict"
> {
  const {
    logisticsState,
    routeOfferResolved,
    routeTramoSubscriptions,
    sheetId,
    stopId,
    meId,
    sellerUid,
    row,
    cedeOwnershipByAgreement,
  } = args;

  const activeLike =
    logisticsState === "paid" ||
    logisticsState === "in_transit" ||
    logisticsState === "delivered_pending_evidence" ||
    logisticsState === "evidence_submitted" ||
    logisticsState === "evidence_rejected";

  const viewerIsConfirmedOnThisStop = viewerIsConfirmedCarrierOnStop(
    routeOfferResolved,
    routeTramoSubscriptions,
    sheetId,
    stopId,
    meId,
  );

  const ownerFromDelivery = (row?.currentOwnerUserId ?? "").trim();
  const viewerIsSeller = !!meId && sellerUid.length > 1 && meId === sellerUid;
  const viewerIsOwnerCarrierStrict =
    !!meId && ownerFromDelivery.length >= 2 && meId === ownerFromDelivery;

  const cededFlag = cedeOwnershipByAgreement?.[sheetId]?.[stopId ?? ""];
  const pendingEvidenceAfterCede =
    viewerIsConfirmedOnThisStop &&
    (logisticsState === "delivered_pending_evidence" ||
      logisticsState === "evidence_rejected");
  const showEvidenceBtn = cededFlag === true || pendingEvidenceAfterCede;

  // Ceder: visible para el transportista titular del paquete (ownership en delivery).
  const showCedeOwnership =
    activeLike && viewerIsOwnerCarrierStrict && !showEvidenceBtn;

  return {
    activeLike,
    showEvidenceBtn,
    showCedeOwnership,
    viewerIsConfirmedOnThisStop,
    viewerIsSeller,
    viewerIsOwnerCarrierStrict,
  };
}

/** Datos derivados por tramo (oferta, logística, flags de botones). */
export function computeRailLegModel(input: {
  selRoute: RouteSheet;
  stop: RouteStop;
  routeOfferResolved: RouteOfferPublicState | undefined;
  getAgreementForSheet: (routeSheetId: string) => TradeAgreement | null;
  deliveriesByAgreement: Record<string, RouteStopDeliveryStatusApi[]>;
  meId: string;
  sellerUid: string;
  cedeOwnershipByAgreement: Record<string, Record<string, boolean>> | undefined;
  routeTramoSubscriptions?: RouteTramoSubscriptionItemApi[];
}): RailLegModel {
  const {
    selRoute,
    stop: p,
    routeOfferResolved,
    getAgreementForSheet,
    deliveriesByAgreement,
    meId,
    sellerUid,
    cedeOwnershipByAgreement,
    routeTramoSubscriptions,
  } = input;
  const sheetId = selRoute.id;

  const a = railLegAgreementAndDeliveryRow(
    selRoute,
    p,
    getAgreementForSheet,
    deliveriesByAgreement,
  );
  const n = railLegOfferTramosForStop(routeOfferResolved, sheetId, p, selRoute);
  const ui = railLegUiFlags({
    logisticsState: a.logisticsState,
    routeOfferResolved,
    routeTramoSubscriptions,
    sheetId,
    stopId: p.id,
    meId,
    sellerUid,
    row: a.row,
    cedeOwnershipByAgreement,
  });

  const resumeCandidateCarriersRaw = confirmedCarriersForStopFromOffer(
    routeOfferResolved,
    sheetId,
    p.id,
  );
  const curUid = confirmedCarrierUidForOfferStop(
    routeOfferResolved,
    sheetId,
    p.id,
  ).trim();
  const fromOfferOrCur: RailLegResumeCandidate[] =
    resumeCandidateCarriersRaw.length > 0
      ? resumeCandidateCarriersRaw
      : curUid.length >= 2
        ? [
            {
              userId: curUid,
              displayName:
                n.ot?.assignment?.displayName?.trim() ||
                "Transportista confirmado",
            },
          ]
        : [];
  const resumeCandidateCarriers = mergeResumeCandidates(
    fromOfferOrCur,
    confirmedCarriersForStopFromSubscriptions(
      routeTramoSubscriptions,
      sheetId,
      p.id,
    ),
  );

  const legHasOwnership = (a.row?.currentOwnerUserId ?? "").trim().length >= 2;

  const sheetHasIdleCustodyElsewhere = a.deliveries.some(
    (d) =>
      (d.routeSheetId ?? "").trim() === sheetId &&
      (d.routeStopId ?? "").trim() !== (p.id ?? "").trim() &&
      (d.state ?? "").trim().toLowerCase() === "idle_store_custody",
  );

  const activeOwnerStopId = a.deliveries.find(
    (d) =>
      (d.routeSheetId ?? "").trim() === sheetId &&
      (d.state ?? "").trim().toLowerCase() === "in_transit" &&
      (d.currentOwnerUserId ?? "").trim().length >= 2,
  )?.routeStopId;

  // Pausar: solo la tienda, tramo en tránsito con el único titular activo de la hoja.
  const showSellerPauseTramo =
    ui.viewerIsSeller &&
    legHasOwnership &&
    (p.id ?? "").trim() === (activeOwnerStopId ?? "").trim() &&
    a.logisticsState === "in_transit" &&
    !sheetHasIdleCustodyElsewhere;

  const showSellerResumeTramo =
    ui.viewerIsSeller &&
    a.logisticsState === "idle_store_custody" &&
    resumeCandidateCarriers.length > 0;

  const busyKeyBase = `${a.agreementId}:${sheetId}:${p.id}`;

  return {
    ...a,
    ...n,
    ...ui,
    resumeCandidateCarriers,
    showSellerPauseTramo,
    showSellerResumeTramo,
    busyKeyBase,
  };
}
