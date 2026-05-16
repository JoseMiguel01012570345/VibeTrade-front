import type { ReactElement } from "react";
import type { RouteSheet, RouteStop } from "../../../domain/routeSheetTypes";
import type { RailLegModel } from "./routesRailLegModel";
import {
  railLegLoadCarrierEvidenceEditor,
  railLegOpenCedeOwnershipModal,
  railLegOpenSellerPauseTramoModal,
  railLegOpenSellerResumeTramoModal,
  railLegOpenSellerEvidenceRead,
  railLegSellerDecideEvidence,
} from "./routesRailLegHandlers";
import { useRailRoutesDispatch } from "../bus/RailRoutesBusContext";
import {
  LegContactAssignmentBlock,
  LegLogisticsButtons,
  LegStopBodyFields,
  LegStopHeaderToggle,
} from "./RoutesRailSheetLegRowPieces";

export type Props = {
  threadId: string;
  selRoute: RouteSheet;
  p: RouteStop;
  m: RailLegModel;
  isActingSeller: boolean;
  actionsLocked: boolean;
  sheetLockedByPaid: boolean;
  logisticsBusyKey: string | null;
};

/** Una fila de tramo dentro del detalle de hoja de ruta. */
export function RoutesRailSheetLegRow(props: Props): ReactElement {
  // Estados
  const dispatch = useRailRoutesDispatch();

  // Funciones
  const agreementIdReady = (props.m.agreementId ?? "").length >= 8;
  const ctx = {
    threadId: props.threadId,
    selRoute: props.selRoute,
    p: props.p,
    m: props.m,
    dispatch,
  };

  function onEvidenceCarrierUpload(): void {
    void railLegLoadCarrierEvidenceEditor(ctx);
  }

  function onEvidenceSellerPreview(): void {
    void railLegOpenSellerEvidenceRead(ctx);
  }

  function onCede(): void {
    railLegOpenCedeOwnershipModal(ctx);
  }

  function onSellerPause(): void {
    railLegOpenSellerPauseTramoModal(ctx);
  }

  function onSellerResume(): void {
    railLegOpenSellerResumeTramoModal(ctx);
  }

  function acceptEv(): void {
    void railLegSellerDecideEvidence(ctx, "accept");
  }

  function rejectEv(): void {
    void railLegSellerDecideEvidence(ctx, "reject");
  }

  function onToggleStop(): void {
    dispatch({
      type: "toggleRouteStop",
      routeSheetId: props.selRoute.id,
      stopId: props.p.id,
    });
  }

  // useEffects

  // Vista (HTML + CSS)
  return (
    <li className="mb-2.5 list-none border-b border-dashed border-[color-mix(in_oklab,var(--border)_80%,transparent)] pb-2.5">
      <LegStopHeaderToggle
        p={props.p}
        isActingSeller={props.isActingSeller}
        actionsLocked={props.actionsLocked}
        sheetLockedByPaid={props.sheetLockedByPaid}
        onToggle={onToggleStop}
      />
      <LegStopBodyFields p={props.p} />
      <LegContactAssignmentBlock p={props.p} ot={props.m.ot} />

      {props.m.agreement && agreementIdReady ? (
        <LegLogisticsButtons
          m={props.m}
          isActingSeller={props.isActingSeller}
          actionsLocked={props.actionsLocked}
          logisticsBusyKey={props.logisticsBusyKey}
          onCedeClick={onCede}
          onCarrierEvidenceUploadClick={onEvidenceCarrierUpload}
          onSellerEvidenceReadClick={onEvidenceSellerPreview}
          onAcceptEvidence={acceptEv}
          onRejectEvidence={rejectEv}
          onSellerPauseClick={onSellerPause}
          onSellerResumeClick={onSellerResume}
        />
      ) : null}
    </li>
  );
}
