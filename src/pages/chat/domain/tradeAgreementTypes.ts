/** Modelo de acuerdo comercial (formulario emitido por el vendedor, aceptación del comprador). */

export type MerchandiseCondition = "nuevo" | "usado" | "reacondicionado";

export type MerchandiseLine = {
  /** Ancla a la ficha de producto configurada en la tienda del vendedor (flow-ui). */
  linkedStoreProductId?: string;
  tipo: string;
  cantidad: string;
  valorUnitario: string;
  estado: MerchandiseCondition;
  descuento: string;
  impuestos: string;
  moneda: string;
  tipoEmbalaje: string;
  devolucionesDesc: string;
  devolucionQuienPaga: string;
  devolucionPlazos: string;
  regulaciones: string;
};

/** Legado: antes las condiciones iban una sola vez a nivel bloque; ya no se emite desde el formulario. */
export type MerchandiseSectionMeta = {
  moneda: string;
  tipoEmbalaje: string;
  devolucionesDesc: string;
  devolucionQuienPaga: string;
  devolucionPlazos: string;
  regulaciones: string;
};

/** Bloque plano legado (acuerdos emitidos antes del modelo por ítem de servicio). */
export type ServiceAgreementBlock = {
  tipoServicio: string;
  tiempoInicioFin: string;
  horariosFechas: string;
  recurrenciaPagos: string;
  descripcion: string;
  riesgos: string;
  incluye: string;
  noIncluye: string;
  dependencias: string;
  entregables: string;
  garantias: string;
  penalAtraso: string;
  terminacionAnticipada: string;
  avisoDias: string;
  metodoPago: string;
  moneda: string;
  medicionCumplimiento: string;
  penalIncumplimiento: string;
  nivelResponsabilidad: string;
  propIntelectual: string;
};

/** 0 = lunes … 6 = domingo */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Horarios: meses, días calendario por mes, ventana por defecto y excepciones por mes+día del mes */
export type ServiceScheduleState = {
  months: number[];
  /**
   * Año de referencia para saber qué día del mes cae en qué día de semana
   * (la grilla muestra todos los días del mes; por defecto lun–vie).
   */
  calendarYear: number;
  /** Por mes (1–12), días del calendario 1–31 habilitados */
  daysByMonth: Record<number, number[]>;
  defaultWindow: { start: string; end: string };
  /** Clave `mes-díaCalendario` (ej. `3-15` = 15 de marzo) */
  dayHourOverrides: Record<string, { start: string; end: string }>;
  /**
   * @deprecated Modelo anterior (día de semana 0=lun…6=dom). Se migra con `coerceServiceSchedule`.
   */
  weekdaysByMonth?: Record<number, WeekdayIndex[]>;
};

export type PaymentRecurrenceEntry = {
  month: number;
  day: number;
  amount: string;
};

export type ServicePaymentRecurrence = {
  months: number[];
  entries: PaymentRecurrenceEntry[];
};

export type ServiceItem = {
  id: string;
  /** Ancla a la ficha de servicio configurada en la tienda del vendedor (flow-ui). */
  linkedStoreServiceId?: string;
  /** True cuando el asistente guardó una configuración completa */
  configured: boolean;
  tipoServicio: string;
  tiempo: { startDate: string; endDate: string };
  horarios: ServiceScheduleState;
  recurrenciaPagos: ServicePaymentRecurrence;
  descripcion: string;
  riesgos: { enabled: boolean; items: string[] };
  incluye: string;
  noIncluye: string;
  dependencias: { enabled: boolean; items: string[] };
  entregables: string;
  garantias: { enabled: boolean; texto: string };
  penalAtraso: { enabled: boolean; texto: string };
  terminacion: { enabled: boolean; causas: string[]; avisoDias: string };
  metodoPago: string;
  /** Monedas aceptadas para el pago (p. ej. desde ficha de catálogo). */
  monedasAceptadas?: string[];
  /** Compatibilidad / resumen: suele ser `monedasAceptadas.join(', ')`. */
  moneda: string;
  medicionCumplimiento: string;
  penalIncumplimiento: string;
  nivelResponsabilidad: string;
  propIntelectual: string;
};

export type AgreementStatus = "pending_buyer" | "accepted" | "rejected";

