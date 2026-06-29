import L from "leaflet";
import type { CarrierTelemetryUpdatedPayload } from "@features/chat/Dtos/realtime/chatRealtimeTypes";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";
import type { RouteStop } from "@features/chat/Dtos/route-sheet/routeSheetTypes";

/** Tramos donde el titular sigue involucrado en la cadena (no cerrados). */
const TRACKING_OWNER_STATES = new Set([
  "in_transit",
  "paid",
  "awaiting_carrier_for_handoff",
]);

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function telemetryReportedAtMs(p: CarrierTelemetryUpdatedPayload): number {
  const t = Date.parse(p.reportedAtUtc);
  return Number.isFinite(t) ? t : 0;
}

export function coordPair(
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

export function primaryOwnedStopIdForCarrier(args: {
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

export function bestTelemetryPayloadForCarrier(
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

export function legProgressFractionForStop(
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

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function carrierAvatarPinIcon(args: {
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
