/** Modelo de acuerdo comercial (formulario emitido por el vendedor, aceptación del comprador). */

export type MerchandiseCondition = 'nuevo' | 'usado' | 'reacondicionado'

export type MerchandiseLine = {
  tipo: string
  cantidad: string
  valorUnitario: string
  estado: MerchandiseCondition
  descuento: string
  impuestos: string
  moneda: string
  tipoEmbalaje: string
  devolucionesDesc: string
  devolucionQuienPaga: string
  devolucionPlazos: string
  regulaciones: string
}

/** Legado: antes las condiciones iban una sola vez a nivel bloque; ya no se emite desde el formulario. */
export type MerchandiseSectionMeta = {
  moneda: string
  tipoEmbalaje: string
  devolucionesDesc: string
  devolucionQuienPaga: string
  devolucionPlazos: string
  regulaciones: string
}

export type ServiceAgreementBlock = {
  tipoServicio: string
  tiempoInicioFin: string
  horariosFechas: string
  recurrenciaPagos: string
  descripcion: string
  riesgos: string
  incluye: string
  noIncluye: string
  dependencias: string
  entregables: string
  garantias: string
  penalAtraso: string
  terminacionAnticipada: string
  avisoDias: string
  metodoPago: string
  moneda: string
  medicionCumplimiento: string
  penalIncumplimiento: string
  nivelResponsabilidad: string
  propIntelectual: string
}

export type AgreementStatus = 'pending_buyer' | 'accepted' | 'rejected'

export type TradeAgreement = {
  id: string
  threadId: string
  title: string
  issuedAt: number
  issuedByStoreId: string
  issuerLabel: string
  status: AgreementStatus
  respondedAt?: number
  /** Si el acuerdo declara el bloque de mercancías (al menos uno de mercancías/servicio debe ser true). */
  includeMerchandise: boolean
  /** Si el acuerdo declara el bloque de servicios. */
  includeService: boolean
  merchandise: MerchandiseLine[]
  /** Solo lectura / datos antiguos (una cabecera para todo el bloque). */
  merchandiseMeta?: MerchandiseSectionMeta
  service: ServiceAgreementBlock
  /** Solo lectura / legado: ya no se asigna desde el formulario de acuerdo. */
  routeSheetId?: string
  /** Solo lectura: datos antiguos; ya no se emite desde el formulario. */
  routeSheetUrl?: string
}

export type TradeAgreementDraft = Omit<
  TradeAgreement,
  | 'id'
  | 'threadId'
  | 'issuedAt'
  | 'issuedByStoreId'
  | 'issuerLabel'
  | 'status'
  | 'respondedAt'
  | 'routeSheetUrl'
  | 'routeSheetId'
  | 'merchandiseMeta'
>

export function emptyMerchandiseLine(): MerchandiseLine {
  return {
    tipo: '',
    cantidad: '',
    valorUnitario: '',
    estado: 'nuevo',
    descuento: '',
    impuestos: '',
    moneda: '',
    tipoEmbalaje: '',
    devolucionesDesc: '',
    devolucionQuienPaga: '',
    devolucionPlazos: '',
    regulaciones: '',
  }
}

/** Completa claves faltantes (p. ej. datos persistidos antes del modelo por ítem). */
export function normalizeMerchandiseLine(line: Partial<MerchandiseLine>): MerchandiseLine {
  return {
    ...emptyMerchandiseLine(),
    ...line,
    estado: line.estado ?? 'nuevo',
  }
}

export function emptyMerchandiseMeta(): MerchandiseSectionMeta {
  return {
    moneda: '',
    tipoEmbalaje: '',
    devolucionesDesc: '',
    devolucionQuienPaga: '',
    devolucionPlazos: '',
    regulaciones: '',
  }
}

export function emptyServiceBlock(): ServiceAgreementBlock {
  return {
    tipoServicio: '',
    tiempoInicioFin: '',
    horariosFechas: '',
    recurrenciaPagos: '',
    descripcion: '',
    riesgos: '',
    incluye: '',
    noIncluye: '',
    dependencias: '',
    entregables: '',
    garantias: '',
    penalAtraso: '',
    terminacionAnticipada: '',
    avisoDias: '',
    metodoPago: '',
    moneda: '',
    medicionCumplimiento: '',
    penalIncumplimiento: '',
    nivelResponsabilidad: '',
    propIntelectual: '',
  }
}

export function defaultAgreementDraft(): TradeAgreementDraft {
  return {
    title: '',
    includeMerchandise: true,
    includeService: true,
    merchandise: [emptyMerchandiseLine()],
    service: emptyServiceBlock(),
  }
}

/** Compatibilidad: acuerdos sin flag se tratan como ambos bloques incluidos. */
export function agreementDeclaresMerchandise(a: Pick<TradeAgreement, 'includeMerchandise'>): boolean {
  return a.includeMerchandise !== false
}

export function agreementDeclaresService(a: Pick<TradeAgreement, 'includeService'>): boolean {
  return a.includeService !== false
}
