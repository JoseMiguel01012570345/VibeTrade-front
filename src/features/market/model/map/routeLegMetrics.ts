/**
 * Métricas de ruta en UI. Los km por tramo en carretera vienen de `osrmRoadKm` en la hoja
 * persistida; el mapa puede seguir usando OSRM en el cliente vía leaflet-routing-machine.
 */

export function formatKmEs(km: number): string {
  if (!(km > 0)) return "— km";
  return `${km.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
}

export function formatPrecioPorKmEs(
  precio: number | null | undefined,
  moneda: string | undefined,
  km: number,
): string {
  if (precio == null || precio <= 0 || km <= 0) return "—";
  const per = precio / km;
  const perStr = per.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const m = (moneda ?? "").trim();
  return m ? `${perStr} ${m} / km` : `${perStr} / km`;
}

export function parseTransportistaPriceTramo(
  raw?: string | null,
): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const num = s.replace(/[^\d.,-]/g, "");
  if (!num) return null;
  const lastComma = num.lastIndexOf(",");
  const lastDot = num.lastIndexOf(".");
  let normalized = num;
  if (lastComma > lastDot) {
    normalized = num.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = num.replace(/,/g, "");
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
