export const MEASURE_UNITS = ["kg", "g", "lb", "oz", "L", "ml", "U"] as const;

export type MeasureUnit = (typeof MEASURE_UNITS)[number];

export const MEASURE_UNIT_LABELS: Record<MeasureUnit, string> = {
  kg: "kg (kilogramos)",
  g: "g (gramos)",
  lb: "lb (libras)",
  oz: "oz (onzas)",
  L: "L (litros)",
  ml: "ml (mililitros)",
  U: "U (unidades)",
};

export function parseMeasureString(raw: string | null | undefined): {
  value: string;
  unit: MeasureUnit;
} {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { value: "", unit: "L" };
  const m = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?$/.exec(trimmed);
  if (!m) return { value: "", unit: "L" };
  const value = m[1].replace(",", ".");
  const rawUnit = (m[2] ?? "").toLowerCase();
  const found = MEASURE_UNITS.find((u) => u.toLowerCase() === rawUnit);
  return { value, unit: found ?? "L" };
}

export function formatMeasureString(value: string, unit: MeasureUnit): string {
  const v = value.trim().replace(",", ".");
  if (!v) return "";
  return `${v}${unit}`;
}
