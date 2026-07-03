import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { VibeMapTileLayer } from "@features/home/components/EmergentRouteFeedMap";
import { StatisticsChartCard, StatisticsEmpty } from "./StatisticsChartCard";
import { ORDER_STATUS_LABELS } from "../logic/statisticsRange";
import type { StatisticsOrderLocationPoint } from "../Dtos/statistics";
import "leaflet/dist/leaflet.css";

const STATUS_COLOR: Record<string, string> = {
  procesado: "#ca8a04",
  en_transito: "#2563eb",
  entregado: "#0f766e",
};

function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "vt-stats-order-pin",
    html: `<span style="display:block;width:12px;height:12px;border-radius:9999px;border:2px solid #fff;background:${color};box-shadow:0 0 0 1px rgba(0,0,0,0.25)"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function FitBounds({ points }: { points: StatisticsOrderLocationPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
  }, [points, map]);
  return null;
}

export function StatisticsOrderLocationsMap({
  points,
  total,
}: {
  points: StatisticsOrderLocationPoint[];
  total: number;
}) {
  const center = useMemo((): [number, number] => {
    if (points.length > 0) return [points[0].latitude, points[0].longitude];
    return [23.1136, -82.3666];
  }, [points]);

  return (
    <StatisticsChartCard
      title="Ubicación de pedidos"
      subtitle={`${total} pedido(s) con coordenadas`}
    >
      {points.length > 0 ? (
        <div className="relative isolate z-0 h-[360px] overflow-hidden rounded-xl">
          <MapContainer
            center={center}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <VibeMapTileLayer />
            <FitBounds points={points} />
            {points.map((p) => (
              <Marker
                key={p.orderId}
                position={[p.latitude, p.longitude]}
                icon={dotIcon(STATUS_COLOR[p.status] ?? "#6b7280")}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{p.publicNumber}</div>
                    <div>{ORDER_STATUS_LABELS[p.status] ?? p.status}</div>
                    <div>{new Date(p.createdAt).toLocaleDateString("es")}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <StatisticsEmpty message="Sin pedidos con coordenadas en el periodo" />
      )}
    </StatisticsChartCard>
  );
}
