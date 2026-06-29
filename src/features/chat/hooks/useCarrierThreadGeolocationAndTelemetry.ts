import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { fetchAgreementRouteDeliveries } from "@features/chat/api/routeLogisticsApi";
import { queryClient } from "@shared/lib/queryClient";
import { queryKeys } from "@shared/lib/queryKeys";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";
import type { CarrierTelemetryTarget } from "@features/chat/Dtos/realtime/carrierTelemetryTypes";
import { subscribeRouteDeliveriesRefresh } from "@features/chat/logic/realtime/chatRealtime";
import { getSessionToken } from "@shared/services/http/sessionToken";

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

  /** Re-ejecutar cuando hidratan suscripciones / routeOfferPublic tras F5 (threadDigest no cambia). */
  const carrierRouteContextDigest = useMarketStore(
    useShallow((s) => {
      const th = threadId ? s.threads[threadId] : undefined;
      if (!th) return "";
      const carrierIds = (th.chatCarriers ?? [])
        .map((c) => (c.id ?? "").trim())
        .filter((x) => x.length > 0)
        .sort()
        .join(",");
      const linkedSheetIds = new Set(
        (th.contracts ?? [])
          .filter(
            (c) =>
              c.status === "accepted" &&
              (c.routeSheetId ?? "").trim().length > 1,
          )
          .map((c) => (c.routeSheetId ?? "").trim()),
      );
      const assignParts: string[] = [];
      for (const ro of Object.values(s.routeOfferPublic)) {
        if ((ro.threadId ?? "").trim() !== th.id.trim()) continue;
        const rsid = (ro.routeSheetId ?? "").trim();
        if (linkedSheetIds.size > 0 && rsid.length > 0 && !linkedSheetIds.has(rsid))
          continue;
        for (const t of ro.tramos ?? []) {
          const a = t.assignment;
          if ((a?.userId ?? "").trim().length < 2) continue;
          assignParts.push(
            `${(t.stopId ?? "").trim()}:${a!.userId!.trim()}:${a!.status ?? ""}`,
          );
        }
      }
      assignParts.sort();
      return `${carrierIds}|${assignParts.join(",")}`;
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

      const myReqId = ++reqIdRef.current;

      void (async () => {
        const state = useMarketStore.getState();
        const th = state.threads[tid];
        if (!th) return;

        const accepted = (th.contracts ?? []).filter(
          (c) =>
            c.status === "accepted" && (c.routeSheetId ?? "").trim().length > 1,
        );

        const nextTargets: CarrierTelemetryTarget[] = [];
        let anyActiveTelemetryTarget = false;

        for (const c of accepted) {
          let rows: RouteStopDeliveryStatusApi[];
          try {
            rows = await queryClient.fetchQuery({
              queryKey: queryKeys.agreementRouteDeliveries(tid, c.id.trim()),
              queryFn: () => fetchAgreementRouteDeliveries(tid, c.id.trim()),
              staleTime: 15_000,
            });
          } catch {
            continue;
          }

          for (const r of rows) {
            const sid = (r.routeStopId ?? "").trim();
            if (rowTelemetryTargetForOwner(r, uid)) {
              anyActiveTelemetryTarget = true;
              nextTargets.push({
                agreementId: c.id.trim(),
                routeSheetId: (r.routeSheetId ?? "").trim(),
                routeStopId: sid,
              });
            }
          }
        }

        if (myReqId !== reqIdRef.current) return;

        const dedup = new Map<string, CarrierTelemetryTarget>();
        for (const t of nextTargets) {
          dedup.set(`${t.agreementId}:${t.routeStopId}`, t);
        }
        setTargets([...dedup.values()]);

        if (viewerIsConfirmedCarrier && anyActiveTelemetryTarget) {
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
  }, [runRefresh, threadDigest, refreshNonce, carrierRouteContextDigest]);

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

  useEffect(() => {
    const tid = threadId?.trim();
    if (!tid || tid.length < 4 || isSocialThread || !viewerIsConfirmedCarrier)
      return;
    return subscribeRouteDeliveriesRefresh((p) => {
      if (p.threadId !== tid) return;
      runRefresh(p.change === "route_deliveries_updated");
    });
  }, [threadId, isSocialThread, viewerIsConfirmedCarrier, runRefresh]);

  return targets;
}
