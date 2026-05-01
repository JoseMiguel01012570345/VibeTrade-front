import { useMemo } from "react";
import type { EmergentMapLeg } from "../utils/map/emergentRouteMapLegs";

export type TramoRoadKmHint = {
  orden: number;
  osrmRoadKm?: number;
};

/**
 * Km por tramo desde la hoja persistida (`osrmRoadKm`). Sin valor guardado → 0 (la UI muestra "— km").
 */
export function useLegKmForEmergentLegs(
  legs: EmergentMapLeg[],
  tramosWithRoadKm?: TramoRoadKmHint[],
): number[] {
  return useMemo(() => {
    if (legs.length === 0) return [];
    const byOrden = new Map<number, number>();
    for (const t of tramosWithRoadKm ?? []) {
      const km = t.osrmRoadKm;
      if (typeof km === "number" && Number.isFinite(km) && km >= 0)
        byOrden.set(t.orden, km);
    }
    return legs.map((leg) => {
      if (leg.synthetic) return 0;
      return byOrden.get(leg.orden) ?? 0;
    });
  }, [legs, tramosWithRoadKm]);
}
