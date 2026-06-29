/** Hoja de rutas: seguimiento logístico de mercancías vinculable a contratos del chat. */

import type {
  RouteSheet,
  RouteSheetDraft,
  RouteSheetEditAck,
  RouteSheetLegacyHead,
  RouteSheetStatus,
  RouteStop,
  RouteTramoFormInput,
} from '@features/chat/Dtos/route-sheet/routeSheetTypes';

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
      transportInvitedStoreServiceId: p.transportInvitedStoreServiceId?.trim() || undefined,
      transportInvitedServiceSummary: p.transportInvitedServiceSummary?.trim() || undefined,
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

export function routeSheetEstadoIsEntregada(
  estado: RouteSheetStatus | string | undefined,
): boolean {
  return (estado ?? '').trim().toLowerCase() === 'entregada'
}

/** Texto legible de un tramo (compat. datos viejos con solo `lugar`). */
export function tramoResumenLinea(p: RouteStop): string {
  const o = p.origen?.trim()
  const d = p.destino?.trim()
  if (o || d) return `${o || '…'} → ${d || '…'}`
  if (p.lugar?.trim()) return p.lugar.trim()
  return 'Tramo sin datos'
}
