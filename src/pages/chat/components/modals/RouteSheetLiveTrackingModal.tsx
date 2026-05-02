import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap } from "react-leaflet";
import { X } from "lucide-react";
import { cn } from "../../../../lib/cn";
import type { RouteOfferTramoPublic } from "../../../../app/store/marketStoreTypes";
import type { RouteSheet, RouteStop } from "../../domain/routeSheetTypes";
import { VibeMapTileLayer } from "../../../home/EmergentRouteFeedMap";
import { LeafletRoadSnappedRoute } from "../../../home/LeafletRoadSnappedRoute";
import {
  emergentMapLegsFromRouteStops,
  emergentMapRouteSegmentColors,
  emergentMapRouteSegments,
} from "../../../../utils/map/emergentRouteMapLegs";
import {
  routeMapFinishWaypointIcon,
  routeMapNumberedWaypointIcon,
} from "../../../../utils/map/storeMapPinIcon";
import {
  mapBackdropLayerAboveChatRail,
  modalShellWide,
  modalSub,
} from "../../styles/formModalStyles";
import "../../../home/emergentRouteMapMarkers.css";
import "leaflet/dist/leaflet.css";
import {
  subscribeCarrierTelemetryUpdated,
  type CarrierTelemetryUpdatedPayload,
} from "../../../../utils/chat/chatRealtime";

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
    map.fitBounds(b, { padding: [24, 24], maxZoom: 13, animate: false });
  }, [map, positions]);
  return null;
}

function vehicleIcon(label: string) {
  const w = Math.max(34, 18 + label.length * 9);
  return L.divIcon({
    className: "emergent-route-legend",
    html: `<div class="er-mark" style="background:#2563eb">${label}</div>`,
    iconSize: [w, 28],
    iconAnchor: [w / 2, 14],
  });
}

type Props = {
  open: boolean;
  onClose: () => void;
  threadId: string;
  agreementId: string;
  routeSheet: RouteSheet;
  /** Tramos públicos de la oferta vinculada (para geometría OSRM persistida). */
  offerTramos?: RouteOfferTramoPublic[];
  /** Resaltar un tramo (p. ej. «En proceso»). */
  highlightStopId?: string | null;
};

