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
