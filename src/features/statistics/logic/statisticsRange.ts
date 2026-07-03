export interface StatisticsDateRange {
  from: string;
  to: string;
}

function toIsoStart(d: Date): string {
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
  ).toISOString();
}

function toIsoEnd(d: Date): string {
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
  ).toISOString();
}

export function defaultStatisticsRange(): StatisticsDateRange {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: toIsoStart(from), to: toIsoEnd(to) };
}

export function presetStatisticsRange(
  preset: "7d" | "30d" | "month",
): StatisticsDateRange {
  const to = new Date();
  const from = new Date();
  if (preset === "7d") from.setUTCDate(from.getUTCDate() - 6);
  else if (preset === "30d") from.setUTCDate(from.getUTCDate() - 29);
  else from.setUTCDate(1);
  return { from: toIsoStart(from), to: toIsoEnd(to) };
}

/** Convierte un valor <input type="date"> (YYYY-MM-DD) al ISO de inicio/fin de día UTC. */
export function dateInputToIso(value: string, edge: "start" | "end"): string {
  const [y, m, d] = value.split("-").map((p) => Number(p));
  if (!y || !m || !d) return value;
  return edge === "start"
    ? new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString()
    : new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
}

export function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatCurrencyAmounts(
  rows: { currencyCode: string; amount: number }[],
): string {
  if (!rows.length) return "—";
  return rows
    .map((r) => `${r.amount.toLocaleString("es")} ${r.currencyCode}`)
    .join(" · ");
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  procesado: "Procesado",
  en_transito: "En tránsito",
  entregado: "Entregado",
};

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const CHART_COLORS = [
  "#0f766e",
  "#2563eb",
  "#ea580c",
  "#9333ea",
  "#dc2626",
  "#ca8a04",
];
