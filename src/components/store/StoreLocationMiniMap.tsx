import type { StoreLocationPoint } from "../../app/store/marketStoreTypes";
import { PointLocationFeedMap } from "../../pages/home/EmergentRouteFeedMap";

type Props = Readonly<{
  location: StoreLocationPoint;
  /** Clave estable para remount de Leaflet al reciclar el carrusel. */
  mapKey: string;
}>;

/**
 * Mapa embebido pequeño (solo lectura) para fichas de tienda en carruseles.
 * Mismo visor/capa base que las hojas de ruta (`PointLocationFeedMap`).
 */
export function StoreLocationMiniMap({ location, mapKey }: Props) {
  return (
    <div
      className="pointer-events-none relative isolate h-[88px] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[#e2e8f0] [&_.leaflet-control-container]:hidden"
      aria-hidden
    >
      <PointLocationFeedMap
        location={location}
        mapKey={mapKey}
        className="h-full w-full min-h-0 [&_.leaflet-control-attribution]:hidden"
        fixedZoom={14}
        showAttribution={false}
      />
    </div>
  );
}