export type TradeAgreement = {
  id: string;
  threadId: string;
  title: string;
  issuedAt: number;
  issuedByStoreId: string;
  issuerLabel: string;
  status: AgreementStatus;
  respondedAt?: number;
  /**
   * Tras una edición del vendedor, no puede volver a editar hasta que el comprador acepte o rechace esta versión.
   * Se limpia al responder el comprador.
   */
  sellerEditBlockedUntilBuyerResponse?: boolean;
  /** Si el acuerdo declara el bloque de mercancías (al menos uno de mercancías/servicio debe ser true). */
  includeMerchandise: boolean;
  /** Si el acuerdo declara el bloque de servicios. */
  includeService: boolean;
  merchandise: MerchandiseLine[];
  /** Solo lectura / datos antiguos (una cabecera para todo el bloque). */
  merchandiseMeta?: MerchandiseSectionMeta;
  /** Servicios configurados (nuevo modelo). Opcional en datos persistidos antiguos. */
  services?: ServiceItem[];
  /**
   * Persistido en acuerdos antiguos; si `services` está vacío y esto tiene datos,
   * usar `normalizeAgreementServices`.
   */
  service?: ServiceAgreementBlock;
  /** Solo lectura / legado: ya no se asigna desde el formulario de acuerdo. */
  routeSheetId?: string;
  /** Solo lectura: datos antiguos; ya no se emite desde el formulario. */
  routeSheetUrl?: string;
};

type TradeAgreementDraftBase = Omit<
  TradeAgreement,
  | "id"
  | "threadId"
  | "issuedAt"
  | "issuedByStoreId"
  | "issuerLabel"
  | "status"
  | "respondedAt"
  | "routeSheetUrl"
  | "routeSheetId"
  | "merchandiseMeta"
  | "service"
>;

/** Borrador del formulario: siempre incluye lista de servicios (puede estar vacía). */
export type TradeAgreementDraft = TradeAgreementDraftBase & {
  services: ServiceItem[];
};

export function emptyMerchandiseLine(): MerchandiseLine {
  return {
    tipo: "",
    cantidad: "",
    valorUnitario: "",
    estado: "nuevo",
    descuento: "",
    impuestos: "",
    moneda: "",
    tipoEmbalaje: "",
    devolucionesDesc: "",
    devolucionQuienPaga: "",
    devolucionPlazos: "",
    regulaciones: "",
  };
}

/** Completa claves faltantes (p. ej. datos persistidos antes del modelo por ítem). */
export function normalizeMerchandiseLine(
  line: Partial<MerchandiseLine>,
): MerchandiseLine {
  return {
    ...emptyMerchandiseLine(),
    ...line,
    estado: line.estado ?? "nuevo",
  };
}

export function emptyMerchandiseMeta(): MerchandiseSectionMeta {
  return {
    moneda: "",
    tipoEmbalaje: "",
    devolucionesDesc: "",
    devolucionQuienPaga: "",
    devolucionPlazos: "",
    regulaciones: "",
  };
}

