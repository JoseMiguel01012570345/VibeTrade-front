import type {
  MerchandiseLine,
  ServiceItem,
  TradeAgreementDraft,
} from "./tradeAgreementTypes";
import {
  coerceServiceSchedule,
  monedasFromRecurrenciaPagos,
} from "./tradeAgreementTypes";
import { validateVigenciaRange } from "./serviceVigenciaDates";
import type { StoreCatalog } from "./storeCatalogTypes";

type MerchandiseHolder = { merchandise: MerchandiseLine[] };

/** Errores por clave de campo plana o por índice de línea de mercancía. */
export type TradeAgreementFormErrors = {
  title?: string;
  /** Alcance global: al menos mercancías o servicio; mercancías vacías con el flag activo. */
  scope?: string;
  merchandiseLines?: Record<
    number,
    Partial<Record<keyof MerchandiseLine, string>>
  >;
  /** Al menos un servicio; errores por índice de servicio */
  serviceItems?: string;
  serviceErrors?: Record<number, string[]>;
};

const TITLE_MIN = 3;
const TITLE_MAX = 200;
const SHORT_MAX = 500;
const LONG_MAX = 8000;
const TEXT_MIN = 2;

function norm(s: string): string {
  return s.trim();
}

function isBlank(s: string): boolean {
  return norm(s) === "";
}

/** Acepta 123, 123.45, 123,45 y espacios. */
export function parseDecimal(raw: string): number | null {
  const t = norm(raw).replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

function requireDecimal(
  raw: string,
  label: string,
  opts: { min?: number; positive?: boolean; allowZero?: boolean },
): string | undefined {
  const t = norm(raw);
  if (t === "") return `${label}: valor requerido`;
  const n = parseDecimal(t);
  if (n === null) return `${label}: ingresá un número válido`;
  if (opts.positive && n <= 0) return `${label}: debe ser mayor que cero`;
  if (!opts.allowZero && !opts.positive && n < 0)
    return `${label}: no puede ser negativo`;
  if (opts.allowZero && n < 0) return `${label}: no puede ser negativo`;
  if (opts.min !== undefined && n < opts.min)
    return `${label}: mínimo ${opts.min}`;
  return undefined;
}

function requireNonEmpty(
  raw: string,
  label: string,
  multiline = false,
): string | undefined {
  const t = norm(raw);
  if (t === "") return `${label} es obligatorio`;
  if (t.length < TEXT_MIN) return `${label}: mínimo ${TEXT_MIN} caracteres`;
  const max = multiline ? LONG_MAX : SHORT_MAX;
  if (t.length > max) return `${label}: máximo ${max} caracteres`;
  return undefined;
}

function optionalTextMax(
  raw: string,
  label: string,
  multiline: boolean,
): string | undefined {
  const t = raw;
  const max = multiline ? LONG_MAX : SHORT_MAX;
  if (t.length > max) return `${label}: máximo ${max} caracteres`;
  return undefined;
}

/** Riesgos / dependencias: lista con al menos un ítem con sentido. */
function validateListField(raw: string, label: string): string | undefined {
  const err = requireNonEmpty(raw, label, true);
  if (err) return err;
  const lines = norm(raw)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 1)
    return `${label}: indicá al menos un punto (podés usar una línea por ítem)`;
  const shortest = Math.min(...lines.map((l) => l.length));
  if (shortest < 2)
    return `${label}: cada ítem debería tener al menos 2 caracteres`;
  return optionalTextMax(raw, label, true);
}

function validateAvisoDias(raw: string): string | undefined {
  const err = requireNonEmpty(raw, "Periodo de aviso", false);
  if (err) return err;
  const t = norm(raw);
  const num = parseInt(t.replace(/\D/g, ""), 10);
  if (!Number.isFinite(num) || num <= 0) {
    return "Indicá un número de días (ej. 30)";
  }
  if (num > 3650) return "Periodo de aviso demasiado alto (máx. 3650 días)";
  return optionalTextMax(raw, "Periodo de aviso", false);
}

function lineIsActive(line: MerchandiseLine): boolean {
  /** La ficha del producto aporta el resto; la línea cuenta al haber producto anclado. */
  return !!line.linkedStoreProductId;
}

/** Línea vacía añadida con «+» y aún no usada: no exige producto. */
function isSkippableEmptyMerchLine(line: MerchandiseLine): boolean {
  if (line.linkedStoreProductId) return false;
  return (
    isBlank(line.cantidad) &&
    isBlank(line.tipoEmbalaje) &&
    isBlank(line.devolucionQuienPaga) &&
    isBlank(line.devolucionPlazos) &&
    isBlank(line.regulaciones)
  );
}

