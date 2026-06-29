import type { RouteOfferTramoPublic } from "@features/market/logic/store/marketStoreTypes";
import { formatRouteEstimadoDisplay } from "@features/chat/logic/route-sheet/routeSheetDateTime";

export function trustHue(score: number): number {
  const t = Math.max(0, Math.min(100, score)) / 100;
  return t * 120;
}

export function tramoPhoneLine(
  telefonoHoja: string | undefined,
  telefonoAsignacion: string | undefined,
): string | null {
  const h = telefonoHoja?.trim();
  const a = telefonoAsignacion?.trim();
  if (h) return h;
  if (a) return a;
  return null;
}

export function tramoLine(origen: string, destino: string): string {
  const o = origen.trim();
  const d = destino.trim();
  if (o || d) return `${o || "…"} → ${d || "…"}`;
  return "Tramo sin datos";
}

export function buildRouteTramoPublicDetailRows(
  t: RouteOfferTramoPublic,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (t.cargaEnTramo?.trim())
    rows.push({ label: "Carga en el tramo", value: t.cargaEnTramo.trim() });
  if (t.tipoMercanciaCarga?.trim())
    rows.push({
      label: "Tipo mercancía (carga)",
      value: t.tipoMercanciaCarga.trim(),
    });
  if (t.tipoMercanciaDescarga?.trim())
    rows.push({
      label: "Tipo mercancía (descarga)",
      value: t.tipoMercanciaDescarga.trim(),
    });
  if (t.tipoVehiculoRequerido?.trim())
    rows.push({
      label: "Vehículo requerido (hoja)",
      value: t.tipoVehiculoRequerido.trim(),
    });
  if (t.tiempoRecogidaEstimado?.trim() || t.tiempoEntregaEstimado?.trim()) {
    rows.push({
      label: "Ventana estimada (recogida → entrega)",
      value: [
        formatRouteEstimadoDisplay(t.tiempoRecogidaEstimado),
        formatRouteEstimadoDisplay(t.tiempoEntregaEstimado),
      ]
        .filter(Boolean)
        .join(" → "),
    });
  }
  if (t.precioTransportista?.trim())
    rows.push({
      label: "Tarifa transportista (demo)",
      value: t.precioTransportista.trim(),
    });
  if (t.monedaPago?.trim())
    rows.push({ label: "Moneda de pago (tramo)", value: t.monedaPago.trim() });
  if (t.notas?.trim())
    rows.push({ label: "Notas del tramo", value: t.notas.trim() });
  if (t.requisitosEspeciales?.trim())
    rows.push({
      label: "Requisitos / especiales",
      value: t.requisitosEspeciales.trim(),
    });
  return rows;
}
