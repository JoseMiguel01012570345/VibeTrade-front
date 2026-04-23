import { ExternalLink } from "lucide-react";
import type { StoreLocationPoint } from "../../app/store/marketStoreTypes";
import { PointLocationFeedMap } from "../home/EmergentRouteFeedMap";

type Props = Readonly<{
  location: StoreLocationPoint;
  title?: string;
}>;

export function StoreLocationPreview({ location, title }: Props) {
  const osmHref = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
          {title ?? "Ubicación"}
        </span>
        <a
          href={osmHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          Abrir en mapa
          <ExternalLink size={14} aria-hidden />
        </a>
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