export function RouteSheetLiveTrackingModal({
  open,
  onClose,
  threadId,
  agreementId,
  routeSheet,
  offerTramos,
  highlightStopId,
}: Props) {
  const [telemetryByStop, setTelemetryByStop] = useState<
    Record<string, CarrierTelemetryUpdatedPayload>
  >({});

  useEffect(() => {
    if (!open) {
      setTelemetryByStop({});
      return;
    }
    const unsub = subscribeCarrierTelemetryUpdated((p) => {
      if (p.threadId.trim() !== threadId.trim()) return;
      if (p.agreementId.trim() !== agreementId.trim()) return;
      if (p.routeSheetId.trim() !== routeSheet.id.trim()) return;
      const sid = p.routeStopId.trim();
      if (sid.length < 2) return;
      setTelemetryByStop((prev) => ({ ...prev, [sid]: p }));
    });
    return unsub;
  }, [open, threadId, agreementId, routeSheet.id]);

  const stopsOrdered = useMemo(
    () => [...routeSheet.paradas].sort((a, b) => a.orden - b.orden),
    [routeSheet.paradas],
  );

  const legs = useMemo(() => {
    const byStop = new Map<string, RouteOfferTramoPublic>();
    for (const t of offerTramos ?? []) {
      byStop.set((t.stopId ?? "").trim(), t);
    }
    const merged = stopsOrdered.map((p) => {
      const ot = byStop.get((p.id ?? "").trim());
      const latlngs = ot?.osrmRouteLatLngs;
      if (!latlngs || latlngs.length < 2) return p;
      if (p.osrmRouteLatLngs && p.osrmRouteLatLngs.length >= 2) return p;
      return { ...p, osrmRouteLatLngs: latlngs };
    });
    return emergentMapLegsFromRouteStops(merged);
  }, [offerTramos, stopsOrdered]);

  const routeSegments = useMemo(() => emergentMapRouteSegments(legs), [legs]);
  const segmentColors = useMemo(() => emergentMapRouteSegmentColors(legs), [legs]);
  const mapUsesPersistedOsrmGeometry = useMemo(
    () => legs.length > 0 && legs.every((leg) => !leg.synthetic),
    [legs],
  );

  const highlight = (highlightStopId ?? "").trim();

  const boundsPositions = useMemo(() => {
    const pts: [number, number][] = [];
    for (const st of stopsOrdered) {
      const o = coordPair(st, "origen");
      const d = coordPair(st, "destino");
      if (o) pts.push(o);
      if (d) pts.push(d);
    }
    for (const p of Object.values(telemetryByStop)) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      pts.push([p.lat, p.lng]);
    }
    return pts;
  }, [stopsOrdered, telemetryByStop]);

  if (!open) return null;

  return (
    <div className={cn("vt-modal-backdrop", mapBackdropLayerAboveChatRail)} role="presentation">
      <div
        className={cn(modalShellWide, "flex max-h-[min(92dvh,880px)] w-full max-w-[980px] flex-col overflow-hidden p-0")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vt-live-route-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div id="vt-live-route-title" className="vt-modal-title">
              Seguimiento en vivo — {(routeSheet.titulo ?? "").trim() || "Hoja de ruta"}
            </div>
            <p className={cn(modalSub, "mt-1 mb-0")}>
              Posiciones emitidas por el transportista con ownership activo. Acuerdo{" "}
              <span className="font-mono">{agreementId}</span>.
            </p>
          </div>
          <button type="button" className="vt-btn vt-btn-ghost shrink-0 px-2" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="h-[min(62dvh,560px)] w-full border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))]">
            <MapContainer
              center={boundsPositions[0] ?? [-34.6, -58.38]}
              zoom={11}
              className="h-full w-full"
              scrollWheelZoom
            >
              <VibeMapTileLayer />
              {boundsPositions.length ? <FitRouteBounds positions={boundsPositions} /> : null}

              <LeafletRoadSnappedRoute
                segments={routeSegments}
                segmentColors={segmentColors}
                useRoads={!mapUsesPersistedOsrmGeometry}
                roadLikePolylines={mapUsesPersistedOsrmGeometry}
              />

              {stopsOrdered.map((st) => {
                const oid = (st.id ?? "").trim();
                const o = coordPair(st, "origen");
                const d = coordPair(st, "destino");
                const hi = highlight.length > 0 && oid === highlight;
                const baseKey = oid || `${st.orden}`;
                return (
                  <div key={baseKey}>
                    {o ?
                      <Marker
                        position={o}
                        icon={routeMapNumberedWaypointIcon(String(st.orden), hi ? "#f59e0b" : "#64748b")}
                      />
                    : null}
                    {d ?
                      <Marker
                        position={d}
                        icon={routeMapFinishWaypointIcon()}
                      />
                    : null}
                  </div>
                );
              })}

              {Object.entries(telemetryByStop).map(([sid, p]) => (
                <Marker
                  key={`tel-${sid}`}
                  position={[p.lat, p.lng]}
                  icon={vehicleIcon(
                    `${sid.slice(0, 6)}… ${typeof p.progressFraction === "number" ? `${Math.round(p.progressFraction * 100)}%` : ""}`.trim(),
                  )}
                />
              ))}
            </MapContainer>
          </div>

          <div className="max-h-[220px] overflow-y-auto px-4 py-3 text-[12px] leading-snug">
            <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
              Leyenda
            </div>
            <ul className="mt-2 mb-0 list-disc space-y-1 pl-5 text-[var(--text)]">
              <li>
                <span className="font-bold">Gris / ámbar:</span> marcas de origen por tramo (ámbar = foco).
              </li>
              <li>
                <span className="font-bold">🏁:</span> destino del tramo (si hay coordenadas).
              </li>
              <li>
                <span className="font-bold">Azul:</span> última telemetría del transportista por tramo (si está transmitiendo).
              </li>
              <li>
                <span className="font-bold">Trazos:</span> ruta por carretera persistida en la hoja (OSRM), si existe.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
