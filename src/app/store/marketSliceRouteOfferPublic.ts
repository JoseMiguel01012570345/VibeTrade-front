import type { RouteSheet } from '../../pages/chat/domain/routeSheetTypes'
import {
  applyViewerRouteTramoSubscriptions,
  mergeTramoSubscriptionsIntoRouteOffer,
} from '../../pages/chat/domain/routeOfferSubscriptionMerge'
import { routeOfferPublicBlockedForBuyerWithAgreement } from '../../pages/chat/domain/routeSheetOfferGuards'
import type { Message } from './marketStoreTypes'
import { threadIsActionLocked, uid } from './marketStoreHelpers'
import { routeOfferPublicAfterSheetEdit } from './marketSliceHelpers'
import type { MarketSliceGet, MarketSliceSet } from './marketSliceTypes'
import type { MarketState } from './marketStoreTypes'

export function createRouteOfferPublicSlice(set: MarketSliceSet, _get: MarketSliceGet): Pick<MarketState,
  | 'subscribeRouteOfferTramo'
  | 'validateRouteOfferTramo'
  | 'respondRouteSheetEdit'
  | 'applyThreadRouteTramoSubscriptions'
  | 'hydrateRouteOfferCarrierSubscriptions'
> {
  return {
hydrateRouteOfferCarrierSubscriptions: (routeOfferPublicKey, items, viewerId) => {
  set((s) => {
    const key = routeOfferPublicKey.trim()
    if (!key) return s
    const ro = s.routeOfferPublic[key]
    if (!ro) return s
    const merged = mergeTramoSubscriptionsIntoRouteOffer(ro, items, viewerId)
    if (!merged || merged === ro) return s
    return {
      ...s,
      routeOfferPublic: { ...s.routeOfferPublic, [key]: merged },
    }
  })
},
applyThreadRouteTramoSubscriptions: (threadId, items, viewerId) => {
  set((s) => {
    const next = applyViewerRouteTramoSubscriptions(s, threadId, items, viewerId)
    return next ?? s
  })
},
subscribeRouteOfferTramo: (offerId, stopId, carrier, vehicleLabel, storeServiceId) => {
  let ok = false
  set((s) => {
    const ro = s.routeOfferPublic[offerId]
    if (!ro) return s
    if (routeOfferPublicBlockedForBuyerWithAgreement(ro, s.threads, carrier.userId)) return s
    const ti = ro.tramos.findIndex((t) => t.stopId === stopId)
    if (ti < 0) return s
    const tr = ro.tramos[ti]
    const asg0 = tr.assignment
    if (asg0) {
      if (asg0.userId !== carrier.userId) return s
      if (asg0.status === 'confirmed' || asg0.status === 'pending') return s
    }
    const nextTramos = ro.tramos.map((t, i) =>
      i === ti ?
        {
          ...t,
          assignment: {
            status: 'pending' as const,
            userId: carrier.userId,
            displayName: carrier.displayName,
            phone: carrier.phone,
            trustScore: carrier.trustScore,
            ...(vehicleLabel?.trim() ? { vehicleLabel: vehicleLabel.trim() } : {}),
            ...(storeServiceId?.trim() ? { storeServiceId: storeServiceId.trim() } : {}),
          },
        }
      : t,
    )
    const th = s.threads[ro.threadId]
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `${carrier.displayName} solicitó el tramo ${tr.orden} (${tr.origenLine} → ${tr.destinoLine}). Pendiente de validación del vendedor o comprador.`,
      at: Date.now(),
    }
    ok = true
    return {
      ...s,
      routeOfferPublic: { ...s.routeOfferPublic, [offerId]: { ...ro, tramos: nextTramos } },
      threads:
        th ?
          { ...s.threads, [ro.threadId]: { ...th, messages: [...th.messages, sys] } }
        : s.threads,
    }
  })
  return ok
},

validateRouteOfferTramo: (offerId, stopId, accept) => {
  let ok = false
  set((s) => {
    const ro = s.routeOfferPublic[offerId]
    if (!ro) return s
    const ti = ro.tramos.findIndex((t) => t.stopId === stopId)
    if (ti < 0) return s
    const tr = ro.tramos[ti]
    const asg = tr.assignment
    if (!asg || asg.status !== 'pending') return s
    const nextTramos = ro.tramos.map((t, i) => {
      if (i !== ti) return t
      if (!accept) return { ...t, assignment: undefined }
      return { ...t, assignment: { ...asg, status: 'confirmed' as const } }
    })
    const th0 = s.threads[ro.threadId]
    let threads = s.threads
    if (accept && th0?.routeSheets) {
      const rsI = th0.routeSheets.findIndex((r) => r.id === ro.routeSheetId)
      if (rsI >= 0) {
        const rs = th0.routeSheets[rsI]
        const paradas = rs.paradas.map((p) =>
          p.id === stopId ? { ...p, telefonoTransportista: asg.phone } : p,
        )
        const newRs = { ...rs, paradas, actualizadoEn: Date.now() }
        const routeSheets = [...th0.routeSheets]
        routeSheets[rsI] = newRs
        let chatCarriers = [...(th0.chatCarriers ?? [])]
        const hadCarrier = chatCarriers.some((c) => c.id === asg.userId)
        const tramoDesc = `Tramo ${tr.orden} (${tr.origenLine} → ${tr.destinoLine})`
        if (!hadCarrier) {
          chatCarriers.push({
            id: asg.userId,
            name: asg.displayName,
            phone: asg.phone,
            trustScore: asg.trustScore,
            vehicleLabel: asg.vehicleLabel?.trim() || 'No indicada en la suscripción',
            tramoLabel: tramoDesc,
          })
        } else {
          chatCarriers = chatCarriers.map((c) =>
            c.id !== asg.userId ? c
            : c.tramoLabel.includes(`Tramo ${tr.orden} (`) ? c
            : { ...c, tramoLabel: `${c.tramoLabel} · ${tramoDesc}` },
          )
        }
        let routeSheetEditAcksOut = th0.routeSheetEditAcks
        const sheetId = ro.routeSheetId
        const prevAck = sheetId ? th0.routeSheetEditAcks?.[sheetId] : undefined
        const prevByCarrier = { ...(prevAck?.byCarrier ?? {}) }
        const hadOtherConfirmedTramo = ro.tramos.some(
          (t) =>
            t.stopId !== stopId &&
            t.assignment?.userId === asg.userId &&
            t.assignment?.status === 'confirmed',
        )
        if (sheetId && hadOtherConfirmedTramo) {
          for (const t of ro.tramos) {
            const u = t.assignment?.userId
            if (t.assignment?.status === 'confirmed' && u && prevByCarrier[u] === undefined) {
              prevByCarrier[u] = 'accepted'
            }
          }
          prevByCarrier[asg.userId] = 'pending'
          routeSheetEditAcksOut = {
            ...(th0.routeSheetEditAcks ?? {}),
            [sheetId]: {
              revision: (prevAck?.revision ?? 0) + 1,
              byCarrier: prevByCarrier,
            },
          }
        } else if (sheetId && !hadCarrier && prevAck && prevByCarrier[asg.userId] === undefined) {
          routeSheetEditAcksOut = {
            ...(th0.routeSheetEditAcks ?? {}),
            [sheetId]: {
              ...prevAck,
              byCarrier: { ...prevByCarrier, [asg.userId]: 'pending' },
            },
          }
        }
        const sysOk: Message = {
          id: uid('m'),
          from: 'system',
          type: 'text',
          text:
            hadOtherConfirmedTramo ?
              `Suscripción validada: ${asg.displayName} queda asignado al tramo ${tr.orden}. Al incorporar otro tramo, debe aceptar o rechazar la hoja de ruta en la pestaña Rutas (demo). Se le notifica también en la interfaz.`
            : `Suscripción validada: ${asg.displayName} queda asignado al tramo ${tr.orden}. Notificación al transportista: revisar la hoja en el chat (pestaña Rutas).`,
          at: Date.now(),
        }
        threads = {
          ...s.threads,
          [ro.threadId]: {
            ...th0,
            routeSheets,
            chatCarriers,
            ...(routeSheetEditAcksOut !== th0.routeSheetEditAcks ?
              { routeSheetEditAcks: routeSheetEditAcksOut }
            : {}),
            messages: [...th0.messages, sysOk],
          },
        }
      }
    } else if (!accept && th0) {
      const sysNo: Message = {
        id: uid('m'),
        from: 'system',
        type: 'text',
        text: `Suscripción rechazada para el tramo ${tr.orden} (${asg.displayName}). El tramo vuelve a estar libre.`,
        at: Date.now(),
      }
      threads = {
        ...s.threads,
        [ro.threadId]: { ...th0, messages: [...th0.messages, sysNo] },
      }
    }
    ok = true
    return {
      ...s,
      routeOfferPublic: { ...s.routeOfferPublic, [offerId]: { ...ro, tramos: nextTramos } },
      threads,
    }
  })
  return ok
},

respondRouteSheetEdit: (threadId, routeSheetId, carrierUserId, accept) => {
  let ok = false
  set((s) => {
    const th = s.threads[threadId]
    if (!th?.routeSheets || threadIsActionLocked(th)) return s
    const ack = th.routeSheetEditAcks?.[routeSheetId]
    if (!ack || ack.byCarrier[carrierUserId] !== 'pending') return s
    if (!th.chatCarriers?.some((c) => c.id === carrierUserId)) return s
    const carrier = th.chatCarriers.find((c) => c.id === carrierUserId)
    if (!carrier) return s
    const sheet = th.routeSheets.find((r) => r.id === routeSheetId)
    if (!sheet) return s
    const nextByCarrier = {
      ...ack.byCarrier,
      [carrierUserId]: accept ? ('accepted' as const) : ('rejected' as const),
    }
    const now = Date.now()
    const nextAcks = {
      ...(th.routeSheetEditAcks ?? {}),
      [routeSheetId]: { ...ack, byCarrier: nextByCarrier },
    }

    if (accept) {
      const sys: Message = {
        id: uid('m'),
        from: 'system',
        type: 'text',
        text: `${carrier.name} aceptó los cambios en la hoja de ruta «${sheet.titulo}».`,
        at: now,
      }
      ok = true
      return {
        ...s,
        threads: {
          ...s.threads,
          [threadId]: {
            ...th,
            routeSheetEditAcks: nextAcks,
            messages: [...th.messages, sys],
          },
        },
      }
    }

    const ro0 = s.routeOfferPublic[th.offerId]
    const stopIdsToClear = new Set<string>()
    let routeOfferPublic = s.routeOfferPublic
    if (ro0 && ro0.routeSheetId === routeSheetId) {
      for (const t of ro0.tramos) {
        if (t.assignment?.userId === carrierUserId) stopIdsToClear.add(t.stopId)
      }
      const nextTramos = ro0.tramos.map((t) =>
        t.assignment?.userId === carrierUserId ? { ...t, assignment: undefined } : t,
      )
      routeOfferPublic = { ...s.routeOfferPublic, [th.offerId]: { ...ro0, tramos: nextTramos } }
    }
    const paradas = sheet.paradas.map((p) =>
      stopIdsToClear.has(p.id) ? { ...p, telefonoTransportista: undefined } : p,
    )
    const updatedSheet: RouteSheet = { ...sheet, paradas, actualizadoEn: now }
    const rsIdx = th.routeSheets.findIndex((r) => r.id === routeSheetId)
    const routeSheets = [...th.routeSheets]
    routeSheets[rsIdx] = updatedSheet
    routeOfferPublic = routeOfferPublicAfterSheetEdit(
      routeOfferPublic,
      threadId,
      routeSheetId,
      updatedSheet,
    )
    const nextChatCarriers = (th.chatCarriers ?? []).map((c) =>
      c.id !== carrierUserId ?
        c
      : {
          ...c,
          tramoLabel:
            'Integrante del hilo — sin tramo asignado en la oferta tras rechazar la edición de la hoja (demo)',
        },
    )
    const sys: Message = {
      id: uid('m'),
      from: 'system',
      type: 'text',
      text: `${carrier.name} rechazó los cambios en «${sheet.titulo}». Sus tramos quedan libres en la oferta pública; permanece en el chat como integrante (demo).`,
      at: now,
    }
    ok = true
    return {
      ...s,
      routeOfferPublic,
      threads: {
        ...s.threads,
        [threadId]: {
          ...th,
          routeSheets,
          chatCarriers: nextChatCarriers,
          routeSheetEditAcks: nextAcks,
          messages: [...th.messages, sys],
        },
      },
    }
  })
  return ok
},
  }
}
