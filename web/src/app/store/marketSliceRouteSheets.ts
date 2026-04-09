import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  normalizeRouteSheetParadas,
} from '../../pages/chat/domain/routeSheetValidation'
import type { RouteSheet, RouteStop } from '../../pages/chat/domain/routeSheetTypes'
import type { Message } from './marketStoreTypes'
import { threadHasAcceptedAgreement } from './marketStoreTypes'
import {
  stripLegacyRouteSheetHead,
  routeSheetIdsLinkedToContracts,
  threadIsActionLocked,
  uid,
} from './marketStoreHelpers'
import {
  routeOfferPublicAfterSheetEdit,
  routeOfferTramosAllConfirmed,
  routeSheetHasConfirmedCarriers,
  routeSheetHasPendingCarrierAck,
  carrierUserIdsAffectedByRouteSheetParadas,
  confirmedCarrierIdsOnOffer,
} from './marketSliceHelpers'
import type { MarketSliceGet, MarketSliceSet } from './marketSliceTypes'
import type { MarketState } from './marketStoreTypes'

export function createRouteSheetsSlice(set: MarketSliceSet, get: MarketSliceGet): Pick<MarketState,
  | 'createRouteSheet'
  | 'updateRouteSheet'
  | 'setRouteSheetStatus'
  | 'toggleRouteStop'
  | 'publishRouteSheetsToPlatform'
  | 'linkAgreementToRouteSheet'
  | 'unlinkAgreementFromRouteSheet'
  | 'deleteRouteSheet'
> {
  return {
createRouteSheet: (threadId, payload) => {
  const th0 = get().threads[threadId]
  if (threadIsActionLocked(th0)) return null
  if (!th0 || !threadHasAcceptedAgreement(th0)) return null
  const nContracts = th0.contracts?.length ?? 0
  const nSheets = th0.routeSheets?.length ?? 0
  if (nSheets >= nContracts) return null
  if (hasRouteSheetFormErrors(getRouteSheetFormErrors(payload))) return null
  const paradasNorm = normalizeRouteSheetParadas(payload.paradas)
  if (paradasNorm.length === 0) return null
  const titulo = payload.titulo.trim()
  const merc = payload.mercanciasResumen.trim()
  const paradas: RouteStop[] = paradasNorm
    .map((p, i) => ({
      id: uid('stop'),
      orden: i + 1,
      origen: p.origen.trim(),
      destino: p.destino.trim(),
      origenLat: p.origenLat?.trim() || undefined,
      origenLng: p.origenLng?.trim() || undefined,
      destinoLat: p.destinoLat?.trim() || undefined,
      destinoLng: p.destinoLng?.trim() || undefined,
      tiempoRecogidaEstimado: p.tiempoRecogidaEstimado?.trim() || undefined,
      tiempoEntregaEstimado: p.tiempoEntregaEstimado?.trim() || undefined,
      precioTransportista: p.precioTransportista?.trim() || undefined,
      cargaEnTramo: p.cargaEnTramo?.trim() || undefined,
      tipoMercanciaCarga: p.tipoMercanciaCarga?.trim() || undefined,
      tipoMercanciaDescarga: p.tipoMercanciaDescarga?.trim() || undefined,
      notas: p.notas?.trim() || undefined,
      responsabilidadEmbalaje: p.responsabilidadEmbalaje?.trim() || undefined,
      requisitosEspeciales: p.requisitosEspeciales?.trim() || undefined,
      tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() || undefined,
      telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
      completada: false,
    }))
  const rid = uid('ruta')
  const now = Date.now()
  const sheet: RouteSheet = {
    id: rid,
    threadId,
    titulo,
    creadoEn: now,
    actualizadoEn: now,
    estado: 'borrador',
    mercanciasResumen: merc,
    paradas,
    notasGenerales: payload.notasGenerales?.trim() || undefined,
    publicadaPlataforma: false,
    editadaEnFormulario: false,
  }
  set((s) => {
    const th = s.threads[threadId]
    if (!th || threadIsActionLocked(th)) return s
    const nc = th.contracts?.length ?? 0
    const ns = th.routeSheets?.length ?? 0
    if (ns >= nc) return s
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          routeSheets: [...(th.routeSheets ?? []), sheet],
        },
      },
    }
  })
  return rid
},

