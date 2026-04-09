import { ExternalLink } from "lucide-react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { StoreLocationPoint } from "../../app/store/marketStoreTypes";
import { storeMapPinIcon } from "../../utils/map/storeMapPinIcon";
import "leaflet/dist/leaflet.css";

type Props = Readonly<{
  location: StoreLocationPoint;
  title?: string;
}>;

export function StoreLocationPreview({ location, title }: Props) {
  const center: [number, number] = [location.lat, location.lng];
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
      <div className="store-map-preview relative isolate h-[200px] w-full [&_.leaflet-control-container]:hidden">
        <MapContainer
          key={`${location.lat}-${location.lng}`}
          center={center}
          zoom={15}
          className="h-full w-full"
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={storeMapPinIcon()} />
        </MapContainer>
      </div>
    </div>
  );
}
