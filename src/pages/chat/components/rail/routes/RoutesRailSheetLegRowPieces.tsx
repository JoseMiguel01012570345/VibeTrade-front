import { Button } from "flowbite-react";
import { Check } from "lucide-react";
import { cn } from "../../../../../lib/cn";
import { getSessionToken } from "../../../../../utils/http/sessionToken";
import {
  routeStopDeliveryStateLabelEs,
} from "../../../../../utils/chat/routeLogisticsLabels";
import { formatRouteEstimadoDisplay } from "../../../domain/routeSheetDateTime";
import { effectiveTramoContactPhone } from "../../../domain/routeSheetOfferGuards";
import { tramoResumenLinea, type RouteStop } from "../../../domain/routeSheetTypes";
import { formatKmEs } from "../../../../../utils/map/routeLegMetrics";
import { TramoSubscribedServiceFicha } from "../shared/TramoSubscribedServiceFicha";
import type { RailLegModel } from "./routesRailLegModel";
import { railSellerToggleStopTitle } from "./routesRailSheetStrings";

export function LegStopHeaderToggle(props: {
  p: RouteStop;
  isActingSeller: boolean;
  actionsLocked: boolean;
  sheetLockedByPaid: boolean;
  onToggle: () => void;
}) {
  // Estados
  const { p, isActingSeller, actionsLocked, sheetLockedByPaid, onToggle } =
    props;

  // Funciones
  const completed = cn(
    p.completada && "text-[color-mix(in_oklab,var(--good)_92%,var(--muted))]",
  );
  const shell = cn(
    "rounded-lg border border-[var(--border)] px-2 py-0.5",
    completed,
  );

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-[11px] font-black text-[var(--muted)]">
        {p.orden}
      </span>
      {isActingSeller ? (
        <button
          type="button"
          className={cn(shell, "cursor-pointer bg-[var(--surface)]")}
          disabled={actionsLocked || sheetLockedByPaid}
          title={railSellerToggleStopTitle(actionsLocked, sheetLockedByPaid)}
          onClick={onToggle}
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
      ) : (
        <span
          className={cn(
            shell,
            "inline-flex bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))]",
          )}
          title={p.completada ? "Tramo completado" : "Tramo pendiente"}
          aria-hidden
        >
          <Check size={16} strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

export function LegStopBodyFields(props: { p: RouteStop }) {
  // Estados
  const { p } = props;

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      <div className="font-extrabold">{tramoResumenLinea(p)}</div>
      {p.origenLat || p.origenLng ? (
        <div className="vt-muted">
          Coord. origen: {p.origenLat ?? "—"}, {p.origenLng ?? "—"}
        </div>
      ) : null}
      {p.destinoLat || p.destinoLng ? (
        <div className="vt-muted">
          Coord. destino: {p.destinoLat ?? "—"}, {p.destinoLng ?? "—"}
        </div>
      ) : null}
      <div className="vt-muted">
        Distancia por carretera: {formatKmEs(p.osrmRoadKm ?? 0)}
      </div>
      {p.tiempoRecogidaEstimado ? (
        <div className="vt-muted">
          Recogida:{" "}
          {formatRouteEstimadoDisplay(p.tiempoRecogidaEstimado)}
        </div>
      ) : null}
      {p.tiempoEntregaEstimado ? (
        <div className="vt-muted">
          Entrega:{" "}
          {formatRouteEstimadoDisplay(p.tiempoEntregaEstimado)}
        </div>
      ) : null}
      {p.ventanaHoraria ? (
        <div className="vt-muted">{p.ventanaHoraria}</div>
      ) : null}
      <LegStopMercanciaBlocks p={p} />
    </>
  );
}

export function LegStopMercanciaBlocks({ p }: { p: RouteStop }) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      {p.precioTransportista ? (
        <div className="mt-1 text-xs text-[var(--muted)]">
          <strong>Precio transportista:</strong> {p.precioTransportista}
        </div>
      ) : null}
      {p.cargaEnTramo ? (
        <div className="mt-1 text-xs text-[var(--muted)]">
          <strong>Carga en tramo:</strong> {p.cargaEnTramo}
        </div>
      ) : null}
      {p.tipoMercanciaCarga || p.tipoMercanciaDescarga ? (
        <div className="vt-muted">
          Mercancía carga: {p.tipoMercanciaCarga ?? "—"} · descarga:{" "}
          {p.tipoMercanciaDescarga ?? "—"}
        </div>
      ) : null}
      {p.responsabilidadEmbalaje ? (
        <div className="mt-1 text-xs text-[var(--muted)]">
          <strong>Responsabilidad embalaje:</strong>{" "}
          {p.responsabilidadEmbalaje}
        </div>
      ) : null}
      {p.requisitosEspeciales ? (
        <div className="mt-1 text-xs text-[var(--muted)]">
          <strong>Requisitos especiales:</strong> {p.requisitosEspeciales}
        </div>
      ) : null}
      {p.tipoVehiculoRequerido ? (
        <div className="mt-1 text-xs text-[var(--muted)]">
          <strong>Vehículo requerido:</strong> {p.tipoVehiculoRequerido}
        </div>
      ) : null}
      {p.notas ? (
        <div className="mt-1 text-xs text-[var(--muted)]">{p.notas}</div>
      ) : null}
    </>
  );
}

