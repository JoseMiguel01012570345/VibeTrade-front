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

/**
 * Absolute `http:`/`https:` URL usable in QR/PDF.
 * Converts server paths like `/api/v1/media/...` relative to `window.location.origin`.
 * Returns `null` for empty strings, malformed values, or `blob:` URLs (solo válidos en la sesión del navegador).
 */
export function resolveAgreementAttachmentUrlForQr(raw: unknown): string | null {
  const s = `${raw ?? ""}`.trim();
  if (!s) return null;
  if (/^blob:/i.test(s)) return null;

  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* relative paths */
  }

  /** Root-relative path (/api/v1/media/…) */
  if (s.startsWith("/")) {
    if (typeof globalThis.window === "undefined") return null;
    try {
      return new URL(s, globalThis.window.location.href).href;
    } catch {
      return null;
    }
  }

  /** Protocol-relative (//…) */
  if (s.startsWith("//")) {
    if (typeof globalThis.window === "undefined") return null;
    try {
      const proto =
        typeof globalThis.window.location?.protocol === "string"
          ? globalThis.window.location.protocol
          : "https:";
      return new URL(`${proto}${s}`).href;
    } catch {
      return null;
    }
  }

  return null;
}



export type CollectAgreementQrLinksOpts = {
  /** Si hay hoja enlazada, añade un QR que abre el chat con esa hoja (solo útil cuando el PDF lleva URL absoluta). */
  threadId?: string;
};

/**
 * Enlaces de archivos (fotos/documentos) declarados en campos extra del acuerdo
 * y la URL externa de hoja de ruta, útiles para anexar códigos QR al PDF.
 */
export function collectAgreementQrLinkEntries(
  a: TradeAgreement,
  opts?: CollectAgreementQrLinksOpts,
): { readonly label: string; readonly url: string }[] {
  const out: { label: string; url: string }[] = [];
  const seen = new Set<string>();

  const pushOne = (label: string, rawUrl: string) => {
    const url = resolveAgreementAttachmentUrlForQr(rawUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ label: label.slice(0, 200), url });
  };

  const route = norm(a.routeSheetUrl ?? "");
  if (route) {
    pushOne("Hoja de ruta (enlace externo)", route);
  }

  const sid = norm(a.routeSheetId ?? "");
  const tid = norm(opts?.threadId ?? "");
  if (sid && tid && typeof globalThis.window !== "undefined") {
    try {
      const origin = globalThis.window.location.origin;
      const rel = `/chat/${encodeURIComponent(tid)}?presel=1&sheet=${encodeURIComponent(sid)}`;
      pushOne(
        "Abrir esta hoja de ruta en el chat",
        `${origin}${rel}`,
      );
    } catch {
      /* noop */
    }
  }

  const fields = a.extraFields ?? [];
  let iImg = 0;
  let iDoc = 0;
  for (const f of fields) {
    if (f.valueKind !== "image" && f.valueKind !== "document") continue;
    const mu = norm(f.mediaUrl);
    const title = norm(f.title) || "(sin título)";
    const hint =
      f.valueKind === "image"
        ? `Campo adjunto (${++iImg}) — foto`
        : `Campo adjunto (${++iDoc}) — documento`;
    pushOne(`${hint}: ${title}`, mu);
  }

  if (agreementDeclaresService(a)) {
    const services = normalizeAgreementServices(a);
    let svcImg = 0;
    let svcDoc = 0;
    services.forEach((sv, svcIndex) => {
      for (const f of sv.condicionesExtras ?? []) {
        if (f.valueKind !== "image" && f.valueKind !== "document") continue;
        const mu = norm(f.mediaUrl);
        const title = norm(f.title) || "(sin título)";
        const kind =
          f.valueKind === "image"
            ? `foto (${++svcImg})`
            : `documento (${++svcDoc})`;
        pushOne(
          `Servicio ${svcIndex + 1} — cláusula extra (${kind}): ${title}`,
          mu,
        );
      }
    });
  }

  return out;
}

export type AgreementInformePreviewItem = {
  label: string;
  url: string;
  kind: "image" | "document";
};

/**
 * Adjuntos foto/documento y enlace de hoja (si existe) para previsualización en modal.
 * Sin anexo QR dentro del modal.
 */
export function collectAgreementInformePreviewEntries(
  a: TradeAgreement,
): AgreementInformePreviewItem[] {
  const out: AgreementInformePreviewItem[] = [];
  const seen = new Set<string>();

  const push = (kind: "image" | "document", label: string, raw: string) => {
    const url = resolveAgreementAttachmentUrlForQr(raw);
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({
      label: label.slice(0, 240),
      url,
      kind,
    });
  };

  const route = norm(a.routeSheetUrl ?? "");
  if (route)
    push("document", "Hoja de ruta (enlace externo)", route);

  let iImg = 0;
  let iDoc = 0;
  const fields = a.extraFields ?? [];
  for (const f of fields) {
    if (f.valueKind !== "image" && f.valueKind !== "document") continue;
    const title = norm(f.title) || "(sin título)";
    const mu = norm(f.mediaUrl);
    if (f.valueKind === "image")
      push("image", `Campo foto (${++iImg}): ${title}`, mu);
    else push("document", `Campo doc (${++iDoc}): ${title}`, mu);
  }

  if (agreementDeclaresService(a)) {
    const services = normalizeAgreementServices(a);
    let svcImg = 0;
    let svcDoc = 0;
    services.forEach((sv, svcIndex) => {
      for (const f of sv.condicionesExtras ?? []) {
        if (f.valueKind !== "image" && f.valueKind !== "document") continue;
        const title = norm(f.title) || "(sin título)";
        const mu = norm(f.mediaUrl);
        if (f.valueKind === "image")
          push(
            "image",
            `Servicio ${svcIndex + 1}: foto (${++svcImg}) ${title}`,
            mu,
          );
        else
          push(
            "document",
            `Servicio ${svcIndex + 1}: doc (${++svcDoc}) ${title}`,
            mu,
          );
      }
    });
  }

  return out;
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
      const mu = norm(f.mediaUrl);
      o.push(
        `   (${f.valueKind === "image" ? "Imagen" : "Documento"}: ${norm(f.fileName) || mu})`,
      );
      const abs = resolveAgreementAttachmentUrlForQr(mu);
      if (abs) {
        o.push(
          `   Enlace (también en código QR en anexos del PDF): ${abs}`,
        );
      } else {
        o.push(
          "   (Abrir el acuerdo en VibeTrade para ver o descargar el archivo.)",
        );
      }
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
    const rs = resolveAgreementAttachmentUrlForQr(a.routeSheetUrl);
    sections.push(
      `Enlace hoja de ruta (referencia externa): ${rs ?? norm(a.routeSheetUrl)}`,
    );
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
    "--- Los datos incluyen texto y tablas configurados en VibeTrade. Fotos y documentos con URL pública pueden incluirse al final de este archivo como código QR ---",
  );
  return sections.join("\n");
}
