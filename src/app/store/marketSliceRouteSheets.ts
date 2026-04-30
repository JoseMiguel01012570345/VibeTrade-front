import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  normalizeRouteSheetParadas,
} from '../../pages/chat/domain/routeSheetValidation'
import {
  type RouteSheet,
  type RouteStop,
  routeSheetEditAcksRecordFromSheets,
  summarizeRouteSheetMonedaPago,
} from '../../pages/chat/domain/routeSheetTypes'
import { agreementHasMerchandiseForRouteLink } from '../../pages/chat/domain/tradeAgreementValidation'
import type { Message, MarketState } from './marketStoreTypes'
import { threadHasAcceptedAgreement } from './marketStoreTypes'
import {
  stripLegacyRouteSheetHead,
  routeSheetIdsLinkedToContracts,
  routeSheetIdsLockedByPaidAgreements,
  threadIsActionLocked,
  uid,
} from './marketStoreHelpers'
import {
  routeOfferPublicAfterSheetEdit,
  routeOfferTramosAllConfirmed,
  routeSheetHasPendingCarrierAck,
  carrierUserIdsAffectedByRouteSheetParadas,
  confirmedCarrierIdsOnOffer,
  assignedCarrierUserIdsOnOffer,
  buildRouteSheetEditSystemMessage,
} from './marketSliceHelpers'
import { useAppStore } from './useAppStore'
import { SELLER_TRUST_PENALTY_ON_EDIT } from '../../pages/chat/components/modals/TrustRiskEditConfirmModal'
import type { MarketSliceGet, MarketSliceSet } from './marketSliceTypes'
import {
  deleteThreadRouteSheet,
  fetchThreadRouteSheets,
  fetchThreadRouteTramoSubscriptions,
  patchThreadTradeAgreementRouteLink,
  putThreadRouteSheet,
} from '../../utils/chat/chatApi'
import { getSessionToken } from '../../utils/http/sessionToken'
import { mapTradeAgreementApiToTradeAgreement } from '../../utils/chat/tradeAgreementApiMapper'

export function createRouteSheetsSlice(set: MarketSliceSet, get: MarketSliceGet): Pick<MarketState,
  | 'createRouteSheet'
  | 'updateRouteSheet'
  | 'setRouteSheetStatus'
  | 'toggleRouteStop'
  | 'publishRouteSheetsToPlatform'
  | 'unpublishRouteSheetFromPlatform'
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
      transportInvitedStoreServiceId: p.transportInvitedStoreServiceId?.trim() || undefined,
      transportInvitedServiceSummary: p.transportInvitedServiceSummary?.trim() || undefined,
      monedaPago: p.monedaPago?.trim() || undefined,
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
    monedaPago: summarizeRouteSheetMonedaPago(paradas),
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
  if (threadId.startsWith('cth_') && getSessionToken()) {
    const th = get().threads[threadId]
    const created = th?.routeSheets?.find((r) => r.id === rid)
    if (created) void putThreadRouteSheet(threadId, created).catch(() => {})
  }
  return rid
},

