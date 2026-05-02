import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  EyeOff,
  Loader2,
  MapPinned,
  MapPin,
  Megaphone,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Truck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useAppStore } from "../../../../app/store/useAppStore";
import { useMarketStore } from "../../../../app/store/useMarketStore";
import { postRouteSheetEditCarrierResponse } from "../../../../utils/chat/chatApi";
import { getSessionToken } from "../../../../utils/http/sessionToken";
import { cn } from "../../../../lib/cn";
import type { RouteOfferPublicState } from "../../../../app/store/marketStoreTypes";
import type { TradeAgreement } from "../../domain/tradeAgreementTypes";
import type { RouteSheet } from "../../domain/routeSheetTypes";
import { formatRouteEstimadoDisplay } from "../../domain/routeSheetDateTime";
import {
  routeStatusLabel,
  tramoResumenLinea,
} from "../../domain/routeSheetTypes";
import {
  effectiveTramoContactPhone,
  resolveRouteOfferPublicForSheet,
  resolveRouteOfferPublicForThread,
  ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES,
  sheetPreviewContactLine,
} from "../../domain/routeSheetOfferGuards";
import { confirmedCarrierIdsOnOffer } from "../../../../app/store/marketSliceHelpers";
import { routeSheetIdsLockedByPaidAgreements } from "../../../../app/store/marketStoreHelpers";
import { SELLER_TRUST_PENALTY_ON_EDIT } from "../modals/TrustRiskEditConfirmModal";
import { railItemClass } from "./chatRailStyles";
import { statusPillOk, statusPillPending } from "../../styles/formModalStyles";
import { TramoSubscribedServiceFicha } from "./TramoSubscribedServiceFicha";
import { formatKmEs } from "../../../../utils/map/routeLegMetrics";
import type { ServiceEvidenceAttachmentApi } from "../../../../utils/chat/agreementServiceEvidenceApi";
import {
  carrierDeliveryEvidenceStatusLabelEs,
  routeStopDeliveryStateLabelEs,
} from "../../../../utils/chat/routeLogisticsLabels";
import {
  decideCarrierDeliveryEvidence,
  fetchAgreementRouteDeliveries,
  fetchCarrierDeliveryEvidence,
  postCedeCarrierOwnership,
  upsertCarrierDeliveryEvidence,
  type CarrierDeliveryEvidenceApi,
  type RouteStopDeliveryStatusApi,
} from "../../../../utils/chat/routeLogisticsApi";
import { uploadMedia, mediaApiUrl } from "../../../../utils/media/mediaClient";
import { useCarrierLiveTelemetry } from "../../hooks/useCarrierLiveTelemetry";
import { RouteSheetLiveTrackingModal } from "../modals/RouteSheetLiveTrackingModal";

function CarrierTelemetryBridge(
  args: Readonly<{
    enabled: boolean;
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
    minIntervalMs?: number;
  }>,
): null {
  useCarrierLiveTelemetry(args);
  return null;
}

function normalizeCarrierEvidenceForCompare(
  text: string,
  atts: ServiceEvidenceAttachmentApi[],
): { text: string; attsKey: string } {
  const t = (text ?? "").trim();
  const key = (atts ?? [])
    .map((a) => ({
      url: (a.url ?? "").trim(),
      fileName: (a.fileName ?? "").trim(),
      kind: (a.kind ?? "").trim(),
    }))
    .sort((a, b) =>
      `${a.url}|${a.fileName}|${a.kind}`.localeCompare(
        `${b.url}|${b.fileName}|${b.kind}`,
        "es",
      ),
    )
    .map((a) => `${a.url}|${a.fileName}|${a.kind}`)
    .join(";;");
  return { text: t, attsKey: key };
}

