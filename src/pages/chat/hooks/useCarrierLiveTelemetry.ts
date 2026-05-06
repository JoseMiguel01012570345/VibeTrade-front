import { useEffect, useMemo, useRef } from "react";
import { postCarrierTelemetry } from "../../../utils/chat/routeLogisticsApi";

type Args = {
  enabled: boolean;
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
  /** Mínimo tiempo entre POSTs exitosos (ms). */
  minIntervalMs?: number;
};

/**
 * Transportista: toma geolocalización del navegador y la envía al backend como telemetría en vivo.
 * Best-effort: si el navegador niega permisos o falla, no rompe la UI.
 */
export function useCarrierLiveTelemetry(args: Args): void {
  const minIntervalMs = args.minIntervalMs ?? 12_000;
  const sourceClientId = useMemo(() => crypto.randomUUID(), []);

  const lastSentAtRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!args.enabled) return;
    const tid = args.threadId.trim();
    const aid = args.agreementId.trim();
    const rsid = args.routeSheetId.trim();
    const sid = args.routeStopId.trim();
    if (tid.length < 4 || aid.length < 8 || rsid.length < 2 || sid.length < 2) return;
    if (!globalThis.navigator?.geolocation?.watchPosition) return;

    // Una lectura inicial ayuda a que el navegador muestre el diálogo de permisos de ubicación.
    globalThis.navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25_000 },
    );

    watchIdRef.current = globalThis.navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < minIntervalMs) return;
        lastSentAtRef.current = now;
        void postCarrierTelemetry({
          threadId: tid,
          agreementId: aid,
          routeSheetId: rsid,
          routeStopId: sid,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          reportedAtUtc: new Date(pos.timestamp).toISOString(),
          sourceClientId,
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        globalThis.navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [
    args.enabled,
    args.threadId,
    args.agreementId,
    args.routeSheetId,
    args.routeStopId,
    minIntervalMs,
    sourceClientId,
  ]);
}