export function emptyServiceBlock(): ServiceAgreementBlock {
  return {
    tipoServicio: "",
    tiempoInicioFin: "",
    horariosFechas: "",
    recurrenciaPagos: "",
    descripcion: "",
    riesgos: "",
    incluye: "",
    noIncluye: "",
    dependencias: "",
    entregables: "",
    garantias: "",
    penalAtraso: "",
    terminacionAnticipada: "",
    avisoDias: "",
    metodoPago: "",
    moneda: "",
    medicionCumplimiento: "",
    penalIncumplimiento: "",
    nivelResponsabilidad: "",
    propIntelectual: "",
  };
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const DEFAULT_WEEKDAYS: WeekdayIndex[] = [0, 1, 2, 3, 4];

export function newServiceItemId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `sv-${crypto.randomUUID()}`
    : `sv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultWeekdaysByMonth(): Record<number, WeekdayIndex[]> {
  const o: Record<number, WeekdayIndex[]> = {};
  for (const m of ALL_MONTHS) o[m] = [...DEFAULT_WEEKDAYS];
  return o;
}

export function daysInCalendarMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/** Días del mes que caen de lunes a viernes (según año de referencia). */
export function defaultWeekdayCalendarDaysInMonth(
  month: number,
  year: number,
): number[] {
  const dim = daysInCalendarMonth(month, year);
  const out: number[] = [];
  for (let d = 1; d <= dim; d++) {
    const js = new Date(year, month - 1, d).getDay();
    if (js >= 1 && js <= 5) out.push(d);
  }
  return out;
}

export function defaultDaysByMonth(year: number): Record<number, number[]> {
  const o: Record<number, number[]> = {};
  for (const m of ALL_MONTHS) o[m] = defaultWeekdayCalendarDaysInMonth(m, year);
  return o;
}

/**
 * Unifica claves de mes (1–12) tras JSON/API: `"1"` vs `1`, y valida días 1–31.
 */
function collectDaysByMonthFromRaw(raw: unknown): Record<number, number[]> {
  if (!raw || typeof raw !== "object") return {};
  const dm = raw as Record<string, unknown>;
  const out: Record<number, number[]> = {};
  for (const k of Object.keys(dm)) {
    const m = Number(k);
    if (!Number.isInteger(m) || m < 1 || m > 12) continue;
    const v = dm[k];
    if (!Array.isArray(v)) continue;
    const days = [
      ...new Set(
        v
          .map((x) => Number(x))
          .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31),
      ),
    ].sort((a, b) => a - b);
    if (days.length) out[m] = days;
  }
  return out;
}

/**
 * Normaliza horarios: migra `weekdaysByMonth` → `daysByMonth` o completa valores por defecto.
 * Las claves antiguas de `dayHourOverrides` (mes + índice de día de semana) se descartan al migrar.
 */
export function coerceServiceSchedule(
  raw: Partial<ServiceScheduleState> & {
    weekdaysByMonth?: Record<number, WeekdayIndex[]>;
  },
): ServiceScheduleState {
  const year = raw.calendarYear ?? new Date().getFullYear();
  const months = raw.months?.length
    ? [
        ...new Set(
          raw.months
            .map((x) => Number(x))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12),
        ),
      ].sort((a, b) => a - b)
    : [...ALL_MONTHS];

  const legacy = raw.weekdaysByMonth;
  const hasLegacy = legacy && Object.keys(legacy).length > 0;
  const normalizedDays = collectDaysByMonthFromRaw(raw.daysByMonth);

  if (hasLegacy) {
    const wbm = legacy!;
    const daysByMonth: Record<number, number[]> = {};
    for (const m of ALL_MONTHS) {
      const dim = daysInCalendarMonth(m, year);
      const enabled = new Set(wbm[m] ?? DEFAULT_WEEKDAYS);
      const days: number[] = [];
      for (let d = 1; d <= dim; d++) {
        const js = new Date(year, m - 1, d).getDay();
        const oldIdx = (js === 0 ? 6 : js - 1) as WeekdayIndex;
        if (enabled.has(oldIdx)) days.push(d);
      }
      daysByMonth[m] = days;
    }
    return {
      months,
      calendarYear: year,
      daysByMonth,
      defaultWindow: raw.defaultWindow ?? { start: "09:00", end: "17:00" },
      dayHourOverrides: {},
    };
  }

  const daysByMonth: Record<number, number[]> = {};
  for (const m of ALL_MONTHS) {
    const arr = normalizedDays[m];
    daysByMonth[m] = arr?.length
      ? [...arr]
      : defaultWeekdayCalendarDaysInMonth(m, year);
  }
  return {
    months,
    calendarYear: year,
    daysByMonth,
    defaultWindow: raw.defaultWindow ?? { start: "09:00", end: "17:00" },
    dayHourOverrides: { ...raw.dayHourOverrides },
  };
}

export function emptyServiceSchedule(): ServiceScheduleState {
  const y = new Date().getFullYear();
  return {
    months: [...ALL_MONTHS],
    calendarYear: y,
    daysByMonth: defaultDaysByMonth(y),
    defaultWindow: { start: "09:00", end: "17:00" },
    dayHourOverrides: {},
  };
}

export function emptyServicePaymentRecurrence(): ServicePaymentRecurrence {
  return {
    months: [...ALL_MONTHS],
    entries: [{ month: 1, day: 1, amount: "1" }],
  };
}

export function emptyServiceItem(): ServiceItem {
  return {
    id: newServiceItemId(),
    configured: false,
    tipoServicio: "",
    tiempo: { startDate: "", endDate: "" },
    horarios: emptyServiceSchedule(),
    recurrenciaPagos: emptyServicePaymentRecurrence(),
    descripcion: "",
    riesgos: { enabled: false, items: [] },
    incluye: "",
    noIncluye: "",
    dependencias: { enabled: false, items: [] },
    entregables: "",
    garantias: { enabled: false, texto: "" },
    penalAtraso: { enabled: false, texto: "" },
    terminacion: { enabled: false, causas: [], avisoDias: "" },
    metodoPago: "",
    monedasAceptadas: undefined,
    moneda: "",
    medicionCumplimiento: "",
    penalIncumplimiento: "",
    nivelResponsabilidad: "",
    propIntelectual: "",
  };
}

function splitLines(s: string): string[] {
  return s
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Convierte un bloque legado a un ítem de servicio (pérdida de estructura fina). */
export function legacyServiceBlockToServiceItem(
  legacy: ServiceAgreementBlock,
  id: string,
): ServiceItem {
  const item = emptyServiceItem();
  item.id = id;
  item.configured = true;
  item.tipoServicio = legacy.tipoServicio;
  item.tiempo = { startDate: "", endDate: "" };
  item.descripcion = legacy.descripcion;
  item.incluye = legacy.incluye;
  item.noIncluye = legacy.noIncluye;
  item.entregables = legacy.entregables;
  item.metodoPago = legacy.metodoPago;
  item.moneda = legacy.moneda;
  const legM = legacy.moneda.trim();
  item.monedasAceptadas =
    legM.includes(",") ?
      [...new Set(legM.split(",").map((x) => x.trim()).filter(Boolean))]
    : legM ?
      [legM]
    : undefined;
  item.medicionCumplimiento = legacy.medicionCumplimiento;
  item.penalIncumplimiento = legacy.penalIncumplimiento;
  item.nivelResponsabilidad = legacy.nivelResponsabilidad;
  item.propIntelectual = legacy.propIntelectual;
  item.riesgos = {
    enabled: legacy.riesgos.trim().length > 0,
    items: splitLines(legacy.riesgos),
  };
  item.dependencias = {
    enabled: legacy.dependencias.trim().length > 0,
    items: splitLines(legacy.dependencias),
  };
  item.garantias = {
    enabled: legacy.garantias.trim().length > 0,
    texto: legacy.garantias,
  };
  item.penalAtraso = {
    enabled: legacy.penalAtraso.trim().length > 0,
    texto: legacy.penalAtraso,
  };
  item.terminacion = {
    enabled:
      legacy.terminacionAnticipada.trim().length > 0 ||
      legacy.avisoDias.trim().length > 0,
    causas: splitLines(legacy.terminacionAnticipada),
    avisoDias: legacy.avisoDias,
  };
  // Resúmenes de texto en horarios / pagos / tiempo
  const extra = [
    legacy.tiempoInicioFin && `Tiempo del servicio: ${legacy.tiempoInicioFin}`,
    legacy.horariosFechas && `Horarios y fechas: ${legacy.horariosFechas}`,
    legacy.recurrenciaPagos &&
      `Recurrencia de pagos: ${legacy.recurrenciaPagos}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (extra) {
    item.descripcion = [item.descripcion, extra].filter(Boolean).join("\n\n");
  }
  return item;
}