function RouteLegEvidenceAttachmentsList({
  atts,
  onRemove,
}: {
  atts: ServiceEvidenceAttachmentApi[];
  onRemove?: (id: string) => void;
}) {
  if (atts.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {atts.map((a) => (
        <div
          key={a.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-2.5 py-2 text-[13px]"
        >
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 break-words font-semibold text-[var(--primary)] underline"
          >
            {a.fileName || "Abrir adjunto"}
          </a>
          {onRemove ? (
            <button
              type="button"
              className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 text-[12px]"
              onClick={() => onRemove(a.id)}
            >
              <XCircle size={14} aria-hidden />
              Quitar
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

type Props = {
  bodyClassName: string;
  buyerUserId?: string;
  sellerUserId?: string;
  agreements: TradeAgreement[];
  actionsLocked: boolean;
  /** Dueño de la tienda del hilo: puede publicar u ocultar hojas. */
  isActingSeller: boolean;
  hasAcceptedContract: boolean;
  /** Cantidad de acuerdos en el hilo: no puede haber más hojas que acuerdos. */
  agreementCount: number;
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
};

export function ChatRightRailRoutesPanel({
  bodyClassName,
  buyerUserId: _buyerUserId,
  sellerUserId,
  agreements,
  actionsLocked,
  isActingSeller,
  hasAcceptedContract,
  agreementCount,
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
}: Props) {
  const me = useAppStore((s) => s.me);
  /** Oferta alineada con la hoja seleccionada (varias hojas en el hilo → una entrada por `routeSheetId`). */
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
  const navigate = useNavigate();

  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const [liveFocusStopId, setLiveFocusStopId] = useState<string | null>(null);
  const [deliveriesByAgreement, setDeliveriesByAgreement] = useState<
    Record<string, RouteStopDeliveryStatusApi[]>
  >({});
  const [logisticsBusyKey, setLogisticsBusyKey] = useState<string | null>(null);
  const [carrierEvEditModal, setCarrierEvEditModal] = useState<null | {
    routeStopId: string;
    busy: boolean;
    uploading: boolean;
    text: string;
    attachments: ServiceEvidenceAttachmentApi[];
    loaded: CarrierDeliveryEvidenceApi | null;
  }>(null);
  const [carrierEvReadModal, setCarrierEvReadModal] = useState<null | {
    routeStopId: string;
    evidence: CarrierDeliveryEvidenceApi;
  }>(null);

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

  useEffect(() => {
    void (async () => {
      const ids = acceptedAgreements.map((a) => a.id.trim()).filter((x) => x.length >= 8);
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
      setDeliveriesByAgreement((prev) => {
        const next = { ...prev };
        for (const [id, rows] of entries) next[id] = rows;
        return next;
      });
    })();
  }, [threadId, acceptedAgreements]);

  const routeSheetCapReached = routeSheets.length >= agreementCount;

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
  const sheetLockedByPaid =
    !!selRoute && paidLockedSheetIds.has(selRoute.id);

  /**
   * Panel de suscriptores: al menos una hoja en el hilo (visible para comprador y vendedor).
   * Prioridad: hoja seleccionada en el rail (p. ej. «Ver hoja…» desde un acuerdo) → oferta pública → primera hoja.
   */
  const subscribersTargetSheetId = useMemo(() => {
    if (routeSheets.length === 0) return null;
    if (selRoute && routeSheets.some((r) => r.id === selRoute.id))
      return selRoute.id;
    const offerSid = routeOfferResolved?.routeSheetId?.trim();
    if (offerSid && routeSheets.some((r) => r.id === offerSid)) return offerSid;
    return routeSheets[0].id;
  }, [routeSheets, selRoute, routeOfferResolved?.routeSheetId]);

  return (
    <div className={bodyClassName}>
      {routeSheetsLoading ? (
        <div className="vt-muted mb-2 px-1 text-[13px] font-semibold">
          Cargando hojas de ruta...
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap gap-2">
        {isActingSeller ? (
          <button
            type="button"
            className="vt-btn vt-btn-primary flex min-w-0 flex-1 justify-center gap-2"
            disabled={
              actionsLocked || !hasAcceptedContract || routeSheetCapReached
            }
            title={
              actionsLocked
                ? "No disponible hasta registrar el pago en el chat"
                : !hasAcceptedContract
                  ? "Necesitas al menos un contrato aceptado para crear una hoja de ruta"
                  : routeSheetCapReached
                    ? "No puedes tener más hojas de ruta que acuerdos: emite otro acuerdo o elimina una hoja"
                    : undefined
            }
            onClick={onOpenNewRouteSheet}
          >
            <MapPin size={16} className="shrink-0" aria-hidden />
            <span className="truncate">Nueva hoja de ruta</span>
          </button>
        ) : null}
        {subscribersTargetSheetId && onOpenRouteSubscribers ? (
          <button
            type="button"
            className={cn(
              "vt-btn inline-flex shrink-0 items-center justify-center gap-1.5 px-3",
              !isActingSeller && "min-w-0 flex-1",
            )}
            title="Ver transportistas suscritos en la oferta pública vinculada a esta hoja (si aplica)"
            onClick={() => onOpenRouteSubscribers(subscribersTargetSheetId)}
          >
            <Truck size={16} aria-hidden /> Suscriptores
          </button>
        ) : null}
      </div>

      {selRoute ? (
        <div className="text-[13px]">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="m-0 inline-flex cursor-pointer border-0 bg-transparent p-0 text-xs font-extrabold text-[var(--primary)]"
              onClick={() => setSelRouteId(null)}
            >
              ← Lista
            </button>
            {isActingSeller ? (
              <button
                type="button"
                className="vt-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
                disabled={
                  actionsLocked ||
                  sheetEditBlockedByCarrierAck ||
                  sheetLockedByPaid
                }
                title={
                  actionsLocked
                    ? "No disponible hasta registrar el pago"
                    : sheetLockedByPaid
                      ? ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES
                      : sheetEditBlockedByCarrierAck
                        ? "Esperá a que todos los transportistas en el hilo acepten o rechacen la última edición"
                        : selRoute.publicadaPlataforma
                          ? "Editar: se notifica en el chat y los transportistas pueden aceptar o rechazar (demo)"
                          : "Editar hoja de ruta"
                }
                onClick={() => onEditRouteSheet(selRoute)}
              >
                <Pencil size={14} aria-hidden /> Editar
              </button>
            ) : null}
            {sheetLockedByPaid ? (
              <p className="vt-muted w-full text-[11px] leading-snug">
                Hay <strong className="text-[var(--text)]">cobros registrados</strong>{" "}
                en un acuerdo vinculado a esta hoja: no podés editarla, eliminarla
                ni cambiar su publicación en la plataforma.
              </p>
            ) : null}
            {sheetEditBlockedByCarrierAck ? (
              <p className="vt-muted w-full text-[11px] leading-snug">
                Hay revisión pendiente: no puedes guardar otra edición hasta que
                cada transportista en el hilo{" "}
                <strong className="text-[var(--text)]">acepte o rechace</strong>{" "}
                esta versión de la hoja.
              </p>
            ) : null}
            {isActingSeller ? (
              <button
                type="button"
                className="vt-btn inline-flex items-center gap-1.5 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] bg-[color-mix(in_oklab,#dc2626_6%,var(--surface))] px-2.5 py-1.5 text-xs text-[color-mix(in_oklab,#dc2626_88%,var(--text))] hover:bg-[color-mix(in_oklab,#dc2626_10%,var(--surface))]"
                disabled={actionsLocked || sheetLockedByPaid}
                title={
                  actionsLocked
                    ? "No disponible hasta registrar el pago"
                    : sheetLockedByPaid
                      ? ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES
                      : "Eliminar la hoja: los transportistas con tramo en la oferta salen del chat; penalización a la tienda por cada confirmado (demo)"
                }
                onClick={() => {
                  const offerForSheet =
                    routeOfferResolved?.routeSheetId === selRoute.id
                      ? routeOfferResolved
                      : undefined;
                  const nConf = offerForSheet
                    ? confirmedCarrierIdsOnOffer(offerForSheet, selRoute.id)
                        .size
                    : 0;
                  const hasAssigned =
                    !!offerForSheet &&
                    offerForSheet.tramos.some((t) => t.assignment?.userId);
                  const totalPen = nConf * SELLER_TRUST_PENALTY_ON_EDIT;
                  let msg = `¿Eliminar la hoja de ruta «${selRoute.titulo}»? Se quitará el vínculo en los acuerdos.`;
                  if (hasAssigned) {
                    msg +=
                      " Los transportistas con tramo en la oferta saldrán del chat.";
                  }
                  if (nConf > 0) {
                    msg += ` Se descontarán ${totalPen} puntos de confianza de la tienda (${nConf} transportista${nConf === 1 ? "" : "s"} confirmado${nConf === 1 ? "" : "s"}; demo).`;
                  }
                  if (!globalThis.confirm(msg)) return;
                  if (sheetLockedByPaid) {
                    toast.error(ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES);
                    return;
                  }
                  const ok = deleteRouteSheet(threadId, selRoute.id);
                  if (ok) {
                    toast.success("Hoja de ruta eliminada");
                    setSelRouteId(null);
                  } else {
                    toast.error("No se pudo eliminar la hoja de ruta.");
                  }
                }}
              >
                <Trash2 size={14} aria-hidden /> Eliminar
              </button>
            ) : null}
          </div>
          {isActingSeller ? (
            <div className="mb-3">
              <button
                type="button"
                className={cn(
                  "vt-btn flex w-full justify-center gap-2",
                  !selRoute.publicadaPlataforma && "vt-btn-primary",
                )}
                disabled={
                  actionsLocked ||
                  sheetLockedByPaid ||
                  (!selRoute.publicadaPlataforma &&
                    !linkedRouteSheetIds.has(selRoute.id))
                }
                title={
                  actionsLocked
                    ? "No disponible hasta registrar el pago"
                    : sheetLockedByPaid
                      ? ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES
                      : !linkedRouteSheetIds.has(selRoute.id)
                        ? "Vinculá esta hoja a un acuerdo en Contratos antes de publicar"
                        : selRoute.publicadaPlataforma
                          ? "Dejar de mostrar la hoja en el mercado y búsqueda"
                          : "Publicar la hoja en el mercado (demo)"
                }
                onClick={() => {
                  if (sheetLockedByPaid) {
                    toast.error(ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES);
                    return;
                  }
                  if (selRoute.publicadaPlataforma) {
                    if (
                      !globalThis.confirm(
                        `¿Retirar «${selRoute.titulo}» de la plataforma? Los transportistas dejarán de verla en el mercado.`,
                      )
                    )
                      return;
                    unpublishRouteSheetFromPlatform(threadId, selRoute.id);
                    toast.success("Hoja retirada de la plataforma");
                    return;
                  }
                  publishRouteSheetsToPlatform(threadId, [selRoute.id]);
                  toast.success("Hoja publicada en la plataforma");
                }}
              >
                {selRoute.publicadaPlataforma ? (
                  <>
                    <EyeOff size={16} aria-hidden /> Ocultar de la plataforma
                  </>
                ) : (
                  <>
                    <Megaphone size={16} aria-hidden /> Publicar en la
                    plataforma
                  </>
                )}
              </button>
            </div>
          ) : null}
          <div className="mb-1.5 text-[15px] font-black">{selRoute.titulo}</div>
          {myCarrierAck === "pending" && routeSheetEditAcks?.[selRoute.id] ? (
            <div className="mb-3 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-3 py-2.5">
              <div className="text-xs font-extrabold leading-snug">
                Cambios en la hoja (revisión{" "}
                {routeSheetEditAcks[selRoute.id].revision})
              </div>
              <p className="vt-muted mb-2 mt-1 text-[11px] leading-snug">
                La hoja se editó y cambió un tramo que tienes confirmado: solo
                puedes aceptar o rechazar esta versión para tu tramo.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vt-btn vt-btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                  disabled={actionsLocked}
                  onClick={() => {
                    void (async () => {
                      if (
                        threadId.startsWith("cth_") &&
                        getSessionToken() &&
                        onPersistedRouteDataRefresh
                      ) {
                        try {
                          await postRouteSheetEditCarrierResponse(
                            threadId,
                            selRoute.id,
                            true,
                          );
                          await onPersistedRouteDataRefresh();
                          toast.success(
                            "Aceptaste la versión actual de la hoja",
                          );
                        } catch {
                          toast.error("No se pudo registrar la aceptación");
                        }
                        return;
                      }
                      const ok = respondRouteSheetEdit(
                        threadId,
                        selRoute.id,
                        me.id,
                        true,
                      );
                      if (ok)
                        toast.success("Aceptaste la versión actual de la hoja");
                      else toast.error("No se pudo registrar la aceptación");
                    })();
                  }}
                >
                  <ThumbsUp size={14} aria-hidden /> Aceptar cambios
                </button>
                <button
                  type="button"
                  className="vt-btn inline-flex items-center gap-1 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] px-2.5 py-1.5 text-xs"
                  disabled={actionsLocked}
                  onClick={() => {
                    void (async () => {
                      if (
                        threadId.startsWith("cth_") &&
                        getSessionToken() &&
                        onPersistedRouteDataRefresh
                      ) {
                        try {
                          await postRouteSheetEditCarrierResponse(
                            threadId,
                            selRoute.id,
                            false,
                          );
                          await onPersistedRouteDataRefresh();
                          await removeThreadFromList(threadId, {
                            skipServerDelete: true,
                          });
                          toast.success(
                            "Rechazaste la edición: salís del chat del hilo, tus tramos quedan libres en la oferta (demo).",
                          );
                          navigate("/chat");
                        } catch {
                          toast.error("No se pudo registrar el rechazo");
                        }
                        return;
                      }
                      const ok = respondRouteSheetEdit(
                        threadId,
                        selRoute.id,
                        me.id,
                        false,
                      );
                      if (ok) {
                        await removeThreadFromList(threadId, {
                          skipServerDelete: true,
                        });
                        toast.success(
                          "Rechazaste la edición: salís del chat del hilo, tus tramos quedan libres en la oferta (demo).",
                        );
                        navigate("/chat");
                      } else toast.error("No se pudo registrar el rechazo");
                    })();
                  }}
                >
                  <ThumbsDown size={14} aria-hidden /> Rechazar
                </button>
              </div>
            </div>
          ) : null}
          {myCarrierAck === "accepted" ? (
            <p className="vt-muted mb-2 text-[11px]">
              Confirmaste la última versión de esta hoja.
            </p>
          ) : null}
          {myCarrierAck === "rejected" ? (
            <p className="vt-muted mb-2 text-[11px]">
              Rechazaste la última edición de esta hoja.
            </p>
          ) : null}
          {selRoute.publicadaPlataforma ? (
            <div className={cn(statusPillOk, "mb-2 inline-block")}>
              En plataforma
            </div>
          ) : null}
          <div className={cn(statusPillPending, "mb-2 inline-block")}>
            {routeStatusLabel(selRoute.estado)}
          </div>
          <div className="mt-2.5">
            <strong>Mercancías</strong>
            <p className="mb-0 mt-1 leading-snug">
              {selRoute.mercanciasResumen}
            </p>
          </div>
          {selRoute.notasGenerales ? (
            <div className="mt-2.5">
              <strong>Notas generales</strong>
              <p className="mb-0 mt-1 leading-snug">
                {selRoute.notasGenerales}
              </p>
            </div>
          ) : null}
          {(() => {
            const sheetAgreement = agreementForSheet(selRoute.id);
            const sheetAid = (sheetAgreement?.id ?? "").trim();
            const sheetDeliv =
              sheetAid ? deliveriesByAgreement[sheetAid] ?? [] : [];
            const sheetAnyLiveTracking =
              !!sheetAgreement &&
              sheetAid.length >= 8 &&
              !!(me.id ?? "").trim() &&
              selRoute.paradas.some((stop) => {
                const dr = sheetDeliv.find(
                  (d) =>
                    (d.routeSheetId ?? "").trim() === selRoute.id.trim() &&
                    (d.routeStopId ?? "").trim() === (stop.id ?? "").trim(),
                );
                const st = (dr?.state ?? "unpaid").trim().toLowerCase();
                return (
                  !!dr && st !== "unpaid" && !st.startsWith("refunded")
                );
              });
            return sheetAnyLiveTracking ? (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vt-btn vt-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-[13px]"
                  onClick={() => {
                    setLiveFocusStopId(null);
                    setLiveMapOpen(true);
                  }}
                >
                  <MapPinned size={16} aria-hidden /> Mapa en vivo · todos los
                  tramos
                </button>
              </div>
            ) : null;
          })()}
          <ul className="mb-0 mt-3 list-none space-y-0 p-0">
            {selRoute.paradas.map((p) => {
              const agreement = agreementForSheet(selRoute.id);
              const agreementId = (agreement?.id ?? "").trim();
              const deliveries = agreementId ? deliveriesByAgreement[agreementId] ?? [] : [];
              const row = deliveries.find(
                (d) =>
                  (d.routeSheetId ?? "").trim() === selRoute.id.trim() &&
                  (d.routeStopId ?? "").trim() === (p.id ?? "").trim(),
              );
              const state = (row?.state ?? "unpaid").trim().toLowerCase();

              const ot =
                routeOfferResolved?.routeSheetId === selRoute.id
                  ? routeOfferResolved.tramos.find((t) => t.stopId === p.id)
                  : undefined;
              const confirmedCarrier =
                ot?.assignment?.status === "confirmed" ? (ot.assignment.userId ?? "").trim() : "";
              const ownerFromDelivery = (row?.currentOwnerUserId ?? "").trim();
              const effectiveCarrierUid =
                ownerFromDelivery.length >= 2 ? ownerFromDelivery : confirmedCarrier;
              const viewerIsSeller = !!me.id && sellerUid.length > 1 && me.id === sellerUid;
              const viewerIsOwnerCarrier =
                !!me.id &&
                effectiveCarrierUid.length > 1 &&
                me.id === effectiveCarrierUid;

              const telemetryEnabled =
                viewerIsOwnerCarrier &&
                !!agreement &&
                agreementId.length >= 8 &&
                !!row &&
                (state === "paid" ||
                  state === "in_transit" ||
                  state === "awaiting_carrier_for_handoff" ||
                  state === "delivered_pending_evidence");

              const busyKeyBase = `${agreementId}:${selRoute.id}:${p.id}`;

              const activeLike =
                state === "paid" ||
                state === "in_transit" ||
                state === "delivered_pending_evidence" ||
                state === "evidence_submitted" ||
                state === "evidence_rejected";

              return (
              <li
                key={p.id}
                className="mb-2.5 list-none border-b border-dashed border-[color-mix(in_oklab,var(--border)_80%,transparent)] pb-2.5"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-black text-[var(--muted)]">
                    {p.orden}
                  </span>
                  {isActingSeller ? (
                    <button
                      type="button"
                      className={cn(
                        "cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5",
                        p.completada &&
                          "text-[color-mix(in_oklab,var(--good)_92%,var(--muted))]",
                      )}
                      disabled={actionsLocked || sheetLockedByPaid}
                      title={
                        actionsLocked
                          ? "No disponible hasta registrar el pago"
                          : sheetLockedByPaid
                            ? ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES
                            : "Marcar tramo"
                      }
                      onClick={() =>
                        toggleRouteStop(threadId, selRoute.id, p.id)
                      }
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-2 py-0.5",
                        p.completada &&
                          "text-[color-mix(in_oklab,var(--good)_92%,var(--muted))]",
                      )}
                      title={
                        p.completada ? "Tramo completado" : "Tramo pendiente"
                      }
                      aria-hidden
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                <div className="font-extrabold">{tramoResumenLinea(p)}</div>
                {(p.origenLat || p.origenLng) && (
                  <div className="vt-muted">
                    Coord. origen: {p.origenLat ?? "—"}, {p.origenLng ?? "—"}
                  </div>
                )}
                {(p.destinoLat || p.destinoLng) && (
                  <div className="vt-muted">
                    Coord. destino: {p.destinoLat ?? "—"}, {p.destinoLng ?? "—"}
                  </div>
                )}
                <div className="vt-muted">
                  Distancia por carretera: {formatKmEs(p.osrmRoadKm ?? 0)}
                </div>
                {p.tiempoRecogidaEstimado ? (
                  <div className="vt-muted">
                    Recogida: {formatRouteEstimadoDisplay(p.tiempoRecogidaEstimado)}
                  </div>
                ) : null}
                {p.tiempoEntregaEstimado ? (
                  <div className="vt-muted">
                    Entrega: {formatRouteEstimadoDisplay(p.tiempoEntregaEstimado)}
                  </div>
                ) : null}
                {p.ventanaHoraria ? (
                  <div className="vt-muted">{p.ventanaHoraria}</div>
                ) : null}
                {p.precioTransportista ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    <strong>Precio transportista:</strong>{" "}
                    {p.precioTransportista}
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
                    <strong>Requisitos especiales:</strong>{" "}
                    {p.requisitosEspeciales}
                  </div>
                ) : null}
                {p.tipoVehiculoRequerido ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    <strong>Vehículo requerido:</strong>{" "}
                    {p.tipoVehiculoRequerido}
                  </div>
                ) : null}
                {p.notas ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {p.notas}
                  </div>
                ) : null}
                {(() => {
                  const tel = effectiveTramoContactPhone(p, ot);
                  return (
                    <>
                      {tel ? (
                        <div className="mt-1 text-xs font-semibold text-[var(--text)]">
                          <span className="text-[var(--muted)]">
                            Contacto tramo:{" "}
                          </span>
                          {tel}
                        </div>
                      ) : null}
                      {ot?.assignment ? (
                        <TramoSubscribedServiceFicha
                          assignment={ot.assignment}
                        />
                      ) : null}
                    </>
                  );
                })()}

                {agreement && agreementId.length >= 8 ?
                  <div className="mt-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                        Logística
                      </div>
                      <div className="text-[11px] font-bold text-[var(--text)]">
                        Estado:{" "}
                        <span className="font-semibold normal-case tracking-normal">
                          {row ?
                            routeStopDeliveryStateLabelEs(state)
                          : "Sin registro"}
                        </span>
                      </div>
                    </div>

                    {telemetryEnabled && agreementId.length >= 8 ?
                      <CarrierTelemetryBridge
                        enabled
                        threadId={threadId}
                        agreementId={agreementId}
                        routeSheetId={selRoute.id}
                        routeStopId={p.id}
                      />
                    : null}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeLike && viewerIsOwnerCarrier ?
                        <button
                          type="button"
                          className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
                          disabled={!getSessionToken() || logisticsBusyKey === `${busyKeyBase}:cede`}
                          onClick={() => {
                            const target = globalThis.prompt(
                              "UserId del transportista destino (ceder ownership)",
                            );
                            if (!target || !target.trim()) return;
                            void (async () => {
                              try {
                                setLogisticsBusyKey(`${busyKeyBase}:cede`);
                                await postCedeCarrierOwnership({
                                  threadId,
                                  agreementId,
                                  routeSheetId: selRoute.id,
                                  routeStopId: p.id,
                                  targetCarrierUserId: target.trim(),
                                });
                                toast.success("Ownership cedido.");
                                await refreshDeliveriesForAgreement(agreementId);
                              } catch (e) {
                                toast.error((e as Error)?.message ?? "No se pudo ceder ownership.");
                              } finally {
                                setLogisticsBusyKey(null);
                              }
                            })();
                          }}
                        >
                          Ceder ownership
                        </button>
                      : null}

                      {activeLike && viewerIsOwnerCarrier ?
                        <button
                          type="button"
                          className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
                          disabled={!getSessionToken()}
                          onClick={() => {
                            void (async () => {
                              let loaded: CarrierDeliveryEvidenceApi | null = null;
                              try {
                                loaded = await fetchCarrierDeliveryEvidence({
                                  threadId,
                                  agreementId,
                                  routeSheetId: selRoute.id,
                                  routeStopId: p.id,
                                });
                              } catch {
                                /* sin fila previa */
                              }
                              setCarrierEvEditModal({
                                routeStopId: p.id,
                                busy: false,
                                uploading: false,
                                text: loaded?.text ?? "",
                                attachments: loaded?.attachments ?? [],
                                loaded,
                              });
                            })();
                          }}
                        >
                          Evidencia de entrega
                        </button>
                      : null}

                      {viewerIsSeller &&
                      (state === "evidence_submitted" ||
                        state === "evidence_rejected" ||
                        state === "delivered_pending_evidence") ?
                        <button
                          type="button"
                          className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
                          disabled={!getSessionToken()}
                          onClick={() => {
                            void (async () => {
                              try {
                                const ev = await fetchCarrierDeliveryEvidence({
                                  threadId,
                                  agreementId,
                                  routeSheetId: selRoute.id,
                                  routeStopId: p.id,
                                });
                                if (!ev) {
                                  toast.error("Aún no hay evidencia registrada.");
                                  return;
                                }
                                setCarrierEvReadModal({
                                  routeStopId: p.id,
                                  evidence: ev,
                                });
                              } catch {
                                toast.error("No se pudo cargar la evidencia.");
                              }
                            })();
                          }}
                        >
                          Ver evidencia
                        </button>
                      : null}

                      {state === "evidence_submitted" && viewerIsSeller ?
                        <>
                          <button
                            type="button"
                            className="vt-btn vt-btn-primary px-3 py-1 text-[12px]"
                            disabled={!getSessionToken() || logisticsBusyKey === `${busyKeyBase}:acc`}
                            onClick={() => {
                              void (async () => {
                                try {
                                  setLogisticsBusyKey(`${busyKeyBase}:acc`);
                                  await decideCarrierDeliveryEvidence({
                                    threadId,
                                    agreementId,
                                    routeSheetId: selRoute.id,
                                    routeStopId: p.id,
                                    decision: "accept",
                                  });
                                  toast.success("Evidencia aceptada.");
                                  await refreshDeliveriesForAgreement(agreementId);
                                } catch (e) {
                                  toast.error((e as Error)?.message ?? "No se pudo aceptar.");
                                } finally {
                                  setLogisticsBusyKey(null);
                                }
                              })();
                            }}
                          >
                            Aceptar evidencia
                          </button>
                          <button
                            type="button"
                            className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
                            disabled={!getSessionToken() || logisticsBusyKey === `${busyKeyBase}:rej`}
                            onClick={() => {
                              void (async () => {
                                try {
                                  setLogisticsBusyKey(`${busyKeyBase}:rej`);
                                  await decideCarrierDeliveryEvidence({
                                    threadId,
                                    agreementId,
                                    routeSheetId: selRoute.id,
                                    routeStopId: p.id,
                                    decision: "reject",
                                  });
                                  toast.success("Evidencia rechazada.");
                                  await refreshDeliveriesForAgreement(agreementId);
                                } catch (e) {
                                  toast.error((e as Error)?.message ?? "No se pudo rechazar.");
                                } finally {
                                  setLogisticsBusyKey(null);
                                }
                              })();
                            }}
                          >
                            Rechazar evidencia
                          </button>
                        </>
                      : null}
                    </div>
                  </div>
                : null}
              </li>
              );
            })}
          </ul>
        </div>
      ) : routeSheets.length === 0 ? (
        <p className="vt-muted px-1 py-3 text-[13px]">
          {!hasAcceptedContract
            ? isActingSeller
              ? "Primero tienes que tener al menos un contrato aceptado; después puedes crear la hoja de ruta y vincularla al acuerdo."
              : "Cuando haya un acuerdo aceptado, la tienda podrá crear la hoja de ruta en esta operación."
            : isActingSeller
              ? "Crea una hoja de ruta y vinculála al acuerdo desde Contratos (con mercancías) antes de publicar en la plataforma."
              : "La tienda creará y editará la hoja de ruta; aquí podrás ver el avance cuando exista."}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {routeSheets.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={railItemClass}
                onClick={() => setSelRouteId(r.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-extrabold leading-tight">
                    {r.titulo}
                  </span>
                  <span className={statusPillPending}>
                    {routeStatusLabel(r.estado)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">
                  {r.paradas.length} tramo{r.paradas.length === 1 ? "" : "s"}
                  {r.publicadaPlataforma ? (
                    <span className="font-bold text-[color-mix(in_oklab,var(--primary)_85%,var(--muted))]">
                      {" "}
                      · Plataforma
                    </span>
                  ) : null}
                </div>
                {(() => {
                  const line = sheetPreviewContactLine(r, routeOfferResolved);
                  return line ? (
                    <div className="mt-1 line-clamp-2 text-left text-[10px] font-semibold leading-snug text-[var(--text)]">
                      <span className="text-[var(--muted)]">Contacto: </span>
                      {line}
                    </div>
                  ) : null;
                })()}
                <ChevronRight
                  size={16}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {carrierEvEditModal && selRoute ?
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0 text-[13px] font-black text-[var(--text)]">
                Evidencia de entrega · tramo
              </div>
              <button
                type="button"
                className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-2"
                onClick={() => setCarrierEvEditModal(null)}
                disabled={carrierEvEditModal.busy}
              >
                <XCircle size={16} aria-hidden /> Cerrar
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Texto
              </div>
              <textarea
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] text-[var(--text)] outline-none"
                rows={6}
                value={carrierEvEditModal.text}
                onChange={(e) =>
                  setCarrierEvEditModal((m) =>
                    m ? { ...m, text: e.target.value } : m,
                  )
                }
                placeholder="Describe la entrega, número de guía, observaciones…"
                disabled={carrierEvEditModal.busy}
              />
              <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Adjuntos
              </div>
              <p className="vt-muted mt-1 text-[12px]">
                Podés subir imágenes o documentos (igual que en pagos de
                servicios).
              </p>
              <RouteLegEvidenceAttachmentsList
                atts={carrierEvEditModal.attachments}
                onRemove={(id) =>
                  setCarrierEvEditModal((m) =>
                    m ?
                      {
                        ...m,
                        attachments: m.attachments.filter((a) => a.id !== id),
                      }
                    : m,
                  )
                }
              />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-3 py-2 text-[13px] font-semibold text-[var(--text)]">
                <Upload size={16} aria-hidden />
                Subir archivos
                {carrierEvEditModal.uploading ?
                  <Loader2 className="animate-spin" size={16} aria-hidden />
                : null}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (!files.length) return;
                    const aid = (
                      agreementForSheet(selRoute.id)?.id ?? ""
                    ).trim();
                    if (aid.length < 8) return;
                    void (async () => {
                      setCarrierEvEditModal((m) =>
                        m ? { ...m, busy: true, uploading: true } : m,
                      );
                      try {
                        const uploaded: ServiceEvidenceAttachmentApi[] = [];
                        for (const f of files) {
                          const r = await uploadMedia(f);
                          const kind =
                            r.mimeType?.startsWith("image/") ? "image" : (
                              "document"
                            );
                          uploaded.push({
                            id: crypto.randomUUID(),
                            url: mediaApiUrl(r.id),
                            fileName: r.fileName,
                            kind,
                          });
                        }
                        setCarrierEvEditModal((m) =>
                          m ?
                            {
                              ...m,
                              attachments: [...m.attachments, ...uploaded],
                            }
                          : m,
                        );
                      } catch (err) {
                        toast.error(
                          (err as Error)?.message ??
                            "No se pudo subir el adjunto.",
                        );
                      } finally {
                        setCarrierEvEditModal((m) =>
                          m ? { ...m, busy: false, uploading: false } : m,
                        );
                      }
                    })();
                  }}
                  disabled={carrierEvEditModal.busy}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
              {(() => {
                const m = carrierEvEditModal;
                const original = m.loaded;
                const a0 = normalizeCarrierEvidenceForCompare(
                  original?.text ?? "",
                  original?.attachments ?? [],
                );
                const a1 = normalizeCarrierEvidenceForCompare(
                  m.text,
                  m.attachments,
                );
                const dirty = a0.text !== a1.text || a0.attsKey !== a1.attsKey;
                const aid = (
                  agreementForSheet(selRoute.id)?.id ?? ""
                ).trim();
                return (
                  <>
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost inline-flex items-center gap-2 border border-[var(--border)] px-5 py-2.5"
                      disabled={m.busy || !dirty}
                      onClick={() =>
                        void (async () => {
                          if (!dirty) {
                            toast.error("No hay cambios para guardar.");
                            return;
                          }
                          if (aid.length < 8) return;
                          setCarrierEvEditModal((x) =>
                            x ? { ...x, busy: true } : x,
                          );
                          try {
                            await upsertCarrierDeliveryEvidence({
                              threadId,
                              agreementId: aid,
                              routeSheetId: selRoute.id,
                              routeStopId: m.routeStopId,
                              text: m.text,
                              attachments: m.attachments,
                              submit: false,
                            });
                            toast.success("Evidencia guardada (borrador).");
                            await refreshDeliveriesForAgreement(aid);
                            setCarrierEvEditModal(null);
                          } catch (e) {
                            toast.error(
                              (e as Error)?.message ??
                                "No se pudo guardar la evidencia.",
                            );
                          } finally {
                            setCarrierEvEditModal((x) =>
                              x ? { ...x, busy: false } : x,
                            );
                          }
                        })()
                      }
                    >
                      <Pencil size={16} aria-hidden />
                      Guardar borrador
                    </button>
                    <button
                      type="button"
                      className="vt-btn vt-btn-primary inline-flex items-center gap-2"
                      disabled={m.busy || !dirty}
                      onClick={() =>
                        void (async () => {
                          if (!dirty) {
                            toast.error("No hay cambios para enviar.");
                            return;
                          }
                          if (aid.length < 8) return;
                          const lastSent = m.loaded;
                          const lastSentNorm = normalizeCarrierEvidenceForCompare(
                            lastSent?.lastSubmittedText ?? "",
                            lastSent?.lastSubmittedAttachments ?? [],
                          );
                          const nowNorm = normalizeCarrierEvidenceForCompare(
                            m.text,
                            m.attachments,
                          );
                          if (
                            lastSentNorm.text === nowNorm.text &&
                            lastSentNorm.attsKey === nowNorm.attsKey
                          ) {
                            toast.error(
                              "No hay cambios desde la última evidencia enviada.",
                            );
                            return;
                          }
                          setCarrierEvEditModal((x) =>
                            x ? { ...x, busy: true } : x,
                          );
                          try {
                            await upsertCarrierDeliveryEvidence({
                              threadId,
                              agreementId: aid,
                              routeSheetId: selRoute.id,
                              routeStopId: m.routeStopId,
                              text: m.text,
                              attachments: m.attachments,
                              submit: true,
                            });
                            toast.success("Evidencia enviada.");
                            await refreshDeliveriesForAgreement(aid);
                            setCarrierEvEditModal(null);
                          } catch (e) {
                            toast.error(
                              (e as Error)?.message ??
                                "No se pudo enviar la evidencia.",
                            );
                          } finally {
                            setCarrierEvEditModal((x) =>
                              x ? { ...x, busy: false } : x,
                            );
                          }
                        })()
                      }
                    >
                      <BadgeCheck size={16} aria-hidden />
                      Enviar evidencia
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      : null}

      {carrierEvReadModal && selRoute ?
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] font-black text-[var(--text)]">
                  Evidencia de entrega (solo lectura)
                </div>
                <div className="vt-muted mt-0.5 text-[12px]">
                  Estado:{" "}
                  <span className="font-semibold text-[var(--text)]">
                    {carrierDeliveryEvidenceStatusLabelEs(
                      carrierEvReadModal.evidence.status,
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="vt-btn vt-btn-ghost inline-flex items-center gap-1.5 border border-[var(--border)] px-3 py-2"
                onClick={() => setCarrierEvReadModal(null)}
              >
                <XCircle size={16} aria-hidden /> Cerrar
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
              <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Último envío
              </div>
              <div className="mt-1 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] text-[var(--text)]">
                {carrierEvReadModal.evidence.lastSubmittedText?.trim() ||
                  carrierEvReadModal.evidence.text?.trim() ||
                  "—"}
              </div>
              <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                Adjuntos enviados
              </div>
              <RouteLegEvidenceAttachmentsList
                atts={
                  carrierEvReadModal.evidence.lastSubmittedAttachments
                    ?.length ?
                    carrierEvReadModal.evidence.lastSubmittedAttachments
                  : carrierEvReadModal.evidence.attachments ?? []
                }
              />
            </div>
          </div>
        </div>
      : null}

      {liveMapOpen && selRoute ?
        <RouteSheetLiveTrackingModal
          open={liveMapOpen}
          onClose={() => {
            setLiveMapOpen(false);
            setLiveFocusStopId(null);
          }}
          threadId={threadId}
          agreementId={(agreementForSheet(selRoute.id)?.id ?? "").trim()}
          routeSheet={selRoute}
          offerTramos={
            routeOfferResolved?.routeSheetId === selRoute.id ? routeOfferResolved.tramos : undefined
          }
          highlightStopId={liveFocusStopId}
        />
      : null}
    </div>
  );
}