export function LegContactAssignmentBlock(props: {
  p: RouteStop;
  ot: RailLegModel["ot"];
}) {
  // Estados

  // Funciones
  const tel = effectiveTramoContactPhone(props.p, props.ot);

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      {tel ? (
        <div className="mt-1 text-xs font-semibold text-[var(--text)]">
          <span className="text-[var(--muted)]">Contacto tramo: </span>
          {tel}
        </div>
      ) : null}
      {props.ot?.assignment ? (
        <TramoSubscribedServiceFicha assignment={props.ot.assignment} />
      ) : null}
    </>
  );
}

function LegLogisticsPanelHeader(props: { logisticsLabel: string }) {
  // Estados
  const label = props.logisticsLabel;

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
        Logística
      </div>
      <div className="text-[11px] font-bold text-[var(--text)]">
        Estado:{" "}
        <span className="font-semibold normal-case tracking-normal">
          {label}
        </span>
      </div>
    </div>
  );
}

function LegBtnCedeOwnership(props: {
  busyKeyBase: string;
  logisticsBusyKey: string | null;
  onClick: () => void;
}) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <Button
      color="gray"
      disabled={
        !getSessionToken() ||
        props.logisticsBusyKey === `${props.busyKeyBase}:cede`
      }
      size="xs"
      title="Solo si sos el titular del paquete y el transportista confirmado en este tramo: cedé al confirmado en el siguiente."
      onClick={props.onClick}
    >
      Ceder ownership
    </Button>
  );
}

function LegBtnCarrierEvidenceUpload(props: { onClick: () => void }) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <Button
      color="gray"
      disabled={!getSessionToken()}
      size="xs"
      onClick={props.onClick}
    >
      Evidencia de entrega
    </Button>
  );
}

function LegBtnSellerViewEvidence(props: { onClick: () => void }) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <Button
      color="gray"
      disabled={!getSessionToken()}
      size="xs"
      onClick={props.onClick}
    >
      Ver evidencia
    </Button>
  );
}

function LegEvidenceSellerDecisionPair(props: {
  busyKeyBase: string;
  logisticsBusyKey: string | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <Button
        color="blue"
        disabled={
          !getSessionToken() ||
          props.logisticsBusyKey === `${props.busyKeyBase}:acc`
        }
        size="xs"
        onClick={props.onAccept}
      >
        Aceptar evidencia
      </Button>
      <Button
        color="gray"
        disabled={
          !getSessionToken() ||
          props.logisticsBusyKey === `${props.busyKeyBase}:rej`
        }
        size="xs"
        onClick={props.onReject}
      >
        Rechazar evidencia
      </Button>
    </>
  );
}

export function LegLogisticsButtons(props: {
  m: RailLegModel;
  logisticsBusyKey: string | null;
  onCedeClick: () => void;
  onCarrierEvidenceUploadClick: () => void;
  onSellerEvidenceReadClick: () => void;
  onAcceptEvidence: () => void;
  onRejectEvidence: () => void;
}) {
  // Estados
  const { m, logisticsBusyKey } = props;

  // Funciones
  const evidSeller =
    m.logisticsState === "evidence_submitted" && m.viewerIsSeller;

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="mt-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5">
      <LegLogisticsPanelHeader
        logisticsLabel={routeStopDeliveryStateLabelEs(m.logisticsState)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {m.showCedeOwnership ? (
          <LegBtnCedeOwnership
            busyKeyBase={m.busyKeyBase}
            logisticsBusyKey={logisticsBusyKey}
            onClick={props.onCedeClick}
          />
        ) : null}

        {m.activeLike &&
        m.viewerIsOwnerCarrierStrict &&
        m.showEvidenceBtn ? (
          <LegBtnCarrierEvidenceUpload
            onClick={props.onCarrierEvidenceUploadClick}
          />
        ) : null}

        {evidSeller ? (
          <LegBtnSellerViewEvidence onClick={props.onSellerEvidenceReadClick} />
        ) : null}

        {evidSeller ? (
          <LegEvidenceSellerDecisionPair
            busyKeyBase={m.busyKeyBase}
            logisticsBusyKey={logisticsBusyKey}
            onAccept={props.onAcceptEvidence}
            onReject={props.onRejectEvidence}
          />
        ) : null}
      </div>
    </div>
  );
}