export function hasMerchandise(d: MerchandiseHolder): boolean {
  return d.merchandise.some(lineIsActive);
}

/**
 * Validación completa según flow-ui: título, mercancías (cada línea con su bloque de condiciones),
 * servicios (todos los campos), hoja de ruta interna si hay mercancías.
 */
export function validateTradeAgreementDraft(
  d: TradeAgreementDraft,
  options?: { sellerCatalog?: StoreCatalog | null },
): TradeAgreementFormErrors {
  const errors: TradeAgreementFormErrors = {};

  const title = norm(d.title);
  if (!title) errors.title = "El título del acuerdo es obligatorio";
  else if (title.length < TITLE_MIN)
    errors.title = `El título debe tener al menos ${TITLE_MIN} caracteres`;
  else if (title.length > TITLE_MAX)
    errors.title = `El título no puede superar ${TITLE_MAX} caracteres`;

  if (!d.includeMerchandise && !d.includeService) {
    const c = options?.sellerCatalog;
    if (
      c != null &&
      c.products.length === 0 &&
      c.services.length === 0
    ) {
      errors.scope =
        "No hay productos ni servicios en la ficha de la tienda. Cargalos en la vitrina para poder acordar.";
    } else {
      errors.scope =
        "Debés incluir al menos mercancías o servicios (podés marcar ambos).";
    }
  }

  if (d.includeMerchandise && !hasMerchandise(d)) {
    errors.scope =
      errors.scope ??
      "Con «Incluir mercancías» activado, elegí al menos un producto del catálogo y completá los datos del comprador.";
  }

  const lineErrors: NonNullable<TradeAgreementFormErrors["merchandiseLines"]> =
    {};

  d.merchandise.forEach((line, i) => {
    if (!d.includeMerchandise) return;
    if (isSkippableEmptyMerchLine(line)) return;
    if (!line.linkedStoreProductId) {
      lineErrors[i] = {
        tipo: "Seleccioná un producto del catálogo de la tienda",
      };
      return;
    }

    const le: Partial<Record<keyof MerchandiseLine, string>> = {};
    {
      const valErr = requireDecimal(line.valorUnitario, "Valor unitario (ficha)", {
        allowZero: true,
      });
      if (valErr) le.valorUnitario = valErr;
    }

    const cantErr = requireDecimal(line.cantidad, "Cantidad", {
      positive: true,
    });
    if (cantErr) le.cantidad = cantErr;

    (
      [
        ["tipoEmbalaje", "Tipo de embalaje"],
        ["devolucionQuienPaga", "Quién paga el envío de devolución"],
        ["devolucionPlazos", "Plazos de devolución"],
      ] as const
    ).forEach(([key, label]) => {
      const v = line[key];
      const e = requireNonEmpty(v, label, false);
      if (e) le[key] = e;
      else {
        const om = optionalTextMax(v, label, false);
        if (om) le[key] = om;
      }
    });

    const regE = requireNonEmpty(
      line.regulaciones,
      "Regulaciones y cumplimiento (comprador)",
      true,
    );
    if (regE) le.regulaciones = regE;
    else {
      const omR = optionalTextMax(
        line.regulaciones,
        "Regulaciones y cumplimiento (comprador)",
        true,
      );
      if (omR) le.regulaciones = omR;
    }

    if (Object.keys(le).length) lineErrors[i] = le;
  });

  if (Object.keys(lineErrors).length) errors.merchandiseLines = lineErrors;

  if (d.includeService) {
    const services = d.services ?? [];
    if (!services.length) {
      errors.serviceItems =
        "Agregá al menos un servicio y configurá cada uno con el asistente.";
    } else {
      const serviceErrors: NonNullable<
        TradeAgreementFormErrors["serviceErrors"]
      > = {};
      services.forEach((sv, idx) => {
        const msgs = validateServiceItem(sv);
        if (msgs.length) serviceErrors[idx] = msgs;
      });
      if (Object.keys(serviceErrors).length)
        errors.serviceErrors = serviceErrors;
    }
  }

  return errors;
}

