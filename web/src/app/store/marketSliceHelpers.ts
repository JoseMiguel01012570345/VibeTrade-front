import type { RouteSheet, RouteStop } from '../../pages/chat/domain/routeSheetTypes'
import type {
  RouteOfferPublicState,
  RouteOfferTramoPublic,
  StoreBadge,
  Thread,
} from './marketStoreTypes'

export function isOwnerOfStore(stores: Record<string, StoreBadge>, storeId: string, ownerUserId: string): boolean {
  const b = stores[storeId]
  return !!b?.ownerUserId && b.ownerUserId === ownerUserId
}

export function normStoreName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Tras editar la hoja en el hilo, mantiene asignaciones de transportistas en la oferta pública del feed. */
export function routeOfferPublicAfterSheetEdit(
  prev: Record<string, RouteOfferPublicState>,
  threadId: string,
  routeSheetId: string,
  sheet: RouteSheet,
): Record<string, RouteOfferPublicState> {
  let next = prev
  let touched = false
  for (const oid of Object.keys(prev)) {
    const ro = prev[oid]
    if (ro.threadId !== threadId || ro.routeSheetId !== routeSheetId) continue
    const assignByStop = new Map(ro.tramos.map((t) => [t.stopId, t.assignment]))
    const tramos: RouteOfferTramoPublic[] = sheet.paradas.map((p) => ({
      stopId: p.id,
      orden: p.orden,
      origenLine: p.origen,
      destinoLine: p.destino,
      cargaEnTramo: p.cargaEnTramo,
      tipoMercanciaCarga: p.tipoMercanciaCarga,
      tipoMercanciaDescarga: p.tipoMercanciaDescarga,
      tipoVehiculoRequerido: p.tipoVehiculoRequerido,
      tiempoRecogidaEstimado: p.tiempoRecogidaEstimado,
      tiempoEntregaEstimado: p.tiempoEntregaEstimado,
      precioTransportista: p.precioTransportista,
      notas: p.notas,
      requisitosEspeciales: p.requisitosEspeciales,
      telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
      assignment: assignByStop.get(p.id),
    }))
    if (!touched) {
      next = { ...prev }
      touched = true
    }
    next[oid] = {
      ...ro,
      routeTitle: sheet.titulo,
      mercanciasResumen: sheet.mercanciasResumen,
      notasGenerales: sheet.notasGenerales,
      hojaEstado: sheet.estado,
      tramos,
    }
  }
  return next
}

export function routeOfferTramosAllConfirmed(ro: RouteOfferPublicState | undefined): boolean {
  if (!ro?.tramos?.length) return false
  return ro.tramos.every((t) => t.assignment?.status === 'confirmed')
}

/** Bloquea borrar la hoja si algún tramo tiene transportista ya aceptado (confirmado). Las suscripciones solo pendientes no impiden eliminar. */
export function routeSheetHasPendingCarrierAck(th: Thread, routeSheetId: string): boolean {
  const ack = th.routeSheetEditAcks?.[routeSheetId]
  if (!ack) return false
  return Object.values(ack.byCarrier).some((v) => v === 'pending')
}

export function routeSheetHasConfirmedCarriers(
  routeOfferPublic: Record<string, RouteOfferPublicState>,
  th: Thread,
  routeSheetId: string,
): boolean {
  const ro = routeOfferPublic[th.offerId]
  if (!ro || ro.routeSheetId !== routeSheetId) return false
  return ro.tramos.some((t) => t.assignment?.status === 'confirmed')
}

/** Huella del tramo para saber si un transportista debe volver a acusar la hoja. */
export function routeStopAckFingerprint(p: RouteStop): string {
  return JSON.stringify({
    orden: p.orden,
    origen: (p.origen ?? '').trim(),
    destino: (p.destino ?? '').trim(),
    olat: (p.origenLat ?? '').trim(),
    olng: (p.origenLng ?? '').trim(),
    dlat: (p.destinoLat ?? '').trim(),
    dlng: (p.destinoLng ?? '').trim(),
    t1: (p.tiempoRecogidaEstimado ?? '').trim(),
    t2: (p.tiempoEntregaEstimado ?? '').trim(),
    pr: (p.precioTransportista ?? '').trim(),
    tel: (p.telefonoTransportista ?? '').trim(),
    cg: (p.cargaEnTramo ?? '').trim(),
    tmc: (p.tipoMercanciaCarga ?? '').trim(),
    tmd: (p.tipoMercanciaDescarga ?? '').trim(),
    no: (p.notas ?? '').trim(),
    re: (p.responsabilidadEmbalaje ?? '').trim(),
    rq: (p.requisitosEspeciales ?? '').trim(),
    ve: (p.tipoVehiculoRequerido ?? '').trim(),
  })
}

/** Transportistas con asignación confirmada cuyo tramo (mismo stopId) cambió o desapareció de la hoja. */
export function carrierUserIdsAffectedByRouteSheetParadas(
  ro: RouteOfferPublicState | undefined,
  routeSheetId: string,
  existingSheet: RouteSheet,
  newParadas: RouteStop[],
): Set<string> {
  const affected = new Set<string>()
  if (!ro || ro.routeSheetId !== routeSheetId) return affected

  const oldById = new Map(existingSheet.paradas.map((p) => [p.id, p]))
  const newById = new Map(newParadas.map((p) => [p.id, p]))

  for (const t of ro.tramos) {
    const a = t.assignment
    if (!a || a.status !== 'confirmed') continue
    const oldP = oldById.get(t.stopId)
    const newP = newById.get(t.stopId)
    if (!oldP || !newP) {
      affected.add(a.userId)
      continue
    }
    if (routeStopAckFingerprint(oldP) !== routeStopAckFingerprint(newP)) {
      affected.add(a.userId)
    }
  }
  return affected
}

/** userIds con al menos un tramo confirmado en esta oferta (misma hoja). */
export function confirmedCarrierIdsOnOffer(ro: RouteOfferPublicState | undefined, routeSheetId: string): Set<string> {
  const ids = new Set<string>()
  if (!ro || ro.routeSheetId !== routeSheetId) return ids
  for (const t of ro.tramos) {
    const a = t.assignment
    if (a?.status === 'confirmed') ids.add(a.userId)
  }
  return ids
}
