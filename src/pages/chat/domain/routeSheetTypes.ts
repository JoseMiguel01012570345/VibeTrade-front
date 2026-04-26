/** Hoja de rutas: seguimiento logístico de mercancías vinculable a contratos del chat. */

export type RouteSheetStatus =
  | 'borrador'
  | 'programada'
  | 'en_transito'
  | 'entregada'
  | 'cancelada'

/** Un tramo del recorrido (origen → destino) con datos logísticos. */
export type RouteStop = {
  id: string
  orden: number
  /** Origen del tramo (dirección o referencia) */
  origen: string
  /** Destino del tramo */
  destino: string
  /** Coordenadas origen (selección mapa en app completa; aquí texto) */
  origenLat?: string
  origenLng?: string
  /** Coordenadas destino */
  destinoLat?: string
  destinoLng?: string
  tiempoRecogidaEstimado?: string
  tiempoEntregaEstimado?: string
  /** Precio desglosado del transportista en este tramo */
  precioTransportista?: string
  /** Carga que transporta en el tramo */
  cargaEnTramo?: string
  tipoMercanciaCarga?: string
  tipoMercanciaDescarga?: string
  notas?: string
  /** Por tramo: responsabilidad por daños por embalaje */
  responsabilidadEmbalaje?: string
  /** Por tramo: frágil, refrigerado, ADR, etc. */
  requisitosEspeciales?: string
  /** Por tramo: tipo de vehículo requerido */
  tipoVehiculoRequerido?: string
  /** Teléfono del transportista asignado al tramo (p. ej. tras suscripción y aceptación). */
  telefonoTransportista?: string
  /** Moneda del precio / tarifa de este tramo (ej. USD, CUP). */
  monedaPago?: string
  completada?: boolean
  /**
   * Legado: datos antiguos con una sola «parada» / lugar.
   * Si origen/destino vacíos, la UI puede mostrar esto.
   */
  lugar?: string
  ventanaHoraria?: string
}

/** Acuse post-edición persistido en servidor (misma forma que en el hilo). */
export type RouteSheetEditAck = {
  revision: number
  byCarrier: Record<string, 'pending' | 'accepted' | 'rejected'>
}

export function routeSheetEditAcksRecordFromSheets(
  sheets: RouteSheet[] | undefined,
): Record<string, RouteSheetEditAck> {
  const out: Record<string, RouteSheetEditAck> = {}
  if (!sheets?.length) return out
  for (const sh of sheets) {
    if (sh.routeSheetEditAck) out[sh.id] = sh.routeSheetEditAck
  }
  return out
}

export type RouteSheet = {
  id: string
  threadId: string
  titulo: string
  creadoEn: number
  actualizadoEn: number
  estado: RouteSheetStatus
  /** Resumen de mercancías / bultos en esta ruta */
  mercanciasResumen: string
  paradas: RouteStop[]
  notasGenerales?: string
  /** Moneda en la que se abonan los tramos (ej. ARS, USD). */
  monedaPago?: string
  /** Publicada a transportistas vía plataforma (demo). */
  publicadaPlataforma?: boolean
  /** true tras guardar desde el formulario de edición; bloquea eliminar si sigue sin publicar. */
  editadaEnFormulario?: boolean
  /** Fuente de verdad en API para acuses de transportistas tras editar la hoja. */
  routeSheetEditAck?: RouteSheetEditAck
}

export type RouteSheetDraft = Omit<RouteSheet, 'id' | 'threadId' | 'creadoEn' | 'actualizadoEn'>

export function emptyRouteStop(orden: number): RouteStop {
  return {
    id: `stop_${orden}_${Math.random().toString(16).slice(2)}`,
    orden,
    origen: '',
    destino: '',
  }
}

export function defaultRouteSheetDraft(): Omit<
  RouteSheetDraft,
  'paradas'
> & { paradas: RouteStop[] } {
  return {
    titulo: '',
    estado: 'borrador',
    mercanciasResumen: '',
    notasGenerales: '',
    paradas: [emptyRouteStop(1), emptyRouteStop(2)],
  }
}

/** Datos de un tramo al crear/editar hoja (sin id/orden/completada). */
export type RouteTramoFormInput = {
  /** Id de la parada en edición; sin migración al crear tramos nuevos. */
  paradaId?: string
  origen: string
  destino: string
  /** Contacto del transportista elegido para este tramo. */
  telefonoTransportista?: string
  origenLat?: string
  origenLng?: string
  destinoLat?: string
  destinoLng?: string
  tiempoRecogidaEstimado?: string
  tiempoEntregaEstimado?: string
  precioTransportista?: string
  cargaEnTramo?: string
  tipoMercanciaCarga?: string
  tipoMercanciaDescarga?: string
  notas?: string
  responsabilidadEmbalaje?: string
  requisitosEspeciales?: string
  tipoVehiculoRequerido?: string
  /** Moneda de pago del precio de este tramo. */
  monedaPago?: string
}

export type RouteSheetCreatePayload = {
  titulo: string
  mercanciasResumen: string
  paradas: RouteTramoFormInput[]
  notasGenerales?: string
}

/** Tramo; mismo contrato que `RouteStopPayload` en el backend. */
export type RouteStopPayload = RouteStop

