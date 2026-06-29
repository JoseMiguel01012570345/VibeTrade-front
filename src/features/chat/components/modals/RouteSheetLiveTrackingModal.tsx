import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, useMap } from "react-leaflet";
import { X } from "lucide-react";
import { cn } from "@shared/lib/cn";
import type { RouteOfferTramoPublic } from "@features/market/model/store/marketStoreTypes";
import type { RouteSheet, RouteStop } from "@features/chat/model/routeSheetTypes";
import { VibeMapTileLayer } from "@features/home/components/EmergentRouteFeedMap";
import { LeafletRoadSnappedRoute } from "@features/home/components/LeafletRoadSnappedRoute";
import {
  emergentMapLegsFromRouteStops,
  emergentMapRouteSegmentColors,
  emergentMapRouteSegments,
  ROUTE_ISLAND_LINE_COLORS,
} from "@features/market/model/map/emergentRouteMapLegs";
import { useAppStore } from "@features/auth/store/useAppStore";
import { useMarketStore } from "@features/market/model/store/useMarketStore";
import { fetchThreadRouteTramoSubscriptions } from "@features/chat/api/chatApi";
import {
  routeMapFinishWaypointIcon,
  routeMapNumberedWaypointIcon,
} from "@features/market/model/map/storeMapPinIcon";
import {
  mapBackdropLayerAboveChatRail,
  modalShellWide,
  modalSub,
} from '../../model/formModalStyles';
import "@features/home/styles/emergentRouteMapMarkers.css";
import "leaflet/dist/leaflet.css";
import {
  subscribeCarrierTelemetryUpdated,
  type CarrierTelemetryUpdatedPayload,
} from "@features/chat/model/chatRealtime";
import {
  fetchAgreementRouteDeliveries,
  fetchLatestCarrierTelemetryForRouteSheet,
  type RouteStopDeliveryStatusApi,
} from "@features/chat/api/routeLogisticsApi";

/** Tramos donde el titular sigue involucrado en la cadena (no cerrados). */
const TRACKING_OWNER_STATES = new Set([
  "in_transit",
  "paid",
  "awaiting_carrier_for_handoff",
]);

function primaryOwnedStopIdForCarrier(args: {
  carrierUserId: string;
  deliveryRowsByStop: Record<string, RouteStopDeliveryStatusApi>;
  stopIdToOrden: Record<string, number>;
}): string | null {
  const uid = args.carrierUserId.trim();
  type Row = { stopId: string; orden: number; state: string };
  const candidates: Row[] = [];
  for (const [sid, row] of Object.entries(args.deliveryRowsByStop)) {
    if ((row.currentOwnerUserId ?? "").trim() !== uid) continue;
    const st = (row.state ?? "").trim().toLowerCase();
    if (!TRACKING_OWNER_STATES.has(st)) continue;
    const orden = args.stopIdToOrden[sid] ?? 9999;
    candidates.push({ stopId: sid, orden, state: st });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.orden - b.orden);
  const transit = candidates.find((c) => c.state === "in_transit");
  if (transit) return transit.stopId;
  const paid = candidates.find((c) => c.state === "paid");
  if (paid) return paid.stopId;
  const awaiting = candidates.find(
    (c) => c.state === "awaiting_carrier_for_handoff",
  );
  if (awaiting) return awaiting.stopId;
  return candidates[0]!.stopId;
}

function bestTelemetryPayloadForCarrier(
  uid: string,
  byStop: Record<string, CarrierTelemetryUpdatedPayload>,
): CarrierTelemetryUpdatedPayload | null {
  let best: CarrierTelemetryUpdatedPayload | null = null;
  let bestT = -1;
  for (const p of Object.values(byStop)) {
    if ((p.carrierUserId ?? "").trim() !== uid) continue;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    const t = telemetryReportedAtMs(p);
    if (t >= bestT) {
      bestT = t;
      best = p;
    }
  }
  return best;
}

