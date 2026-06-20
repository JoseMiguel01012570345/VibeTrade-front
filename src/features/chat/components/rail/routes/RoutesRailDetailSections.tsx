import type { ReactElement } from "react";
import { Badge, Button } from "flowbite-react";
import {
  EyeOff,
  Copy,
  MapPinned,
  Megaphone,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  RouteOfferPublicState,
  RouteSheetEditAckState,
} from "@app/store/marketStoreTypes";
import { ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES, ROUTE_SHEET_PUBLISH_BLOCKED_DELIVERED_ES, routeSheetPublishBlockedWhenDelivered } from "@features/market/model/routeSheetOfferGuards";
import {
  routeStatusLabel,
  type RouteSheet,
} from "@features/market/model/routeSheetTypes";
import type { TradeAgreement } from "@features/market/model/tradeAgreementTypes";
import type { RouteStopDeliveryStatusApi } from "@/utils/chat/routeLogisticsApi";
import {
  railDetailDeleteTitle,
  railDetailPublishTitle,
  railDetailSellerEditTitle,
  railInviteTitle,
} from "./routesRailSheetStrings";
import { railSheetAnyPaidStopForLiveMap } from "./routesRailSheetDetailFlows";

/** Barra superior del detalle: volver a lista + acciones vendedor. */
export function RoutesRailToolbarTop(props: {
  setSelRouteId: (id: string | null) => void;
  isActingSeller: boolean;
  actionsLocked: boolean;
  sheetLockedByPaid: boolean;
  sheetStructuralEditBlockedByPaid: boolean;
  sheetEditBlockedByCarrierAck: boolean;
  selRoute: RouteSheet;
  inviteTitleStr: string;
  editTitleStr: string;
  deleteTitleStr: string;
  duplicateTitleStr?: string;
  onInvite: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
  onRequestDelete: () => void;
}) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
      <Button
        color="alternative"
        className="m-0 !rounded-none border-0 bg-transparent p-0 font-extrabold text-[var(--primary)] shadow-none hover:bg-transparent hover:underline dark:bg-transparent dark:hover:bg-transparent"
        size="xs"
        onClick={() => props.setSelRouteId(null)}
      >
        ← Lista
      </Button>
      {RoutesRailToolbarSellerRow(props)}
      {props.sheetLockedByPaid ? (
        props.sheetStructuralEditBlockedByPaid ? (
          RoutesRailPaidLockNote()
        ) : (
          RoutesRailPaidCarrierContactNote()
        )
      ) : null}
      {props.sheetEditBlockedByCarrierAck ? RoutesRailPendingAckNote() : null}
      {RoutesRailToolbarDeleteBtn(props)}
    </div>
  );
}

function RoutesRailToolbarSellerRow(props: {
  isActingSeller: boolean;
  actionsLocked: boolean;
  sheetLockedByPaid: boolean;
  sheetStructuralEditBlockedByPaid: boolean;
  sheetEditBlockedByCarrierAck: boolean;
  selRoute: RouteSheet;
  inviteTitleStr: string;
  editTitleStr: string;
  duplicateTitleStr?: string;
  onInvite: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
}) {
  // Estados

  // Funciones
  const dis =
    props.actionsLocked ||
    props.sheetEditBlockedByCarrierAck ||
    props.sheetStructuralEditBlockedByPaid;

  // useEffects

  // Vista (HTML + CSS)
  if (!props.isActingSeller) return null;
  return (
    <>
      <Button
        className="[&>span]:gap-1.5 [&>span]:text-xs"
        color="gray"
        disabled={dis}
        title={props.editTitleStr}
        size="xs"
        onClick={props.onEdit}
      >
        <span className="flex items-center gap-1.5">
          <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Editar
        </span>
      </Button>
      {props.onDuplicate ? (
        <Button
          className="[&>span]:gap-1.5 [&>span]:text-xs"
          color="gray"
          title={
            props.sheetLockedByPaid
              ? ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES
              : (props.duplicateTitleStr ?? "Duplicar hoja de ruta")
          }
          size="xs"
          onClick={props.onDuplicate}
        >
          <span className="flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Duplicar
          </span>
        </Button>
      ) : null}
      <Button
        className="[&>span]:gap-1.5 [&>span]:text-xs"
        color="gray"
        disabled={dis}
        title={props.inviteTitleStr}
        size="xs"
        onClick={props.onInvite}
      >
        <span className="flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden /> Invitar
          transportista
        </span>
      </Button>
    </>
  );
}

function RoutesRailPaidLockNote(): ReactElement {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <p className="vt-muted w-full text-[11px] leading-snug">
      Hay <strong className="text-[var(--text)]">cobros registrados</strong> en
      un acuerdo vinculado a esta hoja: no podés editarla, eliminarla ni cambiar
      su publicación en la plataforma.
    </p>
  );
}

function RoutesRailPaidCarrierContactNote(): ReactElement {
  return (
    <p className="vt-muted w-full text-[11px] leading-snug">
      Hay <strong className="text-[var(--text)]">cobros registrados</strong>, pero
      podés indicar un nuevo transportista en tramos sin asignación confirmada
      (Editar → teléfono → Invitar).
    </p>
  );
}

function RoutesRailPendingAckNote(): ReactElement {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <p className="vt-muted w-full text-[11px] leading-snug">
      Hay revisión pendiente: no puedes guardar otra edición hasta que cada
      transportista en el hilo{" "}
      <strong className="text-[var(--text)]">acepte o rechace</strong> esta
      versión de la hoja.
    </p>
  );
}

