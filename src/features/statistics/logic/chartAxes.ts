import type { CSSProperties } from "react";

/** Estilo de etiquetas de eje alineado con el tema (usa el token --muted). */
const LABEL_STYLE: CSSProperties = { fontSize: 11, fill: "var(--muted)" };

export const axisTick = { fontSize: 11, fill: "var(--muted)" } as const;

export const statsChartMargin = {
  default: { top: 8, right: 16, bottom: 28, left: 8 },
  withYLabel: { top: 8, right: 16, bottom: 28, left: 44 },
  withBothLabels: { top: 8, right: 16, bottom: 36, left: 44 },
  tallXTicks: { top: 8, right: 16, bottom: 48, left: 44 },
  verticalBar: { top: 8, right: 16, bottom: 28, left: 8 },
} as const;

export function statsXLabel(value: string, offset = -4) {
  return {
    value,
    position: "insideBottom" as const,
    offset,
    style: LABEL_STYLE,
  };
}

export function statsYLabel(value: string) {
  return {
    value,
    angle: -90 as const,
    position: "insideLeft" as const,
    style: LABEL_STYLE,
  };
}
