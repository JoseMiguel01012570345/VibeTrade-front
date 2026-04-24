import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { EmergentMapLeg } from "../../utils/map/emergentRouteMapLegs";
import { emergentMapWaypoints } from "../../utils/map/emergentRouteMapLegs";
import { storeMapPinIcon } from "../../utils/map/storeMapPinIcon";
import { cn } from "../../lib/cn";
import { LeafletRoadSnappedRoute } from "./LeafletRoadSnappedRoute";
import "leaflet/dist/leaflet.css";
import "./emergentRouteMapMarkers.css";

/** Evita que los paneles de Leaflet (z-index altos) compitan con el chrome fijo (p. ej. barra de confianza z-50). */
const embedRootClass = "relative isolate z-0 min-h-0";

function routeWaypointIcon(label: string) {
  const w = Math.max(28, 16 + label.length * 9);
  return L.divIcon({
    className: "emergent-route-legend",
    html: `<div class="er-mark">${label}</div>`,
    iconSize: [w, 28],
    iconAnchor: [w / 2, 14],
  });
}

/** Misma capa OSM y atribución que el resto de mapas de la app (rutas, tiendas). */
export function VibeMapTileLayer({
  attribution = "&copy; OpenStreetMap",
}: Readonly<{ attribution?: string }> = {}) {
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution={attribution}
    />
  );
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
 * Mapa (solo lectura) con N+1 marcas numeradas en los vértices de la ruta (inicio, fin de cada tramo) y trazo entre ellos.
 */
export function EmergentRouteFeedMap({ legs, className, mapKey, interactive = false }: Props) {
  const waypoints = useMemo(() => emergentMapWaypoints(legs), [legs]);
  const linePositions = useMemo(
    () => waypoints.map((w) => [w.lat, w.lng] as [number, number]),
    [waypoints],
  );
  const useRoadSnapping = useMemo(() => legs.every((leg) => !leg.synthetic), [legs]);

  if (legs.length === 0) {
    return (
      <div
        className={cn(embedRootClass, className)}
        aria-hidden
      >
        <div className="flex h-full w-full items-center justify-center bg-[#e8eef4] text-[11px] font-bold text-[var(--muted)]">
          Sin ruta
        </div>
      </div>
    );
  }

  const w0 = waypoints[0];
  const w1 = waypoints[waypoints.length - 1];
  const center: [number, number] =
    w0 && w1 ? [(w0.lat + w1.lat) / 2, (w0.lng + w1.lng) / 2] : [0, 0];

  return (
    <div className={cn(embedRootClass, className)}>
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
        <VibeMapTileLayer
          attribution={
            useRoadSnapping
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Routing <a href="https://project-osrm.org/">OSRM</a>'
              : undefined
          }
        />
        {linePositions.length >= 2 ? (
          <LeafletRoadSnappedRoute positions={linePositions} useRoads={useRoadSnapping} />
        ) : null}
        {waypoints.map((w) => (
          <Marker
            key={`wp-${w.label}-${w.lat}-${w.lng}`}
            position={[w.lat, w.lng]}
            icon={routeWaypointIcon(w.label)}
            zIndexOffset={400}
          />
        ))}
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
