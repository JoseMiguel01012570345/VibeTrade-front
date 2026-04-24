import { useEffect, useMemo, useState } from "react";
import type { EmergentMapLeg } from "../utils/map/emergentRouteMapLegs";
import { emergentMapWaypoints } from "../utils/map/emergentRouteMapLegs";
import { fetchLegDistancesKmFromApi } from "../utils/map/routeLegMetrics";

function zerosKmPerLegs(count: number): number[] {
  return Array.from({ length: count }, () => 0);
}

/** Distancias por tramo (km) desde el backend; sin estimación haversine. */
export function useLegKmForEmergentLegs(legs: EmergentMapLeg[]): number[] {
  const linePositions = useMemo(
    () =>
      emergentMapWaypoints(legs).map((w) => [w.lat, w.lng] as [number, number]),
    [legs],
  );
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
    if (!useRoadSnapping || linePositions.length < 2 || legs.length === 0) {
      return undefined;
    }
    let cancelled = false;
    void fetchLegDistancesKmFromApi(linePositions).then((km) => {
      if (cancelled || !km || km.length !== legs.length) return;
      setLegKm(km);
    });
    return () => {
      cancelled = true;
    };
  }, [useRoadSnapping, linePositions, legs.length, legsGeoKey, legs]);

  return legKm;
}
