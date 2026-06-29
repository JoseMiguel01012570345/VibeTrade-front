import {
  RoutesRailCarrierAckSection,
  RoutesRailLiveMapButton,
  RoutesRailMercancíasBlock,
  RoutesRailMetaBadges,
  RoutesRailPublishStrip,
  RoutesRailToolbarTop,
  type RoutesRailTitlesBundle,
} from "./RoutesRailDetailSections";
import type { RoutesRailSheetDetailProps } from "./routesRailSheetDetailTypes";
import type { RouteStop } from "@features/chat/model/routeSheetTypes";
import {
  computeRailLegModel,
  type RailLegModel,
} from "./routesRailLegModel";
import { RoutesRailSheetLegRow } from "./RoutesRailSheetLegRow";

export type RoutesRailSheetDetailShellMergedProps =
  RoutesRailSheetDetailProps & {
    titles: RoutesRailTitlesBundle;
    sheetAnyLiveTracking: boolean;
    handleDeleteConfirmed: () => void;
    handlePublishClick: () => void;
    handleDuplicateRouteSheet: () => void;
    acceptCarrierAck: () => Promise<void>;
    rejectCarrierAck: () => Promise<void>;
  };

/** Bloque JSX del detalle: barra superior, publicación, metadatos, mapa en vivo y tramos. */
export function RoutesRailSheetDetailShell(
  p: RoutesRailSheetDetailShellMergedProps,
) {
  // Estados

  // Funciones
  const sheet = p.selRoute;
  const titlesBundle = p.titles;

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="text-[13px]">
      <RoutesRailDetailToolbarPublishPayment
        p={p}
        titlesBundle={titlesBundle}
      />
      <div className="mb-1.5 text-[15px] font-black">{sheet.titulo}</div>
      <RoutesRailCarrierAckSection
        myCarrierAck={p.myCarrierAck}
        routeSheetEditAcks={p.routeSheetEditAcks}
        selRoute={sheet}
        actionsLocked={p.actionsLocked}
        onAcceptCarrierEdit={() => void p.acceptCarrierAck()}
        onRejectCarrierEdit={() => void p.rejectCarrierAck()}
      />
      <RoutesRailMetaMercLiveBlock
        p={p}
        sheetAnyLiveTracking={p.sheetAnyLiveTracking}
      />
      <RoutesRailLegsUl p={p} />
    </div>
  );
}

function RoutesRailDetailToolbarPublishPayment(props: {
  p: RoutesRailSheetDetailShellMergedProps;
  titlesBundle: RoutesRailTitlesBundle;
}) {
  // Estados

  // Funciones
  const q = props.p;
  const t = props.titlesBundle;

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      <RoutesRailToolbarTop
        setSelRouteId={q.setSelRouteId}
        isActingSeller={q.isActingSeller}
        actionsLocked={q.actionsLocked}
        sheetLockedByPaid={q.sheetLockedByPaid}
        sheetStructuralEditBlockedByPaid={q.sheetStructuralEditBlockedByPaid}
        sheetEditBlockedByCarrierAck={q.sheetEditBlockedByCarrierAck}
        selRoute={q.selRoute}
        inviteTitleStr={t.inviteTitleStr}
        editTitleStr={t.editTitleStr}
        deleteTitleStr={t.deleteTitleStr}
        onInvite={q.onInviteTransportista}
        onEdit={() => q.onEditRouteSheet(q.selRoute)}
        onDuplicate={q.isActingSeller ? q.handleDuplicateRouteSheet : undefined}
        duplicateTitleStr="Duplicar hoja de ruta (copia sin publicar)"
        onRequestDelete={q.handleDeleteConfirmed}
      />
      <RoutesRailPublishStrip
        isActingSeller={q.isActingSeller}
        selRoute={q.selRoute}
        publishTitleStr={t.publishTitleStr}
        onPublishClick={q.handlePublishClick}
      />
    </>
  );
}

function RoutesRailMetaMercLiveBlock(props: {
  p: RoutesRailSheetDetailShellMergedProps;
  sheetAnyLiveTracking: boolean;
}) {
  // Estados

  // Funciones
  const q = props.p;

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      <RoutesRailMetaBadges selRoute={q.selRoute} />
      <RoutesRailMercancíasBlock selRoute={q.selRoute} />
      {props.sheetAnyLiveTracking ? (
        <RoutesRailLiveMapButton onClick={q.onOpenLiveMapAllStops} />
      ) : null}
    </>
  );
}

function RoutesRailLegsUl(props: {
  p: RoutesRailSheetDetailShellMergedProps;
}) {
  // Estados

  // Funciones
  const q = props.p;

  function modeloLegParaParada(stop: RouteStop): RailLegModel {
    return computeRailLegModel({
      selRoute: q.selRoute,
      stop,
      routeOfferResolved: q.routeOfferResolved,
      getAgreementForSheet: q.getAgreementForSheet,
      deliveriesByAgreement: q.deliveriesByAgreement,
      meId: q.meId,
      sellerUid: q.sellerUid,
      cedeOwnershipByAgreement: q.cedeOwnershipByAgreement,
      routeTramoSubscriptions: q.routeTramoSubscriptions,
    });
  }

  // useEffects

  // Vista (HTML + CSS)
  return (
    <ul className="mb-0 mt-3 list-none space-y-0 p-0">
      {q.selRoute.paradas.map((pStop) => {
        return (
          <RoutesRailSheetLegRow
            key={pStop.id}
            threadId={q.threadId}
            selRoute={q.selRoute}
            p={pStop}
            m={modeloLegParaParada(pStop)}
            isActingSeller={q.isActingSeller}
            actionsLocked={q.actionsLocked}
            sheetLockedByPaid={q.sheetLockedByPaid}
            logisticsBusyKey={q.logisticsBusyKey}
          />
        );
      })}
    </ul>
  );
}
