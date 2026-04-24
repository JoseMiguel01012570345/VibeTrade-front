import { apiFetch } from "../http/apiClient";

const legDistancesInflight = new Map<string, Promise<number[] | null>>();

function positionsCacheKey(positions: [number, number][]): string {
  return positions.map((p) => `${p[0]},${p[1]}`).join(";");
}

/**
 * Km por tramo siguiendo la red: solo backend (`POST /api/v1/routing/leg-distances`).
 * El mapa usa OSRM en el cliente vía leaflet-routing-machine.
 */
export async function fetchLegDistancesKmFromApi(
  positions: [number, number][],
): Promise<number[] | null> {
  if (positions.length < 2) return null;
  const key = positionsCacheKey(positions);
  const existing = legDistancesInflight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<number[] | null> => {
    try {
      const res = await apiFetch("/api/v1/routing/leg-distances", {
        method: "POST",
        body: JSON.stringify({ positions }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { legsKm?: number[] };
      const legsKm = data.legsKm;
      if (!Array.isArray(legsKm) || legsKm.length === 0) return null;
      return legsKm;
    } catch {
      return null;
    } finally {
      legDistancesInflight.delete(key);
    }
  })();

  legDistancesInflight.set(key, promise);
  return promise;
}

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