function legProgressFractionForStop(
  stopId: string,
  telemetryForStop: CarrierTelemetryUpdatedPayload | undefined,
  deliveryProgressByStop: Record<string, number | null | undefined>,
): number | null {
  const fromTel =
    telemetryForStop &&
    typeof telemetryForStop.progressFraction === "number" &&
    Number.isFinite(telemetryForStop.progressFraction)
      ? clamp01(telemetryForStop.progressFraction)
      : null;
  const delRaw = deliveryProgressByStop[stopId];
  const fromDel =
    typeof delRaw === "number" && Number.isFinite(delRaw)
      ? clamp01(delRaw)
      : null;
  if (
    fromTel !== null &&
    fromDel !== null &&
    fromTel >= 0.995 &&
    fromDel < fromTel - 0.02
  ) {
    return fromDel;
  }
  if (fromTel !== null) return fromTel;
  if (fromDel !== null) return fromDel;
  return null;
}

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

function FitRouteBounds({
  positions,
  enabled,
  fitKey,
}: {
  positions: [number, number][];
  enabled: boolean;
  /** Cambiar este key para re-hacer fit (p. ej. al abrir otro modal/hoja). */
  fitKey: string;
}) {
  const map = useMap();
  const hasFitRef = useRef(false);

  useEffect(() => {
    hasFitRef.current = false;
  }, [fitKey]);

  useEffect(() => {
    if (!enabled) return;
    if (hasFitRef.current) return;
    if (positions.length < 1) return;
    if (positions.length === 1) {
      const p = positions[0]!;
      map.setView(p, 11, { animate: false });
      hasFitRef.current = true;
      return;
    }
    const b = L.latLngBounds(positions);
    map.fitBounds(b, { padding: [24, 24], maxZoom: 13, animate: false });
    hasFitRef.current = true;
  }, [map, positions, enabled]);
  return null;
}

