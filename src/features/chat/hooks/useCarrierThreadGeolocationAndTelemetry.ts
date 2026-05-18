import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@app/store/useMarketStore";
import {
  confirmedStopIdsForCarrier,
  resolveRouteOfferPublicForSheet,
} from "@features/market/model/routeSheetOfferGuards";
import {
  fetchAgreementRouteDeliveries,
  type RouteStopDeliveryStatusApi,
} from "@/utils/chat/routeLogisticsApi";
import { getSessionToken } from "@shared/services/http/sessionToken";

export type CarrierTelemetryTarget = {
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
};

/** Lectura inicial para disparar el diálogo de permisos del navegador (best-effort). */
export function primeBrowserGeolocationForTelemetry(): void {
  if (!globalThis.navigator?.geolocation?.getCurrentPosition) return;
  globalThis.navigator.geolocation.getCurrentPosition(
    () => {},
    () => {},
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  );
}

const TELEMETRY_STATES = new Set([
  "paid",
  "in_transit",
  "awaiting_carrier_for_handoff",
  "delivered_pending_evidence",
]);

function deliveryPaidLike(state: string): boolean {
  const s = state.trim().toLowerCase();
  return s.length > 0 && s !== "unpaid" && !s.startsWith("refunded");
}

function rowTelemetryTargetForOwner(
  row: RouteStopDeliveryStatusApi,
  meId: string,
): boolean {
  const st = (row.state ?? "").trim().toLowerCase();
  const owner = (row.currentOwnerUserId ?? "").trim();
  return owner === meId.trim() && TELEMETRY_STATES.has(st);
}

/**
 * Transportista en hilo comercial: pide permiso de ubicación cuando hay tramo pagado confirmado;
 * devuelve tramos donde el usuario es titular para montar telemetría aunque no abra «Rutas».
 */
export function useCarrierThreadGeolocationAndTelemetry(args: {
  threadId: string | undefined;
  viewerIsConfirmedCarrier: boolean;
  isSocialThread: boolean;
  meId: string;
  /** Incrementar tras un pago exitoso para forzar refresh + nuevo intento de permiso. */
  refreshNonce?: number;
}): CarrierTelemetryTarget[] {
  const {
    threadId,
    viewerIsConfirmedCarrier,
    isSocialThread,
    meId,
    refreshNonce,
  } = args;

  const threadDigest = useMarketStore(
    useShallow((s) => {
      const th = threadId ? s.threads[threadId] : undefined;
      if (!th) return "";
      const contracts = (th.contracts ?? [])
        .map(
          (c) =>
            `${c.id}:${c.status}:${c.hasSucceededPayments ?? false}:${c.routeSheetId ?? ""}`,
        )
        .join("|");
      return `${th.paymentCompleted ?? false}:${contracts}`;
    }),
  );

  const [targets, setTargets] = useState<CarrierTelemetryTarget[]>([]);
  const lastPrimeAtRef = useRef(0);
  const lastHandledRefreshNonceRef = useRef<number>(-1);
  const reqIdRef = useRef(0);

  const runRefresh = useCallback(
    (forcePrime: boolean) => {
      const tid = threadId?.trim();
      const uid = meId.trim();
      if (!tid || uid.length < 2 || uid === "guest" || isSocialThread) {
        setTargets([]);
        return;
      }
      if (!viewerIsConfirmedCarrier) {
        setTargets([]);
        return;
      }
      if (!getSessionToken()) {
        setTargets([]);
        return;
      }

      void ++reqIdRef.current;

      void (async () => {
        const state = useMarketStore.getState();
        const th = state.threads[tid];
        if (!th) return;

        const accepted = (th.contracts ?? []).filter(
          (c) =>
            c.status === "accepted" && (c.routeSheetId ?? "").trim().length > 1,
        );

        const nextTargets: CarrierTelemetryTarget[] = [];
        let anyConfirmedPaidStop = false;

        for (const c of accepted) {
          const rsid = (c.routeSheetId ?? "").trim();
          const ro = resolveRouteOfferPublicForSheet(state, th, rsid);
          const confirmedStops = confirmedStopIdsForCarrier(ro, uid);
          if (confirmedStops.size === 0) continue;

          let rows: RouteStopDeliveryStatusApi[];
          try {
            rows = await fetchAgreementRouteDeliveries(tid, c.id.trim());
          } catch {
            continue;
          }

          for (const r of rows) {
            const sid = (r.routeStopId ?? "").trim();
            const st = (r.state ?? "").trim().toLowerCase();
            if (deliveryPaidLike(st)) anyConfirmedPaidStop = true;
            if (rowTelemetryTargetForOwner(r, uid)) {
              nextTargets.push({
                agreementId: c.id.trim(),
                routeSheetId: (r.routeSheetId ?? "").trim(),
                routeStopId: sid,
              });
            }
          }
        }

        const dedup = new Map<string, CarrierTelemetryTarget>();
        for (const t of nextTargets) {
          dedup.set(`${t.agreementId}:${t.routeStopId}`, t);
        }
        setTargets([...dedup.values()]);

        if (viewerIsConfirmedCarrier && anyConfirmedPaidStop) {
          const now = Date.now();
          const firstEver = lastPrimeAtRef.current === 0;
          if (
            forcePrime ||
            firstEver ||
            now - lastPrimeAtRef.current >= 45_000
          ) {
            lastPrimeAtRef.current = now;
            primeBrowserGeolocationForTelemetry();
          }
        }
      })();
    },
    [threadId, meId, isSocialThread, viewerIsConfirmedCarrier],
  );

  useEffect(() => {
    const n = refreshNonce ?? 0;
    const forcePaymentBump = n > 0 && n !== lastHandledRefreshNonceRef.current;
    if (forcePaymentBump) lastHandledRefreshNonceRef.current = n;
    runRefresh(forcePaymentBump);
  }, [runRefresh, threadDigest, refreshNonce]);

  useEffect(() => {
    const tid = threadId?.trim();
    if (!tid || isSocialThread || !viewerIsConfirmedCarrier) return;

    const onResume = () => {
      if (document.visibilityState !== "visible") return;
      runRefresh(false);
    };

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    return () => {
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, [threadId, isSocialThread, viewerIsConfirmedCarrier, runRefresh]);
  console.log({ viewerIsConfirmedCarrier });
  return targets;
}
