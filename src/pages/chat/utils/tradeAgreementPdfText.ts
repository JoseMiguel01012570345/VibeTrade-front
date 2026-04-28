import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  coerceServiceSchedule,
  legacyCombinedExtraFields,
  merchandiseScopedExtraFields,
  monedasFromRecurrenciaPagos,
  normalizeAgreementServices,
  normalizeMerchandiseLine,
  serviceScopedExtraFields,
  type MerchandiseSectionMeta,
  type MerchandiseLine,
  type ServiceItem,
  type ServiceScheduleState,
  type TradeAgreement,
  type TradeAgreementExtraFieldDraft,
} from "../domain/tradeAgreementTypes";
import type { StoreCatalog } from "../domain/storeCatalogTypes";
import { findStoreProduct, findStoreService } from "../domain/storeCatalogTypes";
import {
  formatPaymentSummary,
  formatScheduleSummary,
} from "../components/modals/serviceConfig/serviceItemFormat";

const MES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function norm(s?: string): string {
  return (s ?? "").trim();
}

function statusEs(s: TradeAgreement["status"]): string {
  switch (s) {
    case "accepted":
      return "Aceptado";
    case "rejected":
      return "Rechazado";
    case "deleted":
      return "Eliminado";
    case "pending_buyer":
    default:
      return "Pendiente de respuesta del comprador";
  }
}

function formatIssuedDate(isoMs: number): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date(isoMs));
  } catch {
    return new Date(isoMs).toISOString();
  }
}

function formatServiceScheduleExtended(h: ServiceScheduleState): string {
  const s = coerceServiceSchedule(h);
  const lines: string[] = [];
  lines.push(formatScheduleSummary(h));
  lines.push("");
  lines.push(
    `Meses con prestacion: ${s.months.length === 12 ? "Todo el año" : s.months.map((m) => MES[m]).join(", ")}`,
  );
  lines.push("");
  for (const m of s.months) {
    const days = s.daysByMonth[m];
    if (!days?.length) continue;
    const sample =
      days.length <= 40
        ? days.join(", ")
        : `${days.slice(0, 40).join(", ")}... (+${days.length - 40})`;
    lines.push(`${MES[m]} -- ${days.length} dia(s) de calendario: ${sample}`);
  }
  if (Object.keys(s.dayHourOverrides).length > 0) {
    lines.push("");
    lines.push("Excepciones de horario:");
    for (const [key, v] of Object.entries(s.dayHourOverrides)) {
      const [mo, da] = key.split("-").map(Number);
      if (!Number.isInteger(mo) || !Number.isInteger(da)) continue;
      lines.push(`  * ${MES[mo]} ${da}: ${v.start}-${v.end}`);
    }
  }
  return lines.join("\n");
}

function paymentTableLines(sv: ServiceItem): string[] {
  const rows = sv.recurrenciaPagos.entries;
  const head = `${"Mes".padEnd(14)} ${"Dia".padEnd(6)} ${"Moneda".padEnd(8)} Monto`;
  const body = rows.map((en) => {
    const mm = `${MES[en.month]}`;
    const currency = `${en.moneda ?? "-"}`.slice(0, 8).padEnd(8);
    return `${mm.padEnd(14)} ${String(en.day).padEnd(6)} ${currency} ${en.amount}`;
  });
  return [head, ...body];
}

