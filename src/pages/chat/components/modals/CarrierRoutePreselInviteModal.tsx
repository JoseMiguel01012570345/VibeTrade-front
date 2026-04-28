import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap } from "react-leaflet";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { cn } from "../../../../lib/cn";
import {
  fetchRouteSheetPreselPreview,
  postCarrierRespondPreselInvite,
} from "../../../../utils/chat/chatApi";
import type { RouteSheet, RouteStop } from "../../domain/routeSheetTypes";
import { formatRouteEstimadoDisplay } from "../../domain/routeSheetDateTime";
import { VibeMapTileLayer } from "../../../home/EmergentRouteFeedMap";
import { LeafletRoadSnappedRoute } from "../../../home/LeafletRoadSnappedRoute";
import {
  emergentMapLegsFromRouteStops,
  emergentMapRouteSegmentColors,
  emergentMapRouteSegments,
} from "../../../../utils/map/emergentRouteMapLegs";
import { routeMapNumberedWaypointIcon } from "../../../../utils/map/storeMapPinIcon";
import {
  mapBackdropLayerAboveChatRail,
  modalFormBody,
  modalShellWide,
  modalSub,
  rutaTramoCard,
  rutaTramoGrid,
  rutaTramoHead,
} from "../../styles/formModalStyles";
import "../../../home/emergentRouteMapMarkers.css";
import "leaflet/dist/leaflet.css";

function coordPair(
  stop: RouteStop,
  end: "origen" | "destino",
): [number, number] | null {
  if (end === "origen") {
    const la = parseFloat((stop.origenLat ?? "").trim());
    const ln = parseFloat((stop.origenLng ?? "").trim());
    if (Number.isFinite(la) && Number.isFinite(ln)) return [la, ln];
  } else {
    const la = parseFloat((stop.destinoLat ?? "").trim());
    const ln = parseFloat((stop.destinoLng ?? "").trim());
    if (Number.isFinite(la) && Number.isFinite(ln)) return [la, ln];
  }
  return null;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function FitRouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 1) return;
    if (positions.length === 1) {
      const p = positions[0]!;
      map.setView(p, 11, { animate: false });
      return;
    }
    const b = L.latLngBounds(positions);
    map.fitBounds(b, { padding: [20, 20], maxZoom: 13, animate: false });
  }, [map, positions]);
  return null;
}

function tramoTarifaHint(stop: RouteStop): string | null {
  const priceRaw = (stop.precioTransportista ?? "").trim();
  if (!priceRaw) return null;
  const o = coordPair(stop, "origen");
  const d = coordPair(stop, "destino");
  const mon = (stop.monedaPago ?? "").trim();
  if (o && d) {
    const km = haversineKm(o, d);
    if (km > 0.05) {
      const price = parseFloat(priceRaw.replace(",", "."));
      if (Number.isFinite(price) && price > 0) {
        const perKm = price / km;
        return `~${perKm.toFixed(2)} ${mon || ""}/km (sobre ${km.toFixed(1)} km rectos entre puntos del mapa)`.trim();
      }
    }
  }
  return mon ? `Tarifa indicada: ${priceRaw} ${mon}` : `Tarifa indicada: ${priceRaw}`;
}

type Props = {
  open: boolean;
  threadId: string;
  routeSheetId: string;
  highlightStopIds: string[];
  onClose: () => void;
  onAccepted: () => void;
};