updateRouteSheet: (threadId, routeSheetId, payload) => {
  const thGuard = get().threads[threadId]
  if (threadIsActionLocked(thGuard)) return false
  if (thGuard && routeSheetHasPendingCarrierAck(thGuard, routeSheetId)) return false
  if (hasRouteSheetFormErrors(getRouteSheetFormErrors(payload))) return false
  const paradasNorm = normalizeRouteSheetParadas(payload.paradas)
  if (paradasNorm.length === 0) return false
  const titulo = payload.titulo.trim()
  const merc = payload.mercanciasResumen.trim()
  const built = paradasNorm
    .map((p, i) => ({
      id: uid('stop'),
      orden: i + 1,
      origen: p.origen.trim(),
      destino: p.destino.trim(),
      origenLat: p.origenLat?.trim() || undefined,
      origenLng: p.origenLng?.trim() || undefined,
      destinoLat: p.destinoLat?.trim() || undefined,
      destinoLng: p.destinoLng?.trim() || undefined,
      tiempoRecogidaEstimado: p.tiempoRecogidaEstimado?.trim() || undefined,
      tiempoEntregaEstimado: p.tiempoEntregaEstimado?.trim() || undefined,
      precioTransportista: p.precioTransportista?.trim() || undefined,
      cargaEnTramo: p.cargaEnTramo?.trim() || undefined,
      tipoMercanciaCarga: p.tipoMercanciaCarga?.trim() || undefined,
      tipoMercanciaDescarga: p.tipoMercanciaDescarga?.trim() || undefined,
      notas: p.notas?.trim() || undefined,
      responsabilidadEmbalaje: p.responsabilidadEmbalaje?.trim() || undefined,
      requisitosEspeciales: p.requisitosEspeciales?.trim() || undefined,
      tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() || undefined,
      telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
      completada: false as boolean | undefined,
    }))
  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th?.routeSheets || threadIsActionLocked(th)) return s
    const idx = th.routeSheets.findIndex((rs) => rs.id === routeSheetId)
    if (idx < 0) return s
    const existing = th.routeSheets[idx]
    const paradas: RouteStop[] = built.map((p, i) => ({
      ...p,
      id: existing.paradas[i]?.id ?? p.id,
      completada: existing.paradas[i]?.completada ?? false,
    }))
    const now = Date.now()
    const sheet: RouteSheet = {
      ...stripLegacyRouteSheetHead(existing),
      titulo,
      mercanciasResumen: merc,
      paradas,
      notasGenerales: payload.notasGenerales?.trim() || undefined,
      actualizadoEn: now,
      editadaEnFormulario: true,
    }
    const list = [...th.routeSheets]
    list[idx] = sheet
    const ro0 = th.offerId ? s.routeOfferPublic[th.offerId] : undefined
    const affectedCarriers = carrierUserIdsAffectedByRouteSheetParadas(ro0, routeSheetId, existing, paradas)
    const assignedOnSheet = confirmedCarrierIdsOnOffer(ro0, routeSheetId)

    let routeSheetEditAcks = th.routeSheetEditAcks ?? {}
    if (affectedCarriers.size > 0 && assignedOnSheet.size > 0) {
      const prevAck = routeSheetEditAcks[routeSheetId]
      const prevBy = prevAck?.byCarrier ?? {}
      const prevRev = prevAck?.revision ?? 0
      const nextBy: Record<string, 'pending' | 'accepted' | 'rejected'> = {}
      for (const uid of assignedOnSheet) {
        if (affectedCarriers.has(uid)) {
          nextBy[uid] = 'pending'
        } else {
          nextBy[uid] = prevBy[uid] === 'pending' ? 'pending' : (prevBy[uid] ?? 'accepted')
        }
      }
      routeSheetEditAcks = {
        ...routeSheetEditAcks,
        [routeSheetId]: { revision: prevRev + 1, byCarrier: nextBy },
      }
    }
    const sysEdit: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text:
        affectedCarriers.size > 0 ?
          `Hoja de ruta «${titulo}» editada. Los transportistas cuyo tramo cambió deben aceptar o rechazar la versión actual en la pestaña Rutas (demo).`
        : `Hoja de ruta «${titulo}» editada.`,
      at: now,
    }
    ok = true
    return {
      ...s,
      routeOfferPublic: routeOfferPublicAfterSheetEdit(
        s.routeOfferPublic,
        threadId,
        routeSheetId,
        sheet,
      ),
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          routeSheets: list,
          routeSheetEditAcks,
          messages: [...th.messages, sysEdit],
        },
      },
    }
  })
  return ok
},

setRouteSheetStatus: (threadId, routeSheetId, estado) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th?.routeSheets || threadIsActionLocked(th)) return s
    const list = th.routeSheets.map((rs) =>
      rs.id === routeSheetId
        ? { ...rs, estado, actualizadoEn: Date.now() }
        : rs,
    )
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: { ...th, routeSheets: list },
      },
    }
  })
},

toggleRouteStop: (threadId, routeSheetId, stopId) => {
  set((s) => {
    const th = s.threads[threadId]
    if (!th?.routeSheets || threadIsActionLocked(th)) return s
    const list = th.routeSheets.map((rs) => {
      if (rs.id !== routeSheetId) return rs
      return {
        ...rs,
        actualizadoEn: Date.now(),
        paradas: rs.paradas.map((p) =>
          p.id === stopId ? { ...p, completada: !p.completada } : p,
        ),
      }
    })
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: { ...th, routeSheets: list },
      },
    }
  })
},