updateRouteSheet: (threadId, routeSheetId, payload) => {
  const thGuard = get().threads[threadId]
  if (threadIsActionLocked(thGuard)) return false
  if (
    thGuard &&
    routeSheetIdsLockedByPaidAgreements(thGuard).has(routeSheetId)
  )
    return false
  if (thGuard && routeSheetHasPendingCarrierAck(thGuard, routeSheetId)) return false
  if (hasRouteSheetFormErrors(getRouteSheetFormErrors(payload))) return false
  const paradasNorm = normalizeRouteSheetParadas(payload.paradas)
  if (paradasNorm.length === 0) return false
  const titulo = payload.titulo.trim()
  const merc = payload.mercanciasResumen.trim()
  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th?.routeSheets || threadIsActionLocked(th)) return s
    const idx = th.routeSheets.findIndex((rs) => rs.id === routeSheetId)
    if (idx < 0) return s
    const existing = th.routeSheets[idx]
    const paradas: RouteStop[] = paradasNorm.map((p, i) => {
      const paradaId = p.paradaId?.trim()
      const existingStop =
        paradaId && paradaId.length > 0
          ? existing.paradas.find((st) => (st.id ?? '').trim() === paradaId)
          : undefined
      const id = existingStop?.id ?? uid('stop')
      return {
        id,
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
        transportInvitedStoreServiceId: p.transportInvitedStoreServiceId?.trim() || undefined,
        transportInvitedServiceSummary: p.transportInvitedServiceSummary?.trim() || undefined,
        monedaPago: p.monedaPago?.trim() || undefined,
        completada: existingStop?.completada ?? false,
      }
    })
    const now = Date.now()
    const sheet: RouteSheet = {
      ...stripLegacyRouteSheetHead(existing),
      titulo,
      mercanciasResumen: merc,
      paradas,
      notasGenerales: payload.notasGenerales?.trim() || undefined,
      monedaPago: summarizeRouteSheetMonedaPago(paradas),
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
    const persistChat = threadId.startsWith('cth_') && getSessionToken()
    const sysEdit: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: buildRouteSheetEditSystemMessage(titulo, ro0, routeSheetId, existing, paradas),
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
          ...(persistChat ? {} : { messages: [...th.messages, sysEdit] }),
        },
      },
    }
  })
  if (ok && threadId.startsWith('cth_') && getSessionToken()) {
    const th = get().threads[threadId]
    const sheet = th?.routeSheets?.find((r) => r.id === routeSheetId)
    if (sheet) {
      void (async () => {
        try {
          await putThreadRouteSheet(threadId, sheet)
          const sheets = await fetchThreadRouteSheets(threadId)
          const acks = routeSheetEditAcksRecordFromSheets(sheets as RouteSheet[])
          set((s) => {
            const t = s.threads[threadId]
            if (!t) return s
            return {
              ...s,
              threads: {
                ...s.threads,
                [threadId]: {
                  ...t,
                  routeSheets: sheets as RouteSheet[],
                  routeSheetEditAcks: { ...(t.routeSheetEditAcks ?? {}), ...acks },
                },
              },
            }
          })
        } catch {
          /* red / validación servidor */
        }
      })()
    }
  }
  return ok
},

setRouteSheetStatus: (threadId, routeSheetId, estado) => {
  const thG = get().threads[threadId]
  if (
    thG &&
    routeSheetIdsLockedByPaidAgreements(thG).has(routeSheetId)
  )
    return
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
  if (threadId.startsWith('cth_') && getSessionToken()) {
    const sh = get().threads[threadId]?.routeSheets?.find((r) => r.id === routeSheetId)
    if (sh) void putThreadRouteSheet(threadId, sh).catch(() => {})
  }
},

toggleRouteStop: (threadId, routeSheetId, stopId) => {
  const thG = get().threads[threadId]
  if (
    thG &&
    routeSheetIdsLockedByPaidAgreements(thG).has(routeSheetId)
  )
    return
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
  if (threadId.startsWith('cth_') && getSessionToken()) {
    const sh = get().threads[threadId]?.routeSheets?.find((r) => r.id === routeSheetId)
    if (sh) void putThreadRouteSheet(threadId, sh).catch(() => {})
  }
},

publishRouteSheetsToPlatform: (threadId, routeSheetIds) => {
  const idSet = new Set(routeSheetIds)
  let toSync: RouteSheet[] = []
  set((s) => {
    const th = s.threads[threadId]
    const sheets = th?.routeSheets
    if (!th || threadIsActionLocked(th) || !sheets?.length) return s
    const linked = routeSheetIdsLinkedToContracts(th)
    const paidLocked = routeSheetIdsLockedByPaidAgreements(th)
    const allowedArr = [...idSet].filter(
      (id) => linked.has(id) && !paidLocked.has(id),
    )
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
    toSync = list.filter((rs) => allowedArr.includes(rs.id))
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
  if (toSync.length > 0 && threadId.startsWith('cth_') && getSessionToken()) {
    for (const sh of toSync) void putThreadRouteSheet(threadId, sh).catch(() => {})
  }
},

unpublishRouteSheetFromPlatform: (threadId, routeSheetId) => {
  const thG = get().threads[threadId]
  if (
    thG &&
    routeSheetIdsLockedByPaidAgreements(thG).has(routeSheetId)
  )
    return
  let toSync: RouteSheet | null = null
  set((s) => {
    const th = s.threads[threadId]
    const sheets = th?.routeSheets
    if (!th || threadIsActionLocked(th) || !sheets?.length) return s
    const rs = sheets.find((r) => r.id === routeSheetId)
    if (!rs?.publicadaPlataforma) return s
    const now = Date.now()
    const msg: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `Hoja de ruta «${rs.titulo}» retirada de la plataforma.`,
      at: now,
    }
    const list = sheets.map((r) =>
      r.id === routeSheetId
        ? { ...r, publicadaPlataforma: false, actualizadoEn: now }
        : r,
    )
    let routeOfferPublic = s.routeOfferPublic
    const ro = s.routeOfferPublic[th.offerId]
    if (ro?.routeSheetId === routeSheetId) {
      routeOfferPublic = { ...s.routeOfferPublic }
      delete routeOfferPublic[th.offerId]
    }
    toSync = list.find((r) => r.id === routeSheetId) ?? null
    return {
      ...s,
      routeOfferPublic,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          routeSheets: list,
          messages: [...th.messages, msg],
        },
      },
    }
  })
  if (toSync && threadId.startsWith('cth_') && getSessionToken()) {
    void putThreadRouteSheet(threadId, toSync).catch(() => {})
  }
},

