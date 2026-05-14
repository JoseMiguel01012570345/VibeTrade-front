import type {
  RouteOfferPublicState,
  RouteOfferTramoPublic,
} from "../../../../../app/store/marketStoreTypes";
import type { RouteStopDeliveryStatusApi } from "../../../../../utils/chat/routeLogisticsApi";
import type { TradeAgreement } from "../../../domain/tradeAgreementTypes";
import type { RouteSheet, RouteStop } from "../../../domain/routeSheetTypes";
import { confirmedCarrierUidForOfferStop } from "./routesRailSheetDetailFlows";

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
  showEvidenceBtn: boolean | undefined;
  showCedeOwnership: boolean;
  viewerIsConfirmedOnThisStop: boolean;
  viewerIsSeller: boolean;
  viewerIsOwnerCarrierStrict: boolean;
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

function railLegUiFlags(args: {
  logisticsState: string;
  routeOfferResolved: RouteOfferPublicState | undefined;
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

  const curCarrierUid = confirmedCarrierUidForOfferStop(
    routeOfferResolved,
    sheetId,
    stopId,
  );
  const viewerIsConfirmedOnThisStop =
    !!meId && curCarrierUid.length >= 2 && meId === curCarrierUid;

  const ownerFromDelivery = (row?.currentOwnerUserId ?? "").trim();
  const viewerIsSeller = !!meId && sellerUid.length > 1 && meId === sellerUid;
  const viewerIsOwnerCarrierStrict =
    !!meId && ownerFromDelivery.length >= 2 && meId === ownerFromDelivery;

  let showEvidenceBtn: boolean | undefined;
  if (cedeOwnershipByAgreement?.[sheetId]) {
    const route = cedeOwnershipByAgreement[sheetId];
    console.log({ route, stopId });
    if (route?.[stopId ?? ""]) showEvidenceBtn = route[stopId ?? ""];
  }

  const showCedeOwnership =
    activeLike &&
    viewerIsOwnerCarrierStrict &&
    viewerIsConfirmedOnThisStop &&
    !showEvidenceBtn;

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
    sheetId,
    stopId: p.id,
    meId,
    sellerUid,
    row: a.row,
    cedeOwnershipByAgreement,
  });

  const busyKeyBase = `${a.agreementId}:${sheetId}:${p.id}`;

  return {
    ...a,
    ...n,
    ...ui,
    busyKeyBase,
  };
}
