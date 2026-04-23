import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { EmergentMapLeg } from "../../utils/map/emergentRouteMapLegs";
import { storeMapPinIcon } from "../../utils/map/storeMapPinIcon";
import "leaflet/dist/leaflet.css";
import "./emergentRouteMapMarkers.css";

function tramoEndIcon(letter: string) {
  return L.divIcon({
    className: "emergent-route-legend",
    html: `<div class="er-mark">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/** Misma capa OSM y atribución que el resto de mapas de la app (rutas, tiendas). */
export function VibeMapTileLayer() {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution="&copy; OpenStreetMap"
    />
  );
}

function FitRouteBounds({ legs }: { legs: EmergentMapLeg[] }) {
  const map = useMap();
  useEffect(() => {
    if (legs.length === 0) return;
    const b = L.latLngBounds(
      legs.flatMap((l) => [
        [l.oLat, l.oLng] as L.LatLngExpression,
        [l.dLat, l.dLng] as L.LatLngExpression,
      ]),
    );
    map.fitBounds(b, { padding: [12, 12], maxZoom: 10 });
  }, [legs, map]);
  return null;
}

function FitPointView({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: false });
  }, [lat, lng, zoom, map]);
  return null;
}

type Props = Readonly<{
  legs: EmergentMapLeg[];
  className?: string;
  mapKey: string;
  /** Mapa con zoom y arrastre (p. ej. vista «grande»). */
  interactive?: boolean;
}>;

/**
 * Mapa (solo lectura) con tramos etiquetados A, B, C… en el punto (sin polilínea entre orígen/destino).
 */
export function EmergentRouteFeedMap({ legs, className, mapKey, interactive = false }: Props) {
  if (legs.length === 0) {
    return (
      <div
        className={className}
        aria-hidden
      >
        <div className="flex h-full w-full items-center justify-center bg-[#e8eef4] text-[11px] font-bold text-[var(--muted)]">
          Sin ruta
        </div>
      </div>
    );
  }

  const first = legs[0]!;
  const center: [number, number] = [
    (first.oLat + first.dLat) / 2,
    (first.oLng + first.dLng) / 2,
  ];

  return (
    <div className={className}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={8}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        dragging={interactive}
        touchZoom={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl
        maxBoundsViscosity={1}
      >
        <VibeMapTileLayer />
        <FitRouteBounds legs={legs} />
        {legs.map((l, i) => {
          const midLat = (l.oLat + l.dLat) / 2;
          const midLng = (l.oLng + l.dLng) / 2;
          return (
            <Marker
              key={`mid-${l.label}-${i}`}
              position={[midLat, midLng]}
              icon={tramoEndIcon(l.label)}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

export type PointLocationFeedMapProps = Readonly<{
  location: { lat: number; lng: number };
  mapKey: string;
  className?: string;
  /** Mapa con zoom/arrastre; si no, solo lectura (feed / ficha). */
  interactive?: boolean;
  /**
   * Zoom inicial tras ajustar al punto (mini tienda 14, ficha 15–16).
   * @default 15
   */
  fixedZoom?: number;
  /** Muestra atribución OSM; desactivar en avatares / mini mapas. @default true */
  showAttribution?: boolean;
}>;

/**
 * Mismo contenedor y capa base que `EmergentRouteFeedMap`, para una sola coordenada (tienda / perfil).
 */
export function PointLocationFeedMap({
  location,
  mapKey,
  className,
  interactive = false,
  fixedZoom = 15,
  showAttribution = true,
}: PointLocationFeedMapProps) {
  const center: [number, number] = [location.lat, location.lng];
  return (
    <div
      className={className}
      data-vibe-point-map
    >
      <MapContainer
        key={mapKey}
        center={center}
        zoom={fixedZoom}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        dragging={interactive}
        touchZoom={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl={showAttribution}
        maxBoundsViscosity={1}
      >
        <VibeMapTileLayer />
        <FitPointView lat={location.lat} lng={location.lng} zoom={fixedZoom} />
        <Marker position={center} icon={storeMapPinIcon()} />
      </MapContainer>
    </div>
  );
}