function collectServiceHorarioErrors(sv: ServiceItem): string[] {
  const msgs: string[] = [];
  const hor = coerceServiceSchedule(sv.horarios);
  if (!hor.months.length)
    msgs.push("Indicá al menos un mes para horarios del servicio");
  for (const m of hor.months) {
    const days = hor.daysByMonth[m];
    if (!days?.length)
      msgs.push(`Mes ${m}: elegí al menos un día en el calendario`);
  }
  const defS = norm(sv.horarios.defaultWindow.start);
  const defE = norm(sv.horarios.defaultWindow.end);
  if (!defS || !defE)
    msgs.push("Horario por defecto: indicá inicio y fin (ej. 09:00–17:00)");
  return msgs;
}

function collectServicePagoErrors(sv: ServiceItem): string[] {
  const msgs: string[] = [];
  if (!sv.recurrenciaPagos.months.length)
    msgs.push("Recurrencia de pagos: elegí al menos un mes");
  if (sv.recurrenciaPagos.entries.length < 1) {
    msgs.push(
      "Recurrencia de pagos: agregá al menos una fila con mes, día y monto",
    );
  } else {
    const seenDay = new Set<string>();
    sv.recurrenciaPagos.entries.forEach((en, i) => {
      if (!sv.recurrenciaPagos.months.includes(en.month)) {
        msgs.push(
          `Pago ${i + 1}: el mes no está entre los meses seleccionados`,
        );
      }
      if (!norm(String(en.moneda ?? "")))
        msgs.push(`Pago ${i + 1}: indicá la moneda`);
      if (en.day < 1 || en.day > 31) msgs.push(`Pago ${i + 1}: día inválido`);
      const y = new Date().getFullYear();
      const dim =
        en.month >= 1 && en.month <= 12
          ? new Date(y, en.month, 0).getDate()
          : 31;
      if (en.day > dim)
        msgs.push(`Pago ${i + 1}: ese día no existe en el mes elegido`);
      const dayKey = `${en.month}-${en.day}`;
      if (seenDay.has(dayKey)) {
        msgs.push(
          `Pago ${i + 1}: ya hay otro pago el mismo día del mes (${dayKey.replace("-", "/")}).`,
        );
      }
      seenDay.add(dayKey);
      const pe = requireDecimal(en.amount, `Monto (pago ${i + 1})`, {
        positive: true,
      });
      if (pe) msgs.push(pe);
    });
  }
  return msgs;
}

function collectServiceAlcanceErrors(sv: ServiceItem): string[] {
  const msgs: string[] = [];
  const eDesc = requireNonEmpty(
    sv.descripcion,
    "Descripción del servicio",
    true,
  );
  if (eDesc) msgs.push(eDesc);
  else {
    const om = optionalTextMax(
      sv.descripcion,
      "Descripción del servicio",
      true,
    );
    if (om) msgs.push(om);
  }
  const eIncl = requireNonEmpty(sv.incluye, "Qué incluye el servicio", true);
  if (eIncl) msgs.push(eIncl);
  else {
    const om = optionalTextMax(sv.incluye, "Qué incluye el servicio", true);
    if (om) msgs.push(om);
  }
  if (!isBlank(sv.noIncluye)) {
    const omNo = optionalTextMax(sv.noIncluye, "Qué no incluye", true);
    if (omNo) msgs.push(omNo);
  }
  const eEnt = requireNonEmpty(sv.entregables, "Qué se entrega", true);
  if (eEnt) msgs.push(eEnt);
  else {
    const om = optionalTextMax(sv.entregables, "Qué se entrega", true);
    if (om) msgs.push(om);
  }
  return msgs;
}

function collectServiceRiesgosDependenciasErrors(sv: ServiceItem): string[] {
  const msgs: string[] = [];
  if (sv.riesgos.enabled) {
    const er = validateListField(
      sv.riesgos.items.join("\n"),
      "Riesgos del servicio",
    );
    if (er) msgs.push(er);
  }
  if (sv.dependencias.enabled) {
    const ed = validateListField(
      sv.dependencias.items.join("\n"),
      "Dependencias",
    );
    if (ed) msgs.push(ed);
  }
  return msgs;
}

function collectServiceGarantiasPenalTermErrors(
  sv: ServiceItem,
  opts?: { omitGarantiasFichaBlock?: boolean },
): string[] {
  const msgs: string[] = [];
  if (sv.garantias.enabled && !opts?.omitGarantiasFichaBlock) {
    const eg = requireNonEmpty(sv.garantias.texto, "Garantías", true);
    if (eg) msgs.push(eg);
  }
  if (sv.penalAtraso.enabled) {
    const ep = requireNonEmpty(
      sv.penalAtraso.texto,
      "Penalizaciones por atraso",
      true,
    );
    if (ep) msgs.push(ep);
  }
  if (sv.terminacion.enabled) {
    const ec = validateListField(
      sv.terminacion.causas.join("\n"),
      "Causas de terminación anticipada",
    );
    if (ec) msgs.push(ec);
    const ea = validateAvisoDias(sv.terminacion.avisoDias);
    if (ea) msgs.push(ea);
  }
  return msgs;
}

