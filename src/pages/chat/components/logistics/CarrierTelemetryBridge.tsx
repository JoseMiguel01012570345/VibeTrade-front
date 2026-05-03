import { useCarrierLiveTelemetry } from "../../hooks/useCarrierLiveTelemetry";

/** Monta el watcher de GPS → POST telemetría (puede vivir fuera del panel Rutas). */
export function CarrierTelemetryBridge(
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