/**
 * Cuerpo PUT/GET `/api/v1/chat/threads/.../route-sheets`;
 * mismo contrato que `RouteSheetPayload` en el backend.
 */
export type RouteSheetPayload = RouteSheet

/** Resumen emergente para recomendaciones; mismo contrato que `EmergentRouteSheetSnapshot` en el backend. */
export type EmergentRouteLegSnapshot = {
  origen: string
  destino: string
  origenLat?: string
  origenLng?: string
  destinoLat?: string
  destinoLng?: string
  monedaPago?: string
}

export type EmergentRouteSheetSnapshot = {
  titulo: string
  mercanciasResumen: string
  monedaPago?: string
  paradas: EmergentRouteLegSnapshot[]
}

/** Datos viejos guardados a nivel hoja (antes de por-tramo). */
export type RouteSheetLegacyHead = {
  responsabilidadEmbalaje?: string
  requisitosEspeciales?: string
  tipoVehiculoRequerido?: string
}

/** Lee cabecera legada desde estado persistido (runtime). */
export function routeSheetLegacyHead(rs: RouteSheet): RouteSheetLegacyHead | undefined {
  const x = rs as RouteSheet & RouteSheetLegacyHead
  const a = x.responsabilidadEmbalaje?.trim()
  const b = x.requisitosEspeciales?.trim()
  const c = x.tipoVehiculoRequerido?.trim()
  if (!a && !b && !c) return undefined
  return {
    responsabilidadEmbalaje: x.responsabilidadEmbalaje,
    requisitosEspeciales: x.requisitosEspeciales,
    tipoVehiculoRequerido: x.tipoVehiculoRequerido,
  }
}

type OfferTramoPhoneHint = {
  telefonoTransportista?: string
  assignment?: { phone?: string } | null
}

/** Convierte paradas persistidas al formato del formulario de alta/edición. */
export function routeStopsToFormInputs(
  paradas: RouteStop[],
  legacyHead?: RouteSheetLegacyHead | null,
  offerTramosByStopId?: Map<string, OfferTramoPhoneHint>,
  /** Moneda a nivel hoja (datos viejos) repartida en el form si el tramo no trae su propia moneda. */
  sheetMonedaLegacy?: string | null,
): RouteTramoFormInput[] {
  const L = legacyHead ?? {}
  const leg = (sheetMonedaLegacy ?? '').trim()
  return paradas.map((p) => {
    const ot = offerTramosByStopId?.get(p.id)
    const telFromStop = p.telefonoTransportista?.trim() || ''
    const telFromOffer = ot?.telefonoTransportista?.trim() || ot?.assignment?.phone?.trim() || ''
    const mStop = p.monedaPago?.trim()
    return {
      paradaId: p.id,
      origen: p.origen?.trim() || p.lugar?.trim() || '',
      destino: p.destino?.trim() || '',
      origenLat: p.origenLat ?? '',
      origenLng: p.origenLng ?? '',
      destinoLat: p.destinoLat ?? '',
      destinoLng: p.destinoLng ?? '',
      tiempoRecogidaEstimado: p.tiempoRecogidaEstimado ?? '',
      tiempoEntregaEstimado: p.tiempoEntregaEstimado ?? '',
      precioTransportista: p.precioTransportista ?? '',
      cargaEnTramo: p.cargaEnTramo ?? '',
      tipoMercanciaCarga: p.tipoMercanciaCarga ?? '',
      tipoMercanciaDescarga: p.tipoMercanciaDescarga ?? '',
      notas: p.notas ?? '',
      responsabilidadEmbalaje: p.responsabilidadEmbalaje?.trim() || L.responsabilidadEmbalaje?.trim() || '',
      requisitosEspeciales: p.requisitosEspeciales?.trim() || L.requisitosEspeciales?.trim() || '',
      tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() || L.tipoVehiculoRequerido?.trim() || '',
      telefonoTransportista: telFromStop || telFromOffer,
      monedaPago: mStop || leg,
    }
  })
}

/** Una sola moneda si todos los tramos coinciden; si no, códigos distintos unidos. */
export function summarizeRouteSheetMonedaPago(
  paradas: { monedaPago?: string }[],
): string | undefined {
  const codes = paradas
    .map((p) => (p.monedaPago ?? '').trim())
    .filter(Boolean)
  if (codes.length === 0) return undefined
  const u = [...new Set(codes)]
  if (u.length === 1) return u[0]
  return u.join(' · ')
}

export function routeStatusLabel(s: RouteSheetStatus): string {
  switch (s) {
    case 'borrador':
      return 'Borrador'
    case 'programada':
      return 'Programada'
    case 'en_transito':
      return 'En tránsito'
    case 'entregada':
      return 'Entregada'
    case 'cancelada':
      return 'Cancelada'
    default:
      return s
  }
}

/** Texto legible de un tramo (compat. datos viejos con solo `lugar`). */
export function tramoResumenLinea(p: RouteStop): string {
  const o = p.origen?.trim()
  const d = p.destino?.trim()
  if (o || d) return `${o || '…'} → ${d || '…'}`
  if (p.lugar?.trim()) return p.lugar.trim()
  return 'Tramo sin datos'
}
