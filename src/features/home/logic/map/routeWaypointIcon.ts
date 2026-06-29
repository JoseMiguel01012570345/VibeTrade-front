import L from "leaflet";

export function routeWaypointIcon(label: string, fillColor: string) {
  const w = Math.max(28, 16 + label.length * 9);
  return L.divIcon({
    className: "emergent-route-legend",
    html: `<div class="er-mark" style="background:${fillColor}">${label}</div>`,
    iconSize: [w, 28],
    iconAnchor: [w / 2, 14],
  });
}