function RoutesRailToolbarDeleteBtn(props: {
  isActingSeller: boolean;
  actionsLocked: boolean;
  sheetLockedByPaid: boolean;
  deleteTitleStr: string;
  onRequestDelete: () => void;
}): ReactElement | null {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  if (!props.isActingSeller) return null;
  return (
    <Button
      className="[&>span]:gap-1.5 [&>span]:text-xs"
      color="failure"
      disabled={props.actionsLocked || props.sheetLockedByPaid}
      outline
      title={props.deleteTitleStr}
      size="xs"
      onClick={props.onRequestDelete}
    >
      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> Eliminar
    </Button>
  );
}

export function RoutesRailPublishStrip(props: {
  isActingSeller: boolean;
  selRoute: RouteSheet;
  publishTitleStr: string;
  onPublishClick: () => void;
}) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  if (!props.isActingSeller) return null;
  return (
    <div className="mb-3">
      <Button
        className="w-full justify-center [&>span]:gap-2"
        color={props.selRoute.publicadaPlataforma ? "gray" : "blue"}
        title={props.publishTitleStr}
        onClick={props.onPublishClick}
      >
        {props.selRoute.publicadaPlataforma ? (
          <>
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> Ocultar de la
            plataforma
          </>
        ) : (
          <>
            <Megaphone className="h-4 w-4 shrink-0" aria-hidden /> Publicar en
            la plataforma
          </>
        )}
      </Button>
    </div>
  );
}

export function RoutesRailCarrierAckSection(props: {
  myCarrierAck: "pending" | "accepted" | "rejected" | undefined;
  routeSheetEditAcks: Record<string, RouteSheetEditAckState> | undefined;
  selRoute: RouteSheet;
  actionsLocked: boolean;
  onAcceptCarrierEdit: () => void;
  onRejectCarrierEdit: () => void;
}) {
  // Estados
  const revision = props.routeSheetEditAcks?.[props.selRoute.id];

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  if (props.myCarrierAck === "pending" && revision) {
    return RoutesRailCarrierPendingAckBanner({
      revision: revision.revision,
      actionsLocked: props.actionsLocked,
      onAcceptCarrierEdit: props.onAcceptCarrierEdit,
      onRejectCarrierEdit: props.onRejectCarrierEdit,
    });
  }
  if (props.myCarrierAck === "accepted") {
    return (
      <p className="vt-muted mb-2 text-[11px]">
        Confirmaste la última versión de esta hoja.
      </p>
    );
  }
  if (props.myCarrierAck === "rejected") {
    return (
      <p className="vt-muted mb-2 text-[11px]">
        Rechazaste la última edición de esta hoja.
      </p>
    );
  }
  return null;
}

function RoutesRailCarrierPendingAckBanner(b: {
  revision: number;
  actionsLocked: boolean;
  onAcceptCarrierEdit: () => void;
  onRejectCarrierEdit: () => void;
}) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="mb-3 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-3 py-2.5">
      <div className="text-xs font-extrabold leading-snug">
        Cambios en la hoja (revisión {b.revision})
      </div>
      <p className="vt-muted mb-2 mt-1 text-[11px] leading-snug">
        La hoja se editó y cambió un tramo que tienes confirmado: solo puedes
        aceptar o rechazar esta versión para tu tramo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="[&>span]:gap-1 [&>span]:text-xs"
          color="blue"
          disabled={b.actionsLocked}
          size="xs"
          onClick={b.onAcceptCarrierEdit}
        >
          <ThumbsUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> Aceptar
          cambios
        </Button>
        <Button
          className="[&>span]:gap-1 [&>span]:text-xs"
          color="failure"
          disabled={b.actionsLocked}
          outline
          size="xs"
          onClick={b.onRejectCarrierEdit}
        >
          <ThumbsDown className="h-3.5 w-3.5 shrink-0" aria-hidden /> Rechazar
        </Button>
      </div>
    </div>
  );
}

export function RoutesRailMetaBadges(props: { selRoute: RouteSheet }) {
  // Estados
  const r = props.selRoute;

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      {r.publicadaPlataforma ? (
        <Badge
          className="mb-2 mr-2 inline-block rounded-full uppercase"
          color="success"
        >
          En plataforma
        </Badge>
      ) : null}
      <Badge
        className="mb-2 mr-2 inline-block rounded-full uppercase"
        color="dark"
      >
        {routeStatusLabel(r.estado)}
      </Badge>
    </>
  );
}

export function RoutesRailMercancíasBlock(props: { selRoute: RouteSheet }) {
  // Estados
  const r = props.selRoute;

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <>
      <div className="mt-2.5">
        <strong>Mercancías</strong>
        <p className="mb-0 mt-1 leading-snug">{r.mercanciasResumen}</p>
      </div>
      {r.notasGenerales ? (
        <div className="mt-2.5">
          <strong>Notas generales</strong>
          <p className="mb-0 mt-1 leading-snug">{r.notasGenerales}</p>
        </div>
      ) : null}
    </>
  );
}

export function RoutesRailLiveMapButton(props: { onClick: () => void }) {
  // Estados

  // Funciones

  // useEffects

  // Vista (HTML + CSS)
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <Button
        className="[&>span]:gap-1.5"
        color="blue"
        onClick={props.onClick}
        size="sm"
      >
        <MapPinned className="h-4 w-4 shrink-0" aria-hidden /> Mapa en vivo ·
        todos los tramos
      </Button>
    </div>
  );
}

/** Orquestadores de eventos desde el padre — cadena corta sobre flows/strings. */

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