function buildServiceItemText(sv: ServiceItem, catalog?: StoreCatalog | null): string {
  const parts: string[] = [];
  const linked = catalog
    ? findStoreService(catalog, sv.linkedStoreServiceId)
    : undefined;
  const t = sv.tiempo;
  const vig =
    t.startDate && t.endDate
      ? `${t.startDate} -> ${t.endDate}`
      : t.startDate
        ? `Desde ${t.startDate}`
        : "(sin fechas declaradas)";
  parts.push("=======================================");
  parts.push(norm(sv.tipoServicio) || "SERVICIO (sin tipo)");
  parts.push("=======================================");
  if (linked) {
    parts.push(`Anclaje al catalogo: ${linked.tipoServicio} - ${linked.category}`);
    parts.push("");
  }
  parts.push("[Identificacion y vigencia]");
  parts.push(`  Tipo de servicio: ${norm(sv.tipoServicio) || "-"}`);
  parts.push(`  Vigencia: ${vig}`);
  parts.push("");
  parts.push("[Horarios y calendario]");
  parts.push(formatServiceScheduleExtended(sv.horarios));
  parts.push("");
  parts.push("[Pagos recurrentes]");
  parts.push(`  Resumen: ${formatPaymentSummary(sv)}`);
  paymentTableLines(sv).forEach((l) => parts.push(`  ${l}`));
  parts.push("");
  parts.push("[Alcance del servicio]");
  parts.push(`  Descripcion: ${norm(sv.descripcion) || "-"}`);
  parts.push(`  Que incluye: ${norm(sv.incluye) || "-"}`);
  parts.push(`  Que no incluye: ${norm(sv.noIncluye) || "-"}`);
  parts.push(`  Entregables: ${norm(sv.entregables) || "-"}`);
  parts.push("");
  parts.push("[Riesgos, dependencias y condiciones]");
  parts.push(
    `  Riesgos: ${sv.riesgos.enabled ? "activado" : "no"}${sv.riesgos.enabled && sv.riesgos.items.length ? `\n${sv.riesgos.items.map((x) => `    - ${x}`).join("\n")}` : ""}`,
  );
  parts.push(
    `  Dependencias: ${sv.dependencias.enabled ? "activado" : "no"}${sv.dependencias.enabled && sv.dependencias.items.length ? `\n${sv.dependencias.items.map((x) => `    - ${x}`).join("\n")}` : ""}`,
  );
  parts.push(
    `  Garantias: ${sv.garantias.enabled ? norm(sv.garantias.texto) || "-" : "no"}`,
  );
  parts.push(
    `  Penalizacion por atraso: ${sv.penalAtraso.enabled ? norm(sv.penalAtraso.texto) || "-" : "no"}`,
  );
  parts.push(
    `  Terminacion anticipada: ${sv.terminacion.enabled ? "si" : "no"}`,
  );
  if (sv.terminacion.enabled) {
    parts.push(
      `    Causas:\n${sv.terminacion.causas.length ? sv.terminacion.causas.map((c) => `      - ${c}`).join("\n") : "      -"}`,
    );
    parts.push(`    Aviso previo: ${norm(sv.terminacion.avisoDias) || "-"}`);
  }
  parts.push("");
  parts.push("[Comercial, pago y cumplimiento]");
  parts.push(
    `  Monedas en recurrencia: ${monedasFromRecurrenciaPagos(sv.recurrenciaPagos).join(" / ") || "-"}`,
  );
  parts.push(
    `  Monedas aceptadas: ${(sv.monedasAceptadas?.length ?? 0) ? sv.monedasAceptadas!.join(", ") : norm(sv.moneda) || "-"}`,
  );
  parts.push(`  Metodo de pago declarado: ${norm(sv.metodoPago) || "-"}`);
  parts.push(`  Moneda (resumen): ${norm(sv.moneda) || "-"}`);
  parts.push(
    `  Medicion del cumplimiento: ${norm(sv.medicionCumplimiento) || "-"}`,
  );
  parts.push(
    `  Penalizacion por incumplimiento: ${norm(sv.penalIncumplimiento) || "-"}`,
  );
  parts.push(
    `  Nivel de responsabilidad: ${norm(sv.nivelResponsabilidad) || "-"}`,
  );
  parts.push(
    `  Propiedad intelectual / licencias: ${norm(sv.propIntelectual) || "-"}`,
  );
  const condExtra = extraFieldsText(
    "Otros puntos pactados (condiciones adicionales del asistente)",
    sv.condicionesExtras,
  );
  for (const ln of condExtra) parts.push(ln);
  parts.push(`  Item configurado (asistente): ${sv.configured ? "si" : "no"}`);
  return parts.join("\n");
}

function merchandiseLineText(
  line: MerchandiseLine,
  index: number,
  catalog?: StoreCatalog | null,
): string {
  const ln = normalizeMerchandiseLine(line);
  const linked = catalog
    ? findStoreProduct(catalog, ln.linkedStoreProductId)
    : undefined;
  const chunks: string[] = [];
  chunks.push(`--- Item de mercancia ${index + 1} ---`);
  if (linked) {
    chunks.push(`Catalogo: ${linked.name} - ${linked.category}`);
  }
  chunks.push(`Tipo: ${norm(ln.tipo) || "-"}`);
  chunks.push(`Cantidad: ${norm(ln.cantidad) || "-"}`);
  chunks.push(`Valor unitario: ${norm(ln.valorUnitario) || "-"}`);
  chunks.push(`Estado: ${norm(ln.estado) || "-"}`);
  chunks.push(
    `Descuento / impuestos / moneda: ${norm(ln.descuento)} / ${norm(ln.impuestos)} / ${norm(ln.moneda)}`,
  );
  chunks.push(`Devoluciones (descripcion): ${norm(ln.devolucionesDesc) || "-"}`);
  chunks.push(
    `Quien paga envio devolucion: ${norm(ln.devolucionQuienPaga) || "-"}`,
  );
  chunks.push(`Plazos devolucion: ${norm(ln.devolucionPlazos) || "-"}`);
  chunks.push(`Tipo de embalaje: ${norm(ln.tipoEmbalaje) || "-"}`);
  chunks.push(
    `Regulaciones y cumplimiento: ${norm(ln.regulaciones) || "-"}`,
  );
  return chunks.join("\n");
}