publishRouteSheetsToPlatform: (threadId, routeSheetIds) => {
  const idSet = new Set(routeSheetIds)
  set((s) => {
    const th = s.threads[threadId]
    const sheets = th?.routeSheets
    if (!th || threadIsActionLocked(th) || !sheets?.length) return s
    const linked = routeSheetIdsLinkedToContracts(th)
    const allowedArr = [...idSet].filter((id) => linked.has(id))
    if (allowedArr.length === 0) return s
    const ro = s.routeOfferPublic[th.offerId]
    const now = Date.now()
    const extraMsgs: Message[] = []
    const list = sheets.map((rs) => {
      if (!allowedArr.includes(rs.id)) return rs
      if (!rs.publicadaPlataforma) {
        extraMsgs.push({
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: `Hoja de ruta «${rs.titulo}» publicada en la plataforma. Los transportistas pueden suscribirse por tramo (demo).`,
          at: now,
        })
        return { ...rs, publicadaPlataforma: true, actualizadoEn: now }
      }
      if (ro?.routeSheetId === rs.id && !routeOfferTramosAllConfirmed(ro)) {
        extraMsgs.push({
          id: uid('m'),
          from: 'system',
          type: 'text',
          text: `Hoja de ruta «${rs.titulo}» republicada en la plataforma mientras queden tramos por cubrir (demo).`,
          at: now,
        })
        return { ...rs, actualizadoEn: now }
      }
      return rs
    })
    if (extraMsgs.length === 0) return s
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          routeSheets: list,
          messages: [...th.messages, ...extraMsgs],
        },
      },
    }
  })
},

linkAgreementToRouteSheet: (threadId, agreementId, routeSheetId) => {
  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    const contracts = th.contracts ?? []
    const sheets = th.routeSheets ?? []
    if (!th || threadIsActionLocked(th) || !contracts.length || !sheets.length) return s
    const sheet = sheets.find((r) => r.id === routeSheetId)
    if (!sheet) return s
    const cIdx = contracts.findIndex((c) => c.id === agreementId)
    if (cIdx < 0) return s
    const prev = contracts[cIdx]
    if (prev.routeSheetId === routeSheetId) return s
    const nextContracts = [...contracts]
    nextContracts[cIdx] = { ...prev, routeSheetId }
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `Acuerdo «${prev.title}» vinculado a la hoja de ruta «${sheet.titulo}».`,
      at: Date.now(),
    }
    ok = true
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          contracts: nextContracts,
          messages: [...th.messages, sys],
          routeSheets: th.routeSheets ?? [],
        },
      },
    }
  })
  return ok
},

unlinkAgreementFromRouteSheet: (threadId, agreementId) => {
  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    const contracts = th.contracts ?? []
    const sheets = th.routeSheets ?? []
    if (!th || threadIsActionLocked(th) || !contracts.length) return s
    const cIdx = contracts.findIndex((c) => c.id === agreementId)
    if (cIdx < 0) return s
    const prev = contracts[cIdx]
    const rid = prev.routeSheetId
    if (!rid) return s
    const sheet = sheets.find((r) => r.id === rid)
    if (sheet?.publicadaPlataforma) return s
    const nextContracts = [...contracts]
    nextContracts[cIdx] = { ...prev, routeSheetId: undefined }
    const titulo = sheet?.titulo ?? 'hoja de ruta'
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `Acuerdo «${prev.title}» desvinculado de la hoja de ruta «${titulo}».`,
      at: Date.now(),
    }
    ok = true
    return {
      ...s,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          contracts: nextContracts,
          messages: [...th.messages, sys],
          routeSheets: th.routeSheets ?? [],
        },
      },
    }
  })
  return ok
},

deleteRouteSheet: (threadId, routeSheetId) => {
  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th?.routeSheets?.length || threadIsActionLocked(th)) return s
    const sheet = th.routeSheets.find((r) => r.id === routeSheetId)
    if (!sheet) return s
    if (routeSheetHasConfirmedCarriers(s.routeOfferPublic, th, routeSheetId)) return s
    const list = th.routeSheets.filter((r) => r.id !== routeSheetId)
    const contracts = (th.contracts ?? []).map((c) =>
      c.routeSheetId === routeSheetId ? { ...c, routeSheetId: undefined } : c,
    )
    let routeOfferPublic = s.routeOfferPublic
    const ro = s.routeOfferPublic[th.offerId]
    if (ro?.routeSheetId === routeSheetId) {
      routeOfferPublic = { ...s.routeOfferPublic }
      delete routeOfferPublic[th.offerId]
    }
    const routeSheetEditAcks = { ...(th.routeSheetEditAcks ?? {}) }
    delete routeSheetEditAcks[routeSheetId]
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `Se eliminó la hoja de ruta «${sheet.titulo}».`,
      at: Date.now(),
    }
    ok = true
    return {
      ...s,
      routeOfferPublic,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          routeSheets: list,
          contracts,
          routeSheetEditAcks,
          messages: [...th.messages, sys],
        },
      },
    }
  })
  return ok
},
  }
}
