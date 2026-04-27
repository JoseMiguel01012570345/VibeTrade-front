import { useEffect, useMemo, useState } from "react";
import type { EmergentMapLeg } from "../utils/map/emergentRouteMapLegs";
import { fetchLegDistancesKmFromApi } from "../utils/map/routeLegMetrics";

function zerosKmPerLegs(count: number): number[] {
  return Array.from({ length: count }, () => 0);
}

/** Distancias por tramo (km) desde el backend; cada tramo se consulta O→D por separado (rutas no conexas). */
export function useLegKmForEmergentLegs(legs: EmergentMapLeg[]): number[] {
  const useRoadSnapping = useMemo(
    () => legs.every((l) => !l.synthetic),
    [legs],
  );
  const legsGeoKey = useMemo(
    () =>
      legs
        .map((l) => `${l.orden}:${l.oLat},${l.oLng}-${l.dLat},${l.dLng}`)
        .join("|"),
    [legs],
  );

  const [legKm, setLegKm] = useState<number[]>(() => zerosKmPerLegs(legs.length));

  useEffect(() => {
    setLegKm(zerosKmPerLegs(legs.length));
    if (!useRoadSnapping || legs.length === 0) {
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        legs.map((leg) =>
          fetchLegDistancesKmFromApi([
            [leg.oLat, leg.oLng],
            [leg.dLat, leg.dLng],
          ]),
        ),
      );
      if (cancelled) return;
      const next = results.map((km) =>
        km && km.length === 1 ? (km[0] ?? 0) : 0,
      );
      if (next.length === legs.length) setLegKm(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [useRoadSnapping, legs.length, legsGeoKey, legs]);

  return legKm;
}
