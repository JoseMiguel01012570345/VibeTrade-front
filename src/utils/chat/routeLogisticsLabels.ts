/**
 * Textos para UI (es-ES). Los valores API son snake_case en inglés.
 */

/** Estado logístico del tramo (`RouteStopDeliveryStates` en backend). */
export function routeStopDeliveryStateLabelEs(
  raw: string | undefined | null,
): string {
  const s = (raw ?? "").trim().toLowerCase();
  switch (s) {
    /** Pseudo-estado UI: la hoja sigue en borrador; no mostrar avance operativo de entregas. */
    case "route_sheet_draft":
      return "Ruta en borrador — sin operación activa en este tramo";
    case "unpaid":
      return "Sin cobro en este tramo";
    case "paid":
      return "Cobrado — pendiente de movimiento";
    case "in_transit":
      return "En tránsito";
    case "awaiting_carrier_for_handoff":
      return "Esperando transportista / handoff";
    case "delivered_pending_evidence":
      return "Entregado — falta evidencia";
    case "evidence_submitted":
      return "Evidencia enviada — en revisión";
    case "evidence_accepted":
      return "Evidencia aceptada — tramo cerrado";
    case "evidence_rejected":
      return "Evidencia rechazada — puede reenviarse";
    case "refunded_expired":
      return "Reembolsado (plazo vencido)";
    case "refunded_carrier_exit":
      return "Reembolsado (salida del transportista)";
    default:
      return s.length > 0 ? s.replace(/_/g, " ") : "Sin registro";
  }
}

/** Estado de la fila de evidencia de entrega (`ServiceEvidenceStatuses`). */
export function carrierDeliveryEvidenceStatusLabelEs(
  raw: string | undefined | null,
): string {
  const s = (raw ?? "").trim().toLowerCase();
  switch (s) {
    case "draft":
      return "Borrador";
    case "submitted":
      return "Enviada — pendiente de la tienda";
    case "accepted":
      return "Aceptada por la tienda";
    case "rejected":
      return "Rechazada por la tienda";
    default:
      return s.length > 0 ? s.replace(/_/g, " ") : "—";
  }
}
