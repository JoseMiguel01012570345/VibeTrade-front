import type { NavigateFunction } from "react-router-dom";
import type { RoutesRailSheetDetailShellMergedProps } from "./RoutesRailSheetDetailShell";
import type { RoutesRailSheetDetailProps } from "./routesRailSheetDetailTypes";
import {
  railFlowCarrierAcceptAck,
  railFlowCarrierRejectAck,
} from "./routesRailSheetDetailFlows";
import {
  routesRailEvaluateLiveMapButton,
  routesRailTitlesForSeller,
  runRoutesRailDeleteConfirmation,
  runRoutesRailPublishToggle,
} from "./RoutesRailDetailSections";

/** Arma todas las props del shell (handlers + texto + flags). */
export function composeRoutesRailDetailShellMerged(
  navigate: NavigateFunction,
  props: RoutesRailSheetDetailProps,
  overrides?: {
    onRequestDelete?: () => void;
    onPublishClick?: () => void;
    onDuplicateRouteSheet?: () => void;
  },
): RoutesRailSheetDetailShellMergedProps {
  const titles = routesRailTitlesForSeller({
    actionsLocked: props.actionsLocked,
    sheetLockedByPaid: props.sheetLockedByPaid,
    sheetStructuralEditBlockedByPaid: props.sheetStructuralEditBlockedByPaid,
    sheetEditBlockedByCarrierAck: props.sheetEditBlockedByCarrierAck,
    publicadaPlataforma: props.selRoute.publicadaPlataforma ?? false,
    sheetEstado: props.selRoute.estado,
  });

  return {
    ...props,
    titles,
    sheetAnyLiveTracking: routesRailEvaluateLiveMapButton({
      selRoute: props.selRoute,
      getAgreementForSheet: props.getAgreementForSheet,
      deliveriesByAgreement: props.deliveriesByAgreement,
      meId: props.meId,
    }),
    handleDeleteConfirmed:
      overrides?.onRequestDelete ??
      (() => invokeRoutesRailSheetDeleteConfirmation(props)),
    handlePublishClick:
      overrides?.onPublishClick ??
      (() => invokeRoutesRailSheetPublishToggle(props)),
    handleDuplicateRouteSheet:
      overrides?.onDuplicateRouteSheet ?? (() => undefined),
    acceptCarrierAck: () => invokeRoutesRailCarrierAcceptAck(props),
    rejectCarrierAck: () => invokeRoutesRailCarrierRejectAck(navigate, props),
  };
}

function invokeRoutesRailSheetDeleteConfirmation(
  p: RoutesRailSheetDetailProps,
): void {
  runRoutesRailDeleteConfirmation({
    selRoute: p.selRoute,
    routeOfferResolved: p.routeOfferResolved,
    sheetLockedByPaid: p.sheetLockedByPaid,
    deleteRouteSheet: p.deleteRouteSheet,
    threadId: p.threadId,
    setSelRouteId: p.setSelRouteId,
  });
}

function invokeRoutesRailSheetPublishToggle(
  p: RoutesRailSheetDetailProps,
): void {
  runRoutesRailPublishToggle({
    selRoute: p.selRoute,
    threadId: p.threadId,
    publishRouteSheetsToPlatform: p.publishRouteSheetsToPlatform,
    unpublishRouteSheetFromPlatform: p.unpublishRouteSheetFromPlatform,
  });
}

async function invokeRoutesRailCarrierAcceptAck(
  props: RoutesRailSheetDetailProps,
): Promise<void> {
  await railFlowCarrierAcceptAck({
    threadId: props.threadId,
    selRouteId: props.selRoute.id,
    meId: props.meId,
    onPersistedRouteDataRefresh: props.onPersistedRouteDataRefresh,
    respondRouteSheetEdit: props.respondRouteSheetEdit,
  });
}

async function invokeRoutesRailCarrierRejectAck(
  navigate: NavigateFunction,
  props: RoutesRailSheetDetailProps,
): Promise<void> {
  await railFlowCarrierRejectAck({
    threadId: props.threadId,
    selRouteId: props.selRoute.id,
    meId: props.meId,
    navigate,
    onPersistedRouteDataRefresh: props.onPersistedRouteDataRefresh,
    respondRouteSheetEdit: props.respondRouteSheetEdit,
    removeThreadFromList: props.removeThreadFromList,
  });
}
