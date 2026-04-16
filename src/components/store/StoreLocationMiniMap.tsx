import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { StoreLocationPoint } from "../../app/store/marketStoreTypes";
import { storeMapPinIcon } from "../../utils/map/storeMapPinIcon";
import "leaflet/dist/leaflet.css";

type Props = Readonly<{
  location: StoreLocationPoint;
  /** Clave estable para remount de Leaflet al reciclar el carrusel. */
  mapKey: string;
}>;

/**
 * Mapa embebido pequeño (solo lectura) para fichas de tienda en carruseles.
 */
export function StoreLocationMiniMap({ location, mapKey }: Props) {
  const center: [number, number] = [location.lat, location.lng];
  return (
    <div
      className="pointer-events-none relative isolate h-[88px] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] [&_.leaflet-control-container]:hidden"
      aria-hidden
    >
      <MapContainer
        key={mapKey}
        center={center}
        zoom={14}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        dragging={false}
        touchZoom={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={center} icon={storeMapPinIcon()} />
      </MapContainer>
    </div>
  );
}
