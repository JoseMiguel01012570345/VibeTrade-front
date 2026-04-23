import { Link } from "react-router-dom";
import { Maximize2 } from "lucide-react";
import type { StoreLocationPoint } from "../../app/store/marketStoreTypes";
import { PointLocationFeedMap } from "../home/EmergentRouteFeedMap";

type Props = Readonly<{
  location: StoreLocationPoint;
  title?: string;
  /** Si está definido, el enlace abre la vista de mapa interna (misma base que ofertas / rutas). */
  storeId?: string;
}>;

export function StoreLocationPreview({ location, title, storeId }: Props) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
          {title ?? "Ubicación"}
        </span>
        {storeId?.trim() ? (
          <Link
            to={`/store/${encodeURIComponent(storeId.trim())}/mapa`}
            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
          >
            Ver mapa en grande
            <Maximize2 size={14} aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="store-map-preview relative isolate h-[200px] w-full overflow-hidden bg-[#e2e8f0] [&_.leaflet-control-attribution]:text-[8px]">
        <PointLocationFeedMap
          location={location}
          mapKey={`store-loc-${location.lat}-${location.lng}`}
          className="h-full w-full"
          fixedZoom={15}
        />
      </div>
    </div>
  );
}