/** Lista de servicios a mostrar: nuevos ítems o migración desde `service` legado. */
export function normalizeAgreementServices(a: TradeAgreement): ServiceItem[] {
  if (a.services?.length) return a.services;
  const leg = a.service;
  if (leg && leg.tipoServicio.trim()) {
    return [legacyServiceBlockToServiceItem(leg, "legacy-sv")];
  }
  return [];
}

export function defaultAgreementDraft(): TradeAgreementDraft {
  return {
    title: "",
    includeMerchandise: true,
    includeService: true,
    merchandise: [emptyMerchandiseLine()],
    services: [],
  };
}

/** Copia editable de un acuerdo ya emitido (para el formulario). No incluye id ni estado. */
export function tradeAgreementToDraft(a: TradeAgreement): TradeAgreementDraft {
  const merchandise =
    a.merchandise.length > 0
      ? a.merchandise.map((l) => normalizeMerchandiseLine(l))
      : [emptyMerchandiseLine()];
  const services = normalizeAgreementServices(a);
  return {
    title: a.title,
    includeMerchandise: a.includeMerchandise !== false,
    includeService: a.includeService !== false,
    merchandise,
    services: services.length ? JSON.parse(JSON.stringify(services)) : [],
  };
}

/** Compatibilidad: acuerdos sin flag se tratan como ambos bloques incluidos. */
export function agreementDeclaresMerchandise(
  a: Pick<TradeAgreement, "includeMerchandise">,
): boolean {
  return a.includeMerchandise !== false;
}

export function agreementDeclaresService(
  a: Pick<TradeAgreement, "includeService">,
): boolean {
  return a.includeService !== false;
}
