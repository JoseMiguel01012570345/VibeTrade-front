import toast from "react-hot-toast";
import type {
  RouteOfferPublicState,
} from "@features/market/logic/store/marketStoreTypes";
import {
  ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES,
  ROUTE_SHEET_PUBLISH_BLOCKED_DELIVERED_ES,
  routeSheetPublishBlockedWhenDelivered,
} from "@features/chat/logic/route-sheet/routeSheetOfferGuards";
import type { RouteSheet } from "@features/chat/Dtos/route-sheet/routeSheetTypes";
import type { TradeAgreement } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";
import {
  railDetailDeleteTitle,
  railDetailPublishTitle,
  railDetailSellerEditTitle,
  railInviteTitle,
} from "@features/chat/logic/rail/routesRailSheetStrings";
import { railSheetAnyPaidStopForLiveMap } from "@features/chat/logic/rail/routesRailSheetDetailFlows";

export function runRoutesRailDeleteConfirmation(args: {
  selRoute: RouteSheet;
  routeOfferResolved: RouteOfferPublicState | undefined;
  sheetLockedByPaid: boolean;
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean;
  threadId: string;
  setSelRouteId: (id: string | null) => void;
}): void {
  if (args.sheetLockedByPaid) {
    toast.error(ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES);
    return;
  }
  const ok = args.deleteRouteSheet(args.threadId, args.selRoute.id);
  if (ok) {
    toast.success("Hoja de ruta eliminada");
    args.setSelRouteId(null);
  } else toast.error("No se pudo eliminar la hoja de ruta.");
}

export function runRoutesRailPublishToggle(args: {
  selRoute: RouteSheet;
  threadId: string;
  publishRouteSheetsToPlatform: (threadId: string, ids: string[]) => void;
  unpublishRouteSheetFromPlatform: (threadId: string, id: string) => void;
}): void {
  if (args.selRoute.publicadaPlataforma) {
    args.unpublishRouteSheetFromPlatform(args.threadId, args.selRoute.id);
    toast.success("Hoja retirada de la plataforma");
    return;
  }
  if (routeSheetPublishBlockedWhenDelivered(args.selRoute.estado)) {
    toast.error(ROUTE_SHEET_PUBLISH_BLOCKED_DELIVERED_ES);
    return;
  }
  args.publishRouteSheetsToPlatform(args.threadId, [args.selRoute.id]);
  toast.success("Hoja publicada en la plataforma");
}

export function buildRoutesRailUnpublishConfirmMessage(selRoute: RouteSheet): string {
  return `¿Retirar «${selRoute.titulo}» de la plataforma? Los transportistas dejarán de verla en el mercado.`;
}

export type RoutesRailTitlesBundle = {
  editTitleStr: string;
  inviteTitleStr: string;
  deleteTitleStr: string;
  publishTitleStr: string;
};

export function routesRailTitlesForSeller(args: {
  actionsLocked: boolean;
  sheetLockedByPaid: boolean;
  sheetStructuralEditBlockedByPaid: boolean;
  sheetEditBlockedByCarrierAck: boolean;
  publicadaPlataforma: boolean;
  sheetEstado?: RouteSheet["estado"];
}): RoutesRailTitlesBundle {
  const carrierContactEditOnly =
    args.sheetLockedByPaid && !args.sheetStructuralEditBlockedByPaid;
  return {
    editTitleStr: railDetailSellerEditTitle(
      args.actionsLocked,
      args.sheetStructuralEditBlockedByPaid,
      args.sheetEditBlockedByCarrierAck,
      args.publicadaPlataforma,
      carrierContactEditOnly,
    ),
    inviteTitleStr: railInviteTitle(
      args.actionsLocked,
      args.sheetStructuralEditBlockedByPaid,
      carrierContactEditOnly,
    ),
    deleteTitleStr: railDetailDeleteTitle(
      args.actionsLocked,
      args.sheetLockedByPaid,
    ),
    publishTitleStr: railDetailPublishTitle(args.publicadaPlataforma, args.sheetEstado),
  };
}

export function routesRailEvaluateLiveMapButton(args: {
  selRoute: RouteSheet;
  getAgreementForSheet: (routeSheetId: string) => TradeAgreement | null;
  deliveriesByAgreement: Record<string, RouteStopDeliveryStatusApi[]>;
  meId: string;
}): boolean {
  const sheetAgreement = args.getAgreementForSheet(args.selRoute.id);
  const sheetAid = (sheetAgreement?.id ?? "").trim();
  const sheetDeliv = sheetAid
    ? (args.deliveriesByAgreement[sheetAid] ?? [])
    : [];
  return railSheetAnyPaidStopForLiveMap({
    sheetId: args.selRoute.id,
    paradas: args.selRoute.paradas,
    deliveries: sheetDeliv,
    meHasId: !!(args.meId ?? "").trim(),
    agreementReady: !!sheetAgreement && sheetAid.length >= 8,
  });
}
