import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import toast from "react-hot-toast";
import {
  Check,
  ChevronRight,
  EyeOff,
  MapPin,
  Megaphone,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Truck,
  Trash2,
} from "lucide-react";
import { useAppStore } from "../../../../app/store/useAppStore";
import { useMarketStore } from "../../../../app/store/useMarketStore";
import { postRouteSheetEditCarrierResponse } from "../../../../utils/chat/chatApi";
import { getSessionToken } from "../../../../utils/http/sessionToken";
import { cn } from "../../../../lib/cn";
import type { RouteOfferPublicState } from "../../../../app/store/marketStoreTypes";
import type { RouteSheet } from "../../domain/routeSheetTypes";
import {
  routeStatusLabel,
  tramoResumenLinea,
} from "../../domain/routeSheetTypes";
import {
  effectiveTramoContactPhone,
  resolveRouteOfferPublicForThread,
  sheetPreviewContactLine,
} from "../../domain/routeSheetOfferGuards";
import { confirmedCarrierIdsOnOffer } from "../../../../app/store/marketSliceHelpers";
import { SELLER_TRUST_PENALTY_ON_EDIT } from "../modals/TrustRiskEditConfirmModal";
import { railItemClass } from "./chatRailStyles";
import { statusPillOk, statusPillPending } from "../../styles/formModalStyles";
import { TramoSubscribedServiceFicha } from "./TramoSubscribedServiceFicha";

type Props = {
  bodyClassName: string;
  actionsLocked: boolean;
  /** Dueño de la tienda del hilo: puede publicar u ocultar hojas. */
  isActingSeller: boolean;
  hasAcceptedContract: boolean;
  /** Cantidad de acuerdos en el hilo: no puede haber más hojas que acuerdos. */
  agreementCount: number;
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
  actionsLocked,
  isActingSeller,
  hasAcceptedContract,
  agreementCount,
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
  const routeOfferFromStore = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId];
      return resolveRouteOfferPublicForThread(s, th);
    }),
  );
  const routeOfferResolved = routeOffer ?? routeOfferFromStore;
  const routeSheetEditAcks = useMarketStore(
    (s) => s.threads[threadId]?.routeSheetEditAcks,
  );
  const chatCarriers = useMarketStore((s) => s.threads[threadId]?.chatCarriers);
  const respondRouteSheetEdit = useMarketStore((s) => s.respondRouteSheetEdit);
  const removeThreadFromList = useMarketStore((s) => s.removeThreadFromList);
  const navigate = useNavigate();

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

  /**
   * Panel de suscriptores: al menos una hoja en el hilo (visible para comprador y vendedor).
   * Prioridad: hoja de la oferta pública si existe en la lista → hoja seleccionada → primera hoja.
   */
  const subscribersTargetSheetId = useMemo(() => {
    if (routeSheets.length === 0) return null;
    const offerSid = routeOfferResolved?.routeSheetId?.trim();
    if (offerSid && routeSheets.some((r) => r.id === offerSid)) return offerSid;
    if (selRoute && routeSheets.some((r) => r.id === selRoute.id))
      return selRoute.id;
    return routeSheets[0].id;
  }, [routeSheets, selRoute, routeOfferResolved?.routeSheetId]);

  return (
    <div className={bodyClassName}>
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
                  ? "Necesitás al menos un contrato aceptado para crear una hoja de ruta"
                  : routeSheetCapReached
                    ? "No podés tener más hojas de ruta que acuerdos: emití otro acuerdo o eliminá una hoja"
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
                disabled={actionsLocked || sheetEditBlockedByCarrierAck}
                title={
                  actionsLocked
                    ? "No disponible hasta registrar el pago"
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
            {sheetEditBlockedByCarrierAck ? (
              <p className="vt-muted w-full text-[11px] leading-snug">
                Hay revisión pendiente: no podés guardar otra edición hasta que
                cada transportista en el hilo{" "}
                <strong className="text-[var(--text)]">acepte o rechace</strong>{" "}
                esta versión de la hoja.
              </p>
            ) : null}
            {isActingSeller ? (
              <button
                type="button"
                className="vt-btn inline-flex items-center gap-1.5 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] bg-[color-mix(in_oklab,#dc2626_6%,var(--surface))] px-2.5 py-1.5 text-xs text-[color-mix(in_oklab,#dc2626_88%,var(--text))] hover:bg-[color-mix(in_oklab,#dc2626_10%,var(--surface))]"
                disabled={actionsLocked}
                title={
                  actionsLocked
                    ? "No disponible hasta registrar el pago"
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
                  (!selRoute.publicadaPlataforma &&
                    !linkedRouteSheetIds.has(selRoute.id))
                }
                title={
                  actionsLocked
                    ? "No disponible hasta registrar el pago"
                    : !linkedRouteSheetIds.has(selRoute.id)
                      ? "Vinculá esta hoja a un acuerdo en Contratos antes de publicar"
                      : selRoute.publicadaPlataforma
                        ? "Dejar de mostrar la hoja en el mercado y búsqueda"
                        : "Publicar la hoja en el mercado (demo)"
                }
                onClick={() => {
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
                La hoja se editó y cambió un tramo que tenés confirmado: solo
                vos podés aceptar o rechazar esta versión para tu tramo.
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
          <ul className="mb-0 mt-3 list-none space-y-0 p-0">
            {selRoute.paradas.map((p) => (
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
                      disabled={actionsLocked}
                      title={
                        actionsLocked
                          ? "No disponible hasta registrar el pago"
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
                {p.tiempoRecogidaEstimado ? (
                  <div className="vt-muted">
                    Recogida: {p.tiempoRecogidaEstimado}
                  </div>
                ) : null}
                {p.tiempoEntregaEstimado ? (
                  <div className="vt-muted">
                    Entrega: {p.tiempoEntregaEstimado}
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
                  const ot =
                    routeOfferResolved?.routeSheetId === selRoute.id
                      ? routeOfferResolved.tramos.find((t) => t.stopId === p.id)
                      : undefined;
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
              </li>
            ))}
          </ul>
        </div>
      ) : routeSheets.length === 0 ? (
        <p className="vt-muted px-1 py-3 text-[13px]">
          {!hasAcceptedContract
            ? isActingSeller
              ? "Primero tenés que tener al menos un contrato aceptado; después podés crear la hoja de ruta y vincularla al acuerdo."
              : "Cuando haya un acuerdo aceptado, la tienda podrá crear la hoja de ruta en esta operación."
            : isActingSeller
              ? "Creá una hoja de ruta y vinculála al acuerdo desde Contratos (con mercancías) antes de publicar en la plataforma."
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
    </div>
  );
}
