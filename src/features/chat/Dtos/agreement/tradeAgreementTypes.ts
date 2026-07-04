/** Modelo de acuerdo comercial (formulario emitido por el vendedor, aceptación del comprador). */

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
  /** Código de moneda (ej. ARS, USD), elegido entre las aceptadas para el servicio. */
  moneda: string;
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
  /** Cláusulas libres configuradas en el asistente (paso Condiciones comerciales). */
  condicionesExtras?: TradeAgreementExtraFieldDraft[];
};

export type AgreementStatus =
  | "pending_buyer"
  | "accepted"
  | "rejected"
  | "deleted";

export type TradeAgreementExtraValueKind = "text" | "image" | "document";

/** Alcance del campo libre: bloque servicio o acuerdos emitidos antes de discriminar sección. */
export type TradeAgreementExtraFieldScope = "service" | "legacy_combined";

/** Campo libre adicional dentro del bloque de servicio (y legado combinado). */
export type TradeAgreementExtraFieldDraft = {
  /** Id estable al editar (local o servidor). */
  id: string;
  /** service | legacy_combined */
  scope: TradeAgreementExtraFieldScope;
  title: string;
  valueKind: TradeAgreementExtraValueKind;
  textValue: string;
  /** `/api/v1/media/…` tras subida. */
  mediaUrl: string;
  fileName: string;
};

export type TradeAgreement = {
  id: string;
  threadId: string;
  title: string;
  issuedAt: number;
  issuedByStoreId: string;
  issuerLabel: string;
  status: AgreementStatus;
  /** Si el vendedor eliminó el acuerdo (baja lógica en servidor), epoch ms. */
  deletedAt?: number;
  respondedAt?: number;
  /**
   * Tras una edición del vendedor, no puede volver a editar hasta que el comprador acepte o rechace esta versión.
   * Se limpia al responder el comprador.
   */
  sellerEditBlockedUntilBuyerResponse?: boolean;
  /** El comprador llegó a aceptar al menos una vez; rechazar después implica riesgo para la confianza de la tienda (demo). */
  hadBuyerAcceptance?: boolean;
  /** Un acuerdo siempre declara servicios (modelo service-only). */
  includeService: boolean;
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
  /** Al menos un cobro exitoso exitoso para este acuerdo. */
  hasSucceededPayments?: boolean;
  /** Al menos un tramo de transporte cobrado con éxito. */
  hasSucceededRoutePayments?: boolean;
  /** Cláusulas adicionales (título + texto o adjunto) por bloque o legado combinado. */
  extraFields?: TradeAgreementExtraFieldDraft[];
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
  | "service"
  | "hasSucceededPayments"
  | "hasSucceededRoutePayments"
>;

/** Borrador del formulario: siempre incluye lista de servicios (puede estar vacía). */
export type TradeAgreementDraft = TradeAgreementDraftBase & {
  services: ServiceItem[];
};