function MapUserInteractionTracker(props: {
  enabled: boolean;
  onInteracted: () => void;
}) {
  const map = useMap();
  const firedRef = useRef(false);
  const { enabled, onInteracted } = props;

  useEffect(() => {
    if (!enabled) return;
    firedRef.current = false;

    const fireOnce = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      onInteracted();
    };

    map.on("dragstart", fireOnce);
    map.on("zoomstart", fireOnce);
    map.on("movestart", fireOnce);
    return () => {
      map.off("dragstart", fireOnce);
      map.off("zoomstart", fireOnce);
      map.off("movestart", fireOnce);
    };
  }, [map, enabled, onInteracted]);

  return null;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function telemetryReportedAtMs(p: CarrierTelemetryUpdatedPayload): number {
  const t = Date.parse(p.reportedAtUtc);
  return Number.isFinite(t) ? t : 0;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function carrierAvatarPinIcon(args: {
  avatarUrl?: string | null;
  routeColor: string;
  progressFraction?: number | null;
  speedKmh?: number | null;
}): L.DivIcon {
  const bg = args.routeColor;
  const url = (args.avatarUrl ?? "").trim();
  const useImg =
    url.length > 0 &&
    (/^https?:\/\//i.test(url) ||
      url.startsWith("/") ||
      url.startsWith("data:"));
  const inner = useImg
    ? `<img class="vt-carrier-loc-pin-avatar" src="${escapeAttr(url)}" alt="" referrerpolicy="no-referrer" loading="lazy" decoding="async" />`
    : `<div class="vt-carrier-loc-pin-avatar-fallback" style="background:${bg}" aria-hidden="true">🚚</div>`;

  const prog =
    typeof args.progressFraction === "number" &&
    Number.isFinite(args.progressFraction)
      ? `<div class="vt-carrier-loc-pin-prog">${Math.round(args.progressFraction * 100)}%</div>`
      : "";

  const speedVal =
    typeof args.speedKmh === "number" &&
    Number.isFinite(args.speedKmh) &&
    args.speedKmh >= 0
      ? args.speedKmh
      : 0;
  const speed = `<div class="vt-carrier-loc-pin-speed">${Math.round(speedVal)} km/h</div>`;

  const html = `<div class="vt-carrier-loc-pin"><div class="vt-carrier-loc-pin-avatar-wrap" style="--vt-pin-route:${bg}">${inner}</div>${prog}${speed}<div class="vt-carrier-loc-pin-chevron" style="border-top:10px solid ${bg}" aria-hidden="true"></div><div class="vt-carrier-loc-pin-point" style="background:${bg}" aria-hidden="true"></div></div>`;

  const w = 52;
  const lines = (prog ? 1 : 0) + 1;
  const h = 76 + lines * 13;
  return L.divIcon({
    className: "emergent-route-legend",
    html,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
}

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  threadId: string;
  agreementId: string;
  routeSheet: RouteSheet;
  /** Tramos públicos de la oferta vinculada (para geometría OSRM persistida). */
  offerTramos?: RouteOfferTramoPublic[];
  /** Resaltar un tramo (p. ej. «En proceso»). */
  highlightStopId?: string | null;
}>;

export function RouteSheetLiveTrackingModal({
  open,
  onClose,
  threadId,
  agreementId,
  routeSheet,
  offerTramos,
  highlightStopId,
}: Props) {
  const profileAvatarUrls = useAppStore((s) => s.profileAvatarUrls);
  const chatCarriers = useMarketStore((s) => s.threads[threadId]?.chatCarriers);
  const [telemetryByStop, setTelemetryByStop] = useState<
    Record<string, CarrierTelemetryUpdatedPayload>
  >({});
  const [deliveryProgressByStop, setDeliveryProgressByStop] = useState<
    Record<string, number | null>
  >({});
  const [deliveryRowsByStop, setDeliveryRowsByStop] = useState<
    Record<string, RouteStopDeliveryStatusApi>
  >({});
  const [subscriptionAvatarByCarrier, setSubscriptionAvatarByCarrier] =
    useState<Record<string, string>>({});
  const lastMaxReportedAtMsRef = useRef<number>(0);
  const pollIntervalMsRef = useRef<number>(8_000);
  const [mapAutoFitEnabled, setMapAutoFitEnabled] = useState(true);
  const disableMapAutoFit = useCallback(() => setMapAutoFitEnabled(false), []);

  const carrierAvatarUrlResolved = useMemo(() => {
    const m: Record<string, string> = { ...subscriptionAvatarByCarrier };
    for (const c of chatCarriers ?? []) {
      const id = (c.id ?? "").trim();
      const av = c.avatarUrl?.trim();
      if (id.length > 1 && av && !m[id]) m[id] = av;
    }
    return m;
  }, [chatCarriers, subscriptionAvatarByCarrier]);

  useEffect(() => {
    if (!open) {
      setTelemetryByStop({});
      setDeliveryProgressByStop({});
      setDeliveryRowsByStop({});
      setSubscriptionAvatarByCarrier({});
      lastMaxReportedAtMsRef.current = 0;
      pollIntervalMsRef.current = 8_000;
      setMapAutoFitEnabled(true);
      return;
    }
    setMapAutoFitEnabled(true);
    let cancelled = false;
    const rsid = routeSheet.id.trim();
    const tid = threadId.trim();
    const aid = agreementId.trim();

    void (async () => {
      try {
        const [telRows, deliveries, subs] = await Promise.all([
          fetchLatestCarrierTelemetryForRouteSheet({
            threadId,
            agreementId,
            routeSheetId: routeSheet.id,
          }).catch(() => []),
          fetchAgreementRouteDeliveries(threadId, agreementId).catch(() => []),
          fetchThreadRouteTramoSubscriptions(threadId).catch(() => []),
        ]);
        if (cancelled) return;

        const seeded: Record<string, CarrierTelemetryUpdatedPayload> = {};
        for (const r of telRows) {
          const sid = (r.routeStopId ?? "").trim();
          if (sid.length < 2) continue;
          seeded[sid] = {
            threadId: tid,
            routeSheetId: rsid,
            agreementId: aid,
            routeStopId: sid,
            carrierUserId: (r.carrierUserId ?? "").trim(),
            lat: r.lat,
            lng: r.lng,
            progressFraction: r.progressFraction ?? null,
            offRoute: r.offRoute,
            reportedAtUtc: r.reportedAtUtc,
            speedKmh: r.speedKmh ?? null,
          };
        }
        setTelemetryByStop((prev) => ({ ...seeded, ...prev }));

        const prog: Record<string, number | null> = {};
        const rowsMap: Record<string, RouteStopDeliveryStatusApi> = {};
        for (const row of deliveries) {
          if ((row.routeSheetId ?? "").trim() !== rsid) continue;
          const sid = (row.routeStopId ?? "").trim();
          if (!sid) continue;
          rowsMap[sid] = row;
          const v = row.lastTelemetryProgressFraction;
          prog[sid] =
            typeof v === "number" && Number.isFinite(v) ? clamp01(v) : null;
        }
        setDeliveryProgressByStop(prog);
        setDeliveryRowsByStop(rowsMap);

        const avMap: Record<string, string> = {};
        for (const it of subs) {
          if ((it.routeSheetId ?? "").trim() !== rsid) continue;
          const uid = (it.carrierUserId ?? "").trim();
          const url = it.carrierAvatarUrl?.trim();
          if (uid.length > 1 && url && !avMap[uid]) avMap[uid] = url;
        }
        setSubscriptionAvatarByCarrier(avMap);
      } catch {
        /* map still useful for stops + realtime */
      }
    })();

    const unsub = subscribeCarrierTelemetryUpdated((p) => {
      if (p.threadId.trim() !== threadId.trim()) return;
      if (p.agreementId.trim() !== agreementId.trim()) return;
      if (p.routeSheetId.trim() !== routeSheet.id.trim()) return;
      const sid = p.routeStopId.trim();
      if (sid.length < 2) return;
      setTelemetryByStop((prev) => ({ ...prev, [sid]: p }));
      const pf = p.progressFraction;
      if (typeof pf === "number" && Number.isFinite(pf)) {
        setDeliveryProgressByStop((prev) => ({
          ...prev,
          [sid]: clamp01(pf),
        }));
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [open, threadId, agreementId, routeSheet.id]);

  // Mientras el modal está abierto, hacer fetch periódico de posiciones (fallback + sincronización)
  // usando como intervalo el ritmo observado en `reportedAtUtc` (es decir, el cadence del post).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function pollOnce(): Promise<void> {
      try {
        const telRows = await fetchLatestCarrierTelemetryForRouteSheet({
          threadId,
          agreementId,
          routeSheetId: routeSheet.id,
        });
        if (cancelled) return;

        let maxReportedAtMs = 0;
        const seeded: Record<string, CarrierTelemetryUpdatedPayload> = {};
        for (const r of telRows) {
          const sid = (r.routeStopId ?? "").trim();
          if (sid.length < 2) continue;
          const t = Date.parse(r.reportedAtUtc);
          const tms = Number.isFinite(t) ? t : 0;
          if (tms > maxReportedAtMs) maxReportedAtMs = tms;
          seeded[sid] = {
            threadId: threadId.trim(),
            routeSheetId: routeSheet.id.trim(),
            agreementId: agreementId.trim(),
            routeStopId: sid,
            carrierUserId: (r.carrierUserId ?? "").trim(),
            lat: r.lat,
            lng: r.lng,
            progressFraction: r.progressFraction ?? null,
            offRoute: r.offRoute,
            reportedAtUtc: r.reportedAtUtc,
            speedKmh: r.speedKmh ?? null,
          };
        }

        // Merge sin pisar eventos realtime más recientes ya recibidos.
        setTelemetryByStop((prev) => {
          const merged = { ...prev };
          for (const [sid, incoming] of Object.entries(seeded)) {
            const existing = prev[sid];
            if (!existing) {
              merged[sid] = incoming;
              continue;
            }
            const exT = telemetryReportedAtMs(existing);
            const inT = telemetryReportedAtMs(incoming);
            if (inT >= exT) merged[sid] = incoming;
          }
          return merged;
        });

        // Sincronizar progreso desde telemetry latest.
        setDeliveryProgressByStop((prev) => {
          const next = { ...prev };
          for (const [sid, incoming] of Object.entries(seeded)) {
            const pf = incoming.progressFraction;
            if (typeof pf === "number" && Number.isFinite(pf))
              next[sid] = clamp01(pf);
          }
          return next;
        });

        // Ajustar intervalo en base a la diferencia entre reportes (cadence del POST).
        if (maxReportedAtMs > 0) {
          const prevMax = lastMaxReportedAtMsRef.current;
          if (prevMax > 0) {
            const dt = maxReportedAtMs - prevMax;
            // Limitar para evitar valores extremos o clocks raros.
            if (dt >= 800 && dt <= 60_000) {
              pollIntervalMsRef.current = Math.max(1_200, Math.min(15_000, dt));
            }
          }
          lastMaxReportedAtMsRef.current = maxReportedAtMs;
        }
      } catch {
        // Si falla, seguir intentando con backoff suave.
        pollIntervalMsRef.current = Math.min(
          20_000,
          Math.max(4_000, pollIntervalMsRef.current),
        );
      }
    }

    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    const loop = async () => {
      if (cancelled) return;
      await pollOnce();
      if (cancelled) return;
      const ms = pollIntervalMsRef.current;
      timeoutId = globalThis.setTimeout(loop, ms);
    };

    // Primer fetch inmediato al abrir.
    void loop();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    };
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
  const segmentColors = useMemo(
    () => emergentMapRouteSegmentColors(legs),
    [legs],
  );
  const stopIdToSegmentColor = useMemo(() => {
    const m: Record<string, string> = {};
    const fallback = ROUTE_ISLAND_LINE_COLORS[0] ?? "#2563eb";
    legs.forEach((leg, i) => {
      const sid = (leg.stopId ?? "").trim();
      if (sid.length > 0) m[sid] = segmentColors[i] ?? fallback;
    });
    return m;
  }, [legs, segmentColors]);
  const mapUsesPersistedOsrmGeometry = useMemo(
    () => legs.length > 0 && legs.every((leg) => !leg.synthetic),
    [legs],
  );

  const highlight = (highlightStopId ?? "").trim();

  const stopIdToOrden = useMemo(() => {
    const m: Record<string, number> = {};
    for (const st of stopsOrdered) {
      const id = (st.id ?? "").trim();
      if (id.length > 0) m[id] = st.orden;
    }
    return m;
  }, [stopsOrdered]);

  /**
   * Un pin por transportista. El % y color corresponden al tramo activo del titular (estado + orden),
   * no al tramo con la muestra GPS más reciente (evita 100 % de un tramo ya cerrado).
   */
  const carrierLivePins = useMemo(() => {
    const fallback = ROUTE_ISLAND_LINE_COLORS[0] ?? "#2563eb";
    const uids = new Set<string>();
    for (const p of Object.values(telemetryByStop)) {
      const u = (p.carrierUserId ?? "").trim();
      if (u.length > 1) uids.add(u);
    }
    const out: Array<{
      uid: string;
      focusStopId: string;
      position: CarrierTelemetryUpdatedPayload;
      routeColor: string;
      progressFraction: number | null;
      speedKmh: number;
    }> = [];

    for (const uid of uids) {
      const best = bestTelemetryPayloadForCarrier(uid, telemetryByStop);
      if (!best) continue;

      const ownedFocus = primaryOwnedStopIdForCarrier({
        carrierUserId: uid,
        deliveryRowsByStop,
        stopIdToOrden,
      });
      const focusStopId = ownedFocus ?? (best.routeStopId ?? "").trim();
      if (focusStopId.length < 2) continue;

      let position = telemetryByStop[focusStopId];
      if (
        !position ||
        (position.carrierUserId ?? "").trim() !== uid ||
        !Number.isFinite(position.lat) ||
        !Number.isFinite(position.lng)
      ) {
        position = best;
      }

      const routeColor = stopIdToSegmentColor[focusStopId] ?? fallback;
      const progressFraction = legProgressFractionForStop(
        focusStopId,
        telemetryByStop[focusStopId],
        deliveryProgressByStop,
      );

      const speedRaw =
        telemetryByStop[focusStopId]?.speedKmh ?? position.speedKmh ?? null;
      const speedKmh =
        typeof speedRaw === "number" &&
        Number.isFinite(speedRaw) &&
        speedRaw >= 0
          ? speedRaw
          : 0;

      out.push({
        uid,
        focusStopId,
        position,
        routeColor,
        progressFraction,
        speedKmh,
      });
    }
    return out;
  }, [
    telemetryByStop,
    deliveryRowsByStop,
    stopIdToOrden,
    stopIdToSegmentColor,
    deliveryProgressByStop,
  ]);

  const boundsPositions = useMemo(() => {
    const pts: [number, number][] = [];
    for (const st of stopsOrdered) {
      const o = coordPair(st, "origen");
      const d = coordPair(st, "destino");
      if (o) pts.push(o);
      if (d) pts.push(d);
    }
    for (const row of carrierLivePins) {
      pts.push([row.position.lat, row.position.lng]);
    }
    return pts;
  }, [stopsOrdered, carrierLivePins]);

  if (!open) return null;

  const fitKey = `${threadId.trim()}-${agreementId.trim()}-${routeSheet.id.trim()}`;

  return (
    <div
      className={cn("vt-modal-backdrop", mapBackdropLayerAboveChatRail)}
      role="presentation"
    >
      <div
        className={cn(
          modalShellWide,
          "flex max-h-[min(92dvh,880px)] w-full max-w-[980px] flex-col overflow-hidden p-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vt-live-route-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div id="vt-live-route-title" className="vt-modal-title">
              Seguimiento en vivo —{" "}
              {(routeSheet.titulo ?? "").trim() || "Hoja de ruta"}
            </div>
            <p className={cn(modalSub, "mt-1 mb-0")}>
              Posiciones emitidas por el transportista con ownership activo.
              Acuerdo <span className="font-mono">{agreementId}</span>.
            </p>
          </div>
          <button
            type="button"
            className="vt-btn vt-btn-ghost shrink-0 px-2"
            onClick={onClose}
            aria-label="Cerrar"
          >
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
              <MapUserInteractionTracker
                enabled={mapAutoFitEnabled}
                onInteracted={disableMapAutoFit}
              />
              {boundsPositions.length ? (
                <FitRouteBounds
                  positions={boundsPositions}
                  enabled={mapAutoFitEnabled}
                  fitKey={fitKey}
                />
              ) : null}

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
                    {o ? (
                      <Marker
                        position={o}
                        icon={routeMapNumberedWaypointIcon(
                          String(st.orden),
                          hi ? "#f59e0b" : "#64748b",
                        )}
                      />
                    ) : null}
                    {d ? (
                      <Marker
                        position={d}
                        icon={routeMapFinishWaypointIcon()}
                      />
                    ) : null}
                  </div>
                );
              })}

              {carrierLivePins.map(
                ({
                  uid,
                  position: p,
                  routeColor,
                  progressFraction,
                  speedKmh,
                }) => {
                  const avatarUrl =
                    carrierAvatarUrlResolved[uid]?.trim() ||
                    profileAvatarUrls[uid]?.trim();
                  return (
                    <Marker
                      key={`tel-carrier-${uid}`}
                      position={[p.lat, p.lng]}
                      icon={carrierAvatarPinIcon({
                        avatarUrl,
                        routeColor,
                        progressFraction,
                        speedKmh,
                      })}
                    />
                  );
                },
              )}
            </MapContainer>
          </div>

          <div className="max-h-[220px] overflow-y-auto px-4 py-3 text-[12px] leading-snug">
            <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
              Leyenda
            </div>
            <ul className="mt-2 mb-0 list-disc space-y-1 pl-5 text-[var(--text)]">
              <li>
                <span className="font-bold">Gris / ámbar:</span> marcas de
                origen por tramo (ámbar = foco).
              </li>
              <li>
                <span className="font-bold">🏁:</span> destino del tramo (si hay
                coordenadas).
              </li>
              <li>
                <span className="font-bold">Foto en pin:</span> un marcador por
                transportista; % del tramo donde es titular activo; velocidad en
                km/h (0 si el dispositivo no informa).
              </li>
              <li>
                <span className="font-bold">Trazos:</span> ruta por carretera
                persistida en la hoja (OSRM), si existe.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