/**
 * Errores que deben resolurse antes de avanzar desde el paso `fromStep` del asistente
 * (mismo índice que STEPS en ServiceConfigWizard: 0 = tipo…).
 */
export function validateServiceWizardAdvance(
  sv: ServiceItem,
  fromStep: number,
): string[] {
  const ficha = !!sv.linkedStoreServiceId;
  if (ficha && (fromStep === 4 || fromStep === 5)) {
    return [];
  }
  switch (fromStep) {
    case 2:
      return collectServiceHorarioErrors(sv);
    case 3:
      return collectServicePagoErrors(sv);
    case 4:
      return collectServiceAlcanceErrors(sv);
    case 5:
      return collectServiceRiesgosDependenciasErrors(sv);
    case 6:
      return collectServiceGarantiasPenalTermErrors(sv, {
        omitGarantiasFichaBlock: ficha,
      });
    default:
      return [];
  }
}

/** Validación de un ítem de servicio ya configurado (emitir acuerdo). */
export function validateServiceItem(sv: ServiceItem): string[] {
  const msgs: string[] = [];
  if (!sv.configured) {
    msgs.push(
      "Este servicio no está guardado desde el asistente de configuración.",
    );
    return msgs;
  }

  const t = norm(sv.tipoServicio);
  if (!t) msgs.push("Tipo de servicio es obligatorio");
  else if (t.length < TEXT_MIN)
    msgs.push(`Tipo de servicio: mínimo ${TEXT_MIN} caracteres`);
  else {
    const om = optionalTextMax(sv.tipoServicio, "Tipo de servicio", false);
    if (om) msgs.push(om);
  }

  validateVigenciaRange(sv.tiempo.startDate, sv.tiempo.endDate).forEach((m) =>
    msgs.push(m),
  );

  collectServiceHorarioErrors(sv).forEach((m) => msgs.push(m));
  collectServicePagoErrors(sv).forEach((m) => msgs.push(m));
  if (!sv.linkedStoreServiceId) {
    collectServiceAlcanceErrors(sv).forEach((m) => msgs.push(m));
    collectServiceRiesgosDependenciasErrors(sv).forEach((m) => msgs.push(m));
  }
  collectServiceGarantiasPenalTermErrors(sv, {
    omitGarantiasFichaBlock: !!sv.linkedStoreServiceId,
  }).forEach((m) => msgs.push(m));

  if (monedasFromRecurrenciaPagos(sv.recurrenciaPagos).length === 0) {
    msgs.push(
      "Indicá la moneda en cada fila de la recurrencia de pagos (paso «Pagos recurrentes»).",
    );
  }

  const eMed = requireNonEmpty(
    sv.medicionCumplimiento,
    "Medición del cumplimiento",
    true,
  );
  if (eMed) msgs.push(eMed);
  const ePen = requireNonEmpty(
    sv.penalIncumplimiento,
    "Penalizaciones por incumplimiento",
    true,
  );
  if (ePen) msgs.push(ePen);
  const eNiv = requireNonEmpty(
    sv.nivelResponsabilidad,
    "Nivel de responsabilidad",
    true,
  );
  if (eNiv) msgs.push(eNiv);
  const ePi = requireNonEmpty(
    sv.propIntelectual,
    "Propiedad intelectual y licencias",
    true,
  );
  if (ePi) {
    if (sv.linkedStoreServiceId && !norm(sv.propIntelectual)) {
      msgs.push(
        "Completá la propiedad intelectual en la ficha del servicio o desanclá el catálogo.",
      );
    } else {
      msgs.push(ePi);
    }
  }

  return [...new Set(msgs)];
}

export function validationErrorCount(e: TradeAgreementFormErrors): number {
  let n = 0;
  if (e.title) n++;
  if (e.scope) n++;
  if (e.merchandiseLines) {
    Object.values(e.merchandiseLines).forEach((row) => {
      if (row) n += Object.keys(row).length;
    });
  }
  if (e.serviceItems) n++;
  if (e.serviceErrors) {
    Object.values(e.serviceErrors).forEach((arr) => {
      n += arr?.length ?? 0;
    });
  }
  return n;
}

export function hasValidationErrors(e: TradeAgreementFormErrors): boolean {
  return validationErrorCount(e) > 0;
}
