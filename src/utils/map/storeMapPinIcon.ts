import L from "leaflet";

/** Icono sin assets estáticos (Vite-friendly). */
export function storeMapPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "store-map-pin-wrap",
    html: '<div class="store-map-pin-dot" aria-hidden="true"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * Misma forma que en el feed de rutas: badge numerado 1, 2, …
 * (requiere `emergentRouteMapMarkers.css` en el bundle).
 */
export function routeMapNumberedWaypointIcon(
  label: string,
  fillColor = "#2563eb",
): L.DivIcon {
  const w = Math.max(28, 16 + label.length * 9);
  return L.divIcon({
    className: "emergent-route-legend",
    html: `<div class="er-mark" style="background:${fillColor}">${label}</div>`,
    iconSize: [w, 28],
    iconAnchor: [w / 2, 14],
  });
}

/** Fin de tramo / subruta en mapas de hoja (misma clase contenedora que `er-mark`). */
export function routeMapFinishWaypointIcon(fillColor = "#0f766e"): L.DivIcon {
  return L.divIcon({
    className: "emergent-route-legend",
    html: `<div class="er-mark-finish" role="img" aria-label="Fin de tramo" style="background:${fillColor}">🏁</div>`,
    iconSize: [30, 28],
    iconAnchor: [15, 14],
  });
}