export function CarrierRoutePreselInviteModal({
  open,
  threadId,
  routeSheetId,
  highlightStopIds,
  onClose,
  onAccepted,
}: Props) {
  const [sheet, setSheet] = useState<RouteSheet | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [scope, setScope] = useState<"all" | string>("all");

  useEffect(() => {
    if (!open) return;
    setScope("all");
    setLoadErr(null);
    setSheet(null);
    let cancelled = false;
    void (async () => {
      try {
        const sh = await fetchRouteSheetPreselPreview(threadId, routeSheetId);
        if (cancelled) return;
        setSheet(sh);
      } catch {
        if (!cancelled) setLoadErr("No se pudieron cargar los datos.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, threadId, routeSheetId]);

  const mapEmergentLegs = useMemo(
    () => (sheet ? emergentMapLegsFromRouteStops(sheet.paradas) : []),
    [sheet],
  );
  const mapRouteSegments = useMemo(
    () => emergentMapRouteSegments(mapEmergentLegs),
    [mapEmergentLegs],
  );
  const mapSegmentColors = useMemo(
    () => emergentMapRouteSegmentColors(mapEmergentLegs),
    [mapEmergentLegs],
  );
  const lineColorByTramoOrden = useMemo(() => {
    const m = new Map<number, string>();
    mapEmergentLegs.forEach((leg, i) => {
      m.set(leg.orden, mapSegmentColors[i] ?? "#2563eb");
    });
    return m;
  }, [mapEmergentLegs, mapSegmentColors]);

  const mapBoundsPositions = useMemo(
    () => mapRouteSegments.flat(),
    [mapRouteSegments],
  );

  const isHighlighted = useCallback(
    (stopId: string) =>
      highlightStopIds.length === 0 || highlightStopIds.includes(stopId),
    [highlightStopIds],
  );

  const onAccept = useCallback(async () => {
    setBusy("accept");
    try {
      await postCarrierRespondPreselInvite(threadId, {
        routeSheetId,
        stopId: scope === "all" ? undefined : scope,
        accepted: true,
      });
      toast.success("Listo: ya formás parte del chat de esta operación.");
      onAccepted();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo confirmar.");
    } finally {
      setBusy(null);
    }
  }, [threadId, routeSheetId, scope, onAccepted, onClose]);

  const onReject = useCallback(async () => {
    setBusy("reject");
    try {
      await postCarrierRespondPreselInvite(threadId, {
        routeSheetId,
        stopId: scope === "all" ? undefined : scope,
        accepted: false,
      });
      toast.success("Le avisamos al vendedor que rechazaste la invitación.");
      onClose();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo enviar el rechazo.",
      );
    } finally {
      setBusy(null);
    }
  }, [threadId, routeSheetId, scope, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className={cn(
          mapBackdropLayerAboveChatRail,
          "fixed inset-0 border-0 bg-black/45",
        )}
        aria-label="Cerrar"
        onClick={() => !busy && onClose()}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="presel-invite-title"
        className={cn(
          modalShellWide,
          "fixed left-1/2 top-1/2 z-[120] max-h-[min(92vh,880px)] -translate-x-1/2 -translate-y-1/2",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2
              id="presel-invite-title"
              className="text-lg font-black tracking-tight"
            >
              Invitación como transportista
            </h2>
            <p className={modalSub}>
              Revisá el trazo, la tarifa y los datos de la hoja. Podés integrarte
              al chat o rechazar; si rechazás, se notifica al vendedor.
            </p>
          </div>
          <button
            type="button"
            className="vt-icon-btn shrink-0"
            disabled={!!busy}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className={modalFormBody}>
          {loadErr ? (
            <p className="font-semibold text-[var(--bad)]">{loadErr}</p>
          ) : !sheet ? (
            <p className="text-[var(--muted)]">Cargando…</p>
          ) : (
            <>
              {highlightStopIds.length > 1 ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-[var(--muted)]">
                    Ámbito de tu respuesta
                  </span>
                  <select
                    className="vt-input"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option value="all">
                      Todos los tramos donde figurás (
                      {highlightStopIds.length})
                    </option>
                    {sheet.paradas
                      .filter((p) => highlightStopIds.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          Tramo {p.orden}: {p.origen} → {p.destino}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}

              <div className="grid gap-3 min-[720px]:grid-cols-2">
                <div className="min-h-[220px] overflow-hidden rounded-xl border border-[var(--border)]">
                  {mapRouteSegments.length > 0 ? (
                    <MapContainer
                      center={mapBoundsPositions[0] ?? [22.5, -81]}
                      zoom={9}
                      className="h-[260px] w-full"
                      scrollWheelZoom
                    >
                      <VibeMapTileLayer />
                      <FitRouteBounds positions={mapBoundsPositions} />
                      <LeafletRoadSnappedRoute
                        segments={mapRouteSegments}
                        segmentColors={mapSegmentColors}
                        useRoads
                      />
                      {sheet.paradas.flatMap((p) => {
                        if (!isHighlighted(p.id)) return [];
                        const o = coordPair(p, "origen");
                        const d = coordPair(p, "destino");
                        const lineC = lineColorByTramoOrden.get(p.orden) ?? "#2563eb";
                        const out: JSX.Element[] = [];
                        if (o)
                          out.push(
                            <Marker
                              key={`${p.id}-o`}
                              position={o}
                              icon={routeMapNumberedWaypointIcon(
                                `${p.orden}a`,
                                lineC,
                              )}
                            />,
                          );
                        if (d)
                          out.push(
                            <Marker
                              key={`${p.id}-d`}
                              position={d}
                              icon={routeMapNumberedWaypointIcon(
                                `${p.orden}b`,
                                lineC,
                              )}
                            />,
                          );
                        return out;
                      })}
                    </MapContainer>
                  ) : (
                    <div className="grid h-[260px] place-items-center px-3 text-center text-sm text-[var(--muted)]">
                      Esta hoja no tiene coordenadas en el mapa para dibujar el
                      trazo. Igual podés revisar los datos del texto.
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] p-3">
                    <div className="text-xs font-bold text-[var(--muted)]">
                      Hoja de ruta
                    </div>
                    <div className="mt-1 font-extrabold">{sheet.titulo}</div>
                    <div className="mt-2 text-sm">{sheet.mercanciasResumen}</div>
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Estado: {sheet.estado}
                      {sheet.publicadaPlataforma ?
                        " · Publicada a transportistas"
                      : ""}
                    </div>
                    {sheet.monedaPago?.trim() ? (
                      <div className="mt-1 text-xs">
                        Moneda (resumen): {sheet.monedaPago}
                      </div>
                    ) : null}
                    {sheet.notasGenerales?.trim() ? (
                      <div className="mt-2 text-sm">
                        <span className="font-bold">Notas: </span>
                        {sheet.notasGenerales}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-1 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Tramos
                </div>
                {sheet.paradas.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      rutaTramoCard,
                      isHighlighted(p.id) &&
                        "border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_7%,var(--surface))]",
                    )}
                  >
                    <div className={rutaTramoHead}>
                      <span className="font-extrabold">
                        Tramo {p.orden}
                        {isHighlighted(p.id) ?
                          " · te incluyen aquí"
                        : null}
                      </span>
                    </div>
                    <div className={rutaTramoGrid}>
                      <div>
                        <div className="text-[11px] font-bold text-[var(--muted)]">
                          Origen
                        </div>
                        <div>{p.origen}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[var(--muted)]">
                          Destino
                        </div>
                        <div>{p.destino}</div>
                      </div>
                      {tramoTarifaHint(p) ? (
                        <div className="min-[561px]:col-span-2">
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Tarifa / km (aprox.)
                          </div>
                          <div className="font-semibold">{tramoTarifaHint(p)}</div>
                        </div>
                      ) : null}
                      {p.tiempoRecogidaEstimado?.trim() ? (
                        <div>
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Recogida
                          </div>
                          <div>{formatRouteEstimadoDisplay(p.tiempoRecogidaEstimado)}</div>
                        </div>
                      ) : null}
                      {p.tiempoEntregaEstimado?.trim() ? (
                        <div>
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Entrega
                          </div>
                          <div>{formatRouteEstimadoDisplay(p.tiempoEntregaEstimado)}</div>
                        </div>
                      ) : null}
                      {p.cargaEnTramo?.trim() ? (
                        <div>
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Carga
                          </div>
                          <div>{p.cargaEnTramo}</div>
                        </div>
                      ) : null}
                      {p.tipoVehiculoRequerido?.trim() ? (
                        <div>
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Vehículo
                          </div>
                          <div>{p.tipoVehiculoRequerido}</div>
                        </div>
                      ) : null}
                      {p.requisitosEspeciales?.trim() ? (
                        <div className="min-[561px]:col-span-2">
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Requisitos
                          </div>
                          <div>{p.requisitosEspeciales}</div>
                        </div>
                      ) : null}
                      {p.notas?.trim() ? (
                        <div className="min-[561px]:col-span-2">
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Notas del tramo
                          </div>
                          <div>{p.notas}</div>
                        </div>
                      ) : null}
                      {p.telefonoTransportista?.trim() ? (
                        <div className="min-[561px]:col-span-2">
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Teléfono en hoja (tu contacto)
                          </div>
                          <div>{p.telefonoTransportista}</div>
                        </div>
                      ) : null}
                      {p.transportInvitedServiceSummary?.trim() ||
                      p.transportInvitedStoreServiceId?.trim() ? (
                        <div className="min-[561px]:col-span-2">
                          <div className="text-[11px] font-bold text-[var(--muted)]">
                            Servicio con el que te invitan
                          </div>
                          <div className="font-semibold">
                            {p.transportInvitedServiceSummary?.trim() ||
                              p.transportInvitedStoreServiceId}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost"
                  disabled={!!busy}
                  onClick={() => void onReject()}
                >
                  {busy === "reject" ? "Enviando…" : "Rechazar"}
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-primary"
                  disabled={!!busy}
                  onClick={() => void onAccept()}
                >
                  {busy === "accept" ? "Confirmando…" : "Aceptar e integrarme al chat"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