function legacyMerchandiseMetaLines(m?: MerchandiseSectionMeta): string[] {
  if (!m) return [];
  const rows: string[] = [];
  if (norm(m.moneda)) rows.push(`  Moneda: ${m.moneda}`);
  if (norm(m.tipoEmbalaje)) rows.push(`  Tipo embalaje: ${m.tipoEmbalaje}`);
  if (norm(m.devolucionesDesc)) rows.push(`  Devoluciones: ${m.devolucionesDesc}`);
  if (norm(m.devolucionQuienPaga))
    rows.push(`  Quien paga devolucion: ${m.devolucionQuienPaga}`);
  if (norm(m.devolucionPlazos))
    rows.push(`  Plazos devolucion (legacy): ${m.devolucionPlazos}`);
  if (norm(m.regulaciones)) rows.push(`  Regulaciones: ${m.regulaciones}`);
  if (!rows.length) return [];
  return ["Condiciones generales legacy (cabecera bloque viejo):", ...rows, ""];
}

function extraFieldsText(
  heading: string,
  fields?: TradeAgreementExtraFieldDraft[],
): string[] {
  if (!fields?.length) return [];
  const o: string[] = [
    "---------------------------------------",
    heading,
    "---------------------------------------",
  ];
  for (const f of fields) {
    o.push(` * ${norm(f.title) || "(sin titulo)"}`);
    if (f.valueKind === "text") {
      o.push(`   ${norm(f.textValue) || "-"}`);
    } else if (f.mediaUrl.trim()) {
      o.push(
        `   (${f.valueKind === "image" ? "Imagen" : "Documento"}: ${norm(f.fileName) || norm(f.mediaUrl)})`,
      );
      o.push(
        "   (Abrir el acuerdo en VibeTrade para ver o descargar el archivo.)",
      );
    } else {
      o.push("   -");
    }
    o.push("");
  }
  return o;
}

/**
 * Documento largo ASCII para imprimir/exportar PDF (titulo, tienda, fecha incluidos arriba).
 */
export function buildTradeAgreementPlainDocument(
  a: TradeAgreement,
  catalog?: StoreCatalog | null,
): string {
  const sections: string[] = [];
  sections.push("ACUERDO COMERCIAL - VIBE TRADE");
  sections.push("");
  sections.push(`Titulo: ${norm(a.title) || "(sin titulo)"}`);
  sections.push(`Emitido por (tienda): ${norm(a.issuerLabel) || "-"}`);
  sections.push(`Fecha de emision: ${formatIssuedDate(a.issuedAt)}`);
  sections.push(`Estado: ${statusEs(a.status)}`);
  sections.push(`ID del acuerdo: ${a.id}`);
  sections.push("");
  if (norm(a.routeSheetUrl || "")) {
    sections.push(`Enlace hoja de ruta (referencia externa): ${a.routeSheetUrl}`);
    sections.push("");
  }

  sections.push("---------------------------------------");
  sections.push("MERCANCIAS");
  sections.push("---------------------------------------");

  if (!agreementDeclaresMerchandise(a)) {
    sections.push("(Este acuerdo no declara mercancias en el bloque de contrato)");
  } else if (!a.merchandise.length) {
    sections.push("(Mercancias activadas pero sin lineas cargadas)");
  } else {
    for (let i = 0; i < a.merchandise.length; i++) {
      sections.push(merchandiseLineText(a.merchandise[i], i, catalog));
      sections.push("");
    }
  }

  const leg = legacyMerchandiseMetaLines(a.merchandiseMeta);
  if (leg.length) sections.push(...leg);

  if (
    agreementDeclaresMerchandise(a) &&
    merchandiseScopedExtraFields(a.extraFields).length
  ) {
    sections.push(
      ...extraFieldsText(
        "Otras clausulas (mercancia)",
        merchandiseScopedExtraFields(a.extraFields),
      ),
    );
  }

  sections.push("---------------------------------------");
  sections.push("SERVICIOS");
  sections.push("---------------------------------------");

  const services = normalizeAgreementServices(a);
  if (!agreementDeclaresService(a)) {
    sections.push("(Este acuerdo no declara servicios en el bloque de contrato)");
  } else if (!services.length) {
    sections.push("(Servicios activados pero sin items cargados)");
  } else {
    services.forEach((sv) => {
      sections.push(buildServiceItemText(sv, catalog));
      sections.push("");
    });
  }

  if (
    agreementDeclaresService(a) &&
    serviceScopedExtraFields(a.extraFields).length
  ) {
    sections.push(
      ...extraFieldsText(
        "Otras clausulas (servicio)",
        serviceScopedExtraFields(a.extraFields),
      ),
    );
  }

  if (legacyCombinedExtraFields(a.extraFields).length) {
    sections.push(
      ...extraFieldsText(
        "Campos adicionales conjuntos (historico)",
        legacyCombinedExtraFields(a.extraFields),
      ),
    );
  }

  sections.push("");
  sections.push(
    "--- Los datos incluyen texto y tablas configurados en VibeTrade. Imagenes y documentos adjuntos en campos adicionales pueden requerir abrir la app. ---",
  );
  return sections.join("\n");
}