linkAgreementToRouteSheet: async (threadId, agreementId, routeSheetId) => {
  const th0 = get().threads[threadId]
  const contracts0 = th0?.contracts ?? []
  const sheets0 = th0?.routeSheets ?? []
  if (!th0 || threadIsActionLocked(th0) || !contracts0.length || !sheets0.length) return false
  const sheet0 = sheets0.find((r) => r.id === routeSheetId)
  if (!sheet0) return false
  const prev0 = contracts0.find((c) => c.id === agreementId)
  if (!prev0 || prev0.status === 'deleted') return false
  if (!agreementHasMerchandiseForRouteLink(prev0)) {
    throw new Error(
      'Solo podés vincular una hoja de ruta si el acuerdo incluye mercancía con al menos una línea con cantidad, precio unitario y moneda válidos.',
    )
  }
  if (prev0.routeSheetId === routeSheetId) return true

  const applyLocal = () => {
    set((s) => {
      const th = s.threads[threadId]
      const contracts = th?.contracts ?? []
      const sheets = th?.routeSheets ?? []
      if (!th || threadIsActionLocked(th)) return s
      const sheet = sheets.find((r) => r.id === routeSheetId)
      if (!sheet) return s
      const cIdx = contracts.findIndex((c) => c.id === agreementId)
      if (cIdx < 0) return s
      const prev = contracts[cIdx]
      if (prev.status === 'deleted' || prev.routeSheetId === routeSheetId) return s
      const nextContracts = [...contracts]
      nextContracts[cIdx] = { ...prev, routeSheetId }
      const sys: Message = {
        id: uid('m'),
        from: 'system',
        type: 'text',
        text: `Acuerdo «${prev.title}» vinculado a la hoja de ruta «${sheet.titulo}».`,
        at: Date.now(),
      }
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
  }

  if (!threadId.startsWith('cth_') || !getSessionToken()) {
    applyLocal()
    return true
  }

  try {
    const dto = await patchThreadTradeAgreementRouteLink(
      threadId,
      agreementId,
      routeSheetId,
    )
    const mapped = mapTradeAgreementApiToTradeAgreement(dto)
    set((s) => {
      const th = s.threads[threadId]
      if (!th) return s
      const list = th.contracts ?? []
      const i = list.findIndex((c) => c.id === agreementId)
      if (i < 0) return s
      const next = [...list]
      next[i] = mapped
      const sys: Message = {
        id: uid('m'),
        from: 'system',
        type: 'text',
        text: `Acuerdo «${prev0.title}» vinculado a la hoja de ruta «${sheet0.titulo}».`,
        at: Date.now(),
      }
      return {
        ...s,
        threads: {
          ...s.threads,
          [threadId]: {
            ...th,
            contracts: next,
            messages: [...th.messages, sys],
          },
        },
      }
    })
    return true
  } catch (e) {
    if (e instanceof Error) throw e
    return false
  }
},

unlinkAgreementFromRouteSheet: async (threadId, agreementId) => {
  const th0 = get().threads[threadId]
  const contracts0 = th0?.contracts ?? []
  const sheets0 = th0?.routeSheets ?? []
  if (!th0 || threadIsActionLocked(th0) || !contracts0.length) return false
  const prev0 = contracts0.find((c) => c.id === agreementId)
  if (!prev0 || prev0.status === 'deleted' || !prev0.routeSheetId) return false
  const sheet0 = sheets0.find((r) => r.id === prev0.routeSheetId)
  if (sheet0?.publicadaPlataforma) return false

  const applyLocal = () => {
    set((s) => {
      const th = s.threads[threadId]
      const contracts = th?.contracts ?? []
      const sheets = th?.routeSheets ?? []
      if (!th || threadIsActionLocked(th)) return s
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
  }

  if (!threadId.startsWith('cth_') || !getSessionToken()) {
    applyLocal()
    return true
  }

  try {
    const dto = await patchThreadTradeAgreementRouteLink(
      threadId,
      agreementId,
      null,
    )
    const mapped = mapTradeAgreementApiToTradeAgreement(dto)
    set((s) => {
      const th = s.threads[threadId]
      if (!th) return s
      const list = th.contracts ?? []
      const i = list.findIndex((c) => c.id === agreementId)
      if (i < 0) return s
      const next = [...list]
      next[i] = mapped
      const titulo = sheet0?.titulo ?? 'hoja de ruta'
      const sys: Message = {
        id: uid('m'),
        from: 'system',
        type: 'text',
        text: `Acuerdo «${prev0.title}» desvinculado de la hoja de ruta «${titulo}».`,
        at: Date.now(),
      }
      return {
        ...s,
        threads: {
          ...s.threads,
          [threadId]: {
            ...th,
            contracts: next,
            messages: [...th.messages, sys],
          },
        },
      }
    })
    return true
  } catch {
    return false
  }
},

deleteRouteSheet: (threadId, routeSheetId) => {
  const thG = get().threads[threadId]
  if (
    thG &&
    routeSheetIdsLockedByPaidAgreements(thG).has(routeSheetId)
  )
    return false
  let ok = false
  const persistChat = threadId.startsWith('cth_') && getSessionToken()
  set((s) => {
    const th = s.threads[threadId]
    if (!th?.routeSheets?.length || threadIsActionLocked(th)) return s
    const sheet = th.routeSheets.find((r) => r.id === routeSheetId)
    if (!sheet) return s
    const ro = s.routeOfferPublic[th.offerId]
    const confirmedIds = confirmedCarrierIdsOnOffer(ro, routeSheetId)
    const assignedIds = assignedCarrierUserIdsOnOffer(ro, routeSheetId)
    const list = th.routeSheets.filter((r) => r.id !== routeSheetId)
    const contracts = (th.contracts ?? []).map((c) =>
      c.routeSheetId === routeSheetId ? { ...c, routeSheetId: undefined } : c,
    )
    let routeOfferPublic = s.routeOfferPublic
    if (ro?.routeSheetId === routeSheetId) {
      routeOfferPublic = { ...s.routeOfferPublic }
      delete routeOfferPublic[th.offerId]
    }
    const routeSheetEditAcks = { ...(th.routeSheetEditAcks ?? {}) }
    delete routeSheetEditAcks[routeSheetId]
    let chatCarriers = th.chatCarriers
    if (!persistChat && assignedIds.size > 0 && chatCarriers?.length) {
      chatCarriers = chatCarriers.filter((c) => !assignedIds.has(c.id))
    }
    const nConfirmed = confirmedIds.size
    const storeId = th.storeId?.trim()
    if (!persistChat && nConfirmed > 0 && storeId) {
      get().applyStoreTrustPenalty(
        storeId,
        SELLER_TRUST_PENALTY_ON_EDIT * nConfirmed,
        'Eliminación de hoja de ruta con transportistas confirmados (demo)',
      )
    }
    let sysText = `Se eliminó la hoja de ruta «${sheet.titulo}».`
    if (assignedIds.size > 0) {
      sysText += ` Los transportistas con tramo en la oferta salieron del chat.`
      if (nConfirmed > 0) {
        sysText += ` A la tienda se aplicó un ajuste de confianza por cada transportista confirmado (${nConfirmed}× demo).`
      }
    }
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: sysText,
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
          ...(!persistChat && chatCarriers !== th.chatCarriers ? { chatCarriers } : {}),
          ...(persistChat ? {} : { messages: [...th.messages, sys] }),
        },
      },
    }
  })
  if (ok && persistChat) {
    void (async () => {
      try {
        await deleteThreadRouteSheet(threadId, routeSheetId)
        const [sheets, subs] = await Promise.all([
          fetchThreadRouteSheets(threadId),
          fetchThreadRouteTramoSubscriptions(threadId),
        ])
        const acks = routeSheetEditAcksRecordFromSheets(sheets as RouteSheet[])
        const meId = useAppStore.getState().me.id
        get().applyThreadRouteTramoSubscriptions(threadId, subs, meId)
        set((s) => {
          const t = s.threads[threadId]
          if (!t) return s
          return {
            ...s,
            threads: {
              ...s.threads,
              [threadId]: {
                ...t,
                routeSheets: sheets as RouteSheet[],
                routeSheetEditAcks: { ...(t.routeSheetEditAcks ?? {}), ...acks },
              },
            },
          }
        })
      } catch {
        /* servidor / red */
      }
    })()
  }
  return ok
},
  }
}
