import type { StoreLocationPoint } from "@features/market/Dtos/marketTypes";
import { PointLocationFeedMap } from "@features/home/components/EmergentRouteFeedMap";
import { cn } from "@shared/lib/cn";

type Props = Readonly<{
  location: StoreLocationPoint;
  /** Clave estable para remount de Leaflet al reciclar el carrusel. */
  mapKey: string;
  className?: string;
}>;

/**
 * Mapa embebido pequeño (solo lectura) para fichas de tienda en carruseles.
 * Mismo visor/capa base que las hojas de ruta (`PointLocationFeedMap`).
 */
export function StoreLocationMiniMap({ location, mapKey, className }: Props) {
  return (
    <div
      className={cn(
        "pointer-events-none relative isolate h-full min-h-[88px] w-full overflow-hidden rounded-[inherit] bg-[color-mix(in_oklab,var(--organic-sage)_12%,var(--surface))] [&_.leaflet-control-container]:hidden",
        className,
      )}
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
