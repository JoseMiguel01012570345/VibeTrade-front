import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { RouteOfferPublicState } from '@features/market/logic/store/marketStoreTypes'
import type { Thread } from '@features/market/logic/store/marketStoreTypes'
import { routeSheetHasPendingCarrierAck } from '@features/market/logic/store/marketSliceHelpers'
import {
  threadHasAcceptedAgreement,
  useMarketStore,
} from '@features/market/logic/store/useMarketStore'
import type { RouteSheet } from '@features/chat/Dtos/route-sheet/routeSheetTypes';import type { TradeAgreement } from '@features/chat/Dtos/agreement/tradeAgreementTypes';import { tradeAgreementToDraft } from '@features/chat/logic/agreement/tradeAgreementTypes'
import {
  agreementDeleteBlockedByRouteSheetInvariant,
  resolveRouteOfferPublicForSheet,
  ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES,
  routeSheetStructuralEditBlockedByPaid,
} from '@features/chat/logic/route-sheet/routeSheetOfferGuards'
import { threadCanCreateRouteSheet } from '@features/chat/logic/route-sheet/routeSheetCreationGate'
import { fetchThreadHasUnpaidRouteSheets } from '@features/chat/api/chatApi'
import type { RouteSheetFormPayload, RouteSheetSubmitResult } from '@features/chat/Dtos/route-sheet/routeSheetFormModalTypes';import { useChatPageRouteSheetForm } from './useChatPageRouteSheetForm'

type Params = {
  thread: Thread | undefined
  isActingSeller: boolean
  routeOfferForThisThread: RouteOfferPublicState | undefined
  setRailOpen: (open: boolean) => void
}

export function useChatPageTradeActions({
  thread,
  isActingSeller,
  routeOfferForThisThread,
  setRailOpen,
}: Params) {
  const emitTradeAgreement = useMarketStore((s) => s.emitTradeAgreement)
  const updatePendingTradeAgreement = useMarketStore(
    (s) => s.updatePendingTradeAgreement,
  )
  const deleteTradeAgreement = useMarketStore((s) => s.deleteTradeAgreement)
  const duplicateTradeAgreement = useMarketStore(
    (s) => s.duplicateTradeAgreement,
  )
  const createRouteSheet = useMarketStore((s) => s.createRouteSheet)
  const updateRouteSheet = useMarketStore((s) => s.updateRouteSheet)
  const toggleRouteStop = useMarketStore((s) => s.toggleRouteStop)

  const [showAgreementForm, setShowAgreementForm] = useState(false)
  const [agreementBeingEditedId, setAgreementBeingEditedId] = useState<
    string | null
  >(null)
  const [showRouteSheetForm, setShowRouteSheetForm] = useState(false)
  const [routeSheetBeingEdited, setRouteSheetBeingEdited] =
    useState<RouteSheet | null>(null)
  const [pendingRouteSheetTrustConfirm, setPendingRouteSheetTrustConfirm] =
    useState<RouteSheet | null>(null)
  const [agreementDeleteSheetsModal, setAgreementDeleteSheetsModal] =
    useState<null | { agreementId: string; title: string }>(null)

  const {
    routeOfferForEditingRouteSheet,
    routeSheetLockedByPaidAgreement,
    routeSheetCarrierContactEditOnly,
    routeLegPaymentCurrency,
  } = useChatPageRouteSheetForm(
    thread,
    routeSheetBeingEdited,
    routeOfferForThisThread,
  )

  const agreementFormInitial = useMemo(() => {
    if (!thread || !agreementBeingEditedId || !thread.contracts) return null
    const a = thread.contracts.find((c) => c.id === agreementBeingEditedId)
    return a ? tradeAgreementToDraft(a) : null
  }, [agreementBeingEditedId, thread])

  useEffect(() => {
    if (!isActingSeller) {
      setShowRouteSheetForm(false)
      setRouteSheetBeingEdited(null)
    }
  }, [isActingSeller])

  const openEmitAgreement = useCallback(() => {
    setAgreementBeingEditedId(null)
    setShowAgreementForm(true)
  }, [])

  const onOpenNewRouteSheet = useCallback(() => {
    if (!thread) return
    void (async () => {
      try {
        const contracts = thread.contracts ?? []
        const hasAccepted = contracts.some((c) => c.status === 'accepted')
        const canCreate = hasAccepted
          ? threadCanCreateRouteSheet(contracts)
          : await fetchThreadHasUnpaidRouteSheets(thread.id)
        if (!canCreate) {
          toast.error(
            'No hay acuerdos pendientes de hoja de ruta (sin pago o con servicio cobrado sin roadmap vinculado).',
          )
          return
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : 'No se pudo validar si podés crear una hoja de ruta.'
        toast.error(msg)
        return
      }

      setRouteSheetBeingEdited(null)
      setShowRouteSheetForm(true)
      setRailOpen(true)
    })()
  }, [thread, setRailOpen])

  const onEditRouteSheet = useCallback(
    (sheet: RouteSheet) => {
      if (!thread) return
      if (!isActingSeller) {
        toast.error('Solo la tienda puede editar la hoja de ruta.')
        return
      }
      const lockedByPaid = (thread.contracts ?? []).some(
        (c) => c.routeSheetId === sheet.id && c.hasSucceededPayments === true,
      )
      const perSheetOffer =
        resolveRouteOfferPublicForSheet(
          useMarketStore.getState(),
          thread,
          sheet.id,
        ) ?? routeOfferForThisThread
      if (
        routeSheetStructuralEditBlockedByPaid(
          lockedByPaid,
          perSheetOffer,
          sheet.id,
          sheet,
          thread.routeTramoSubscriptionsSnapshot,
        )
      ) {
        toast.error(ROUTE_SHEET_LOCKED_BY_PAID_AGREEMENT_ES)
        return
      }
      if (
        routeSheetHasPendingCarrierAck(thread, sheet.id, routeOfferForThisThread)
      ) {
        toast.error(
          'No puedes editar de nuevo hasta que los transportistas del hilo acepten o rechacen la última versión de la hoja.',
        )
        return
      }
      setPendingRouteSheetTrustConfirm(sheet)
    },
    [isActingSeller, thread, routeOfferForThisThread],
  )

  const onToggleRouteStop = useCallback(
    (tid: string, routeSheetId: string, stopId: string) => {
      if (!isActingSeller) return
      toggleRouteStop(tid, routeSheetId, stopId)
    },
    [isActingSeller, toggleRouteStop],
  )

  const onRequestEditAgreement = useCallback(
    (ag: TradeAgreement) => {
      if (!isActingSeller) return
      if (ag.hasSucceededPayments) {
        toast.error(
          'No podés editar este acuerdo: ya hay cobros registrados.',
        )
        return
      }
      if (ag.sellerEditBlockedUntilBuyerResponse) {
        toast.error(
          'Ya enviaste cambios en este acuerdo. Esperá la respuesta del comprador (aceptar o rechazar) antes de volver a editar.',
        )
        return
      }
      setAgreementBeingEditedId(ag.id)
      setShowAgreementForm(true)
    },
    [isActingSeller],
  )

  const onDuplicateAgreement = useCallback(
    (ag: TradeAgreement) => {
      if (!thread) return
      if (!isActingSeller) {
        toast.error('Solo la tienda puede duplicar el acuerdo.')
        return
      }
      void (async () => {
        const newId = await duplicateTradeAgreement(thread.id, ag.id)
        if (newId) toast.success('Acuerdo duplicado.')
        else toast.error('No se pudo duplicar el acuerdo.')
      })()
    },
    [isActingSeller, thread, duplicateTradeAgreement],
  )

  const onDeleteAgreement = useCallback(
    (ag: TradeAgreement) => {
      if (!thread) return
      if (ag.hasSucceededPayments) {
        toast.error(
          'No podés eliminar este acuerdo: ya hay cobros registrados.',
        )
        return
      }
      const contracts = thread.contracts ?? []
      const sheets = thread.routeSheets ?? []
      if (
        agreementDeleteBlockedByRouteSheetInvariant(
          contracts.length,
          sheets.length,
        )
      ) {
        setAgreementDeleteSheetsModal({
          agreementId: ag.id,
          title: ag.title,
        })
        return
      }
      if (
        !globalThis.confirm(
          `¿Eliminar el acuerdo «${ag.title}»? No puedes eliminar acuerdos ya aceptados.`,
        )
      )
        return
      void (async () => {
        const ok = await deleteTradeAgreement(thread.id, ag.id)
        if (ok) toast.success('Acuerdo eliminado')
        else {
          toast.error(
            'No se pudo eliminar el acuerdo (aceptado, bloqueo del hilo o más hojas que acuerdos permitidos).',
          )
        }
      })()
    },
    [thread],
  )

  const onCloseAgreementDeleteSheets = useCallback(() => {
    setAgreementDeleteSheetsModal(null)
  }, [])

  const onCloseRouteSheetTrustConfirm = useCallback(() => {
    setPendingRouteSheetTrustConfirm(null)
  }, [])

  const onConfirmRouteSheetTrust = useCallback(() => {
    const sheet = pendingRouteSheetTrustConfirm
    setPendingRouteSheetTrustConfirm(null)
    if (!sheet) return
    setRouteSheetBeingEdited(sheet)
    setShowRouteSheetForm(true)
    setRailOpen(true)
  }, [pendingRouteSheetTrustConfirm, setRailOpen])

  const onCloseAgreementForm = useCallback(() => {
    setShowAgreementForm(false)
    setAgreementBeingEditedId(null)
  }, [])

  const onSubmitAgreement = useCallback(
    async (draft: Parameters<typeof emitTradeAgreement>[1]) => {
      if (!thread || !isActingSeller) return false
      if (agreementBeingEditedId) {
        const r = await updatePendingTradeAgreement(
          thread.id,
          agreementBeingEditedId,
          draft,
        )
        if (r.ok) {
          toast.success('Acuerdo actualizado')
        } else {
          toast.error(r.message ?? 'No se pudo guardar el acuerdo.')
        }
        return r.ok
      }
      const r = await emitTradeAgreement(thread.id, draft)
      if (r.ok) toast.success('Acuerdo emitido al chat')
      else toast.error(r.message ?? 'No se pudo emitir el acuerdo.')
      return r.ok
    },
    [
      isActingSeller,
      agreementBeingEditedId,
      thread,
      updatePendingTradeAgreement,
      emitTradeAgreement,
    ],
  )

  const onCloseRouteSheetForm = useCallback(() => {
    setShowRouteSheetForm(false)
    setRouteSheetBeingEdited(null)
  }, [])

  const onSubmitRouteSheet = useCallback(
    (payload: RouteSheetFormPayload): RouteSheetSubmitResult => {
      if (!thread || !isActingSeller) return { ok: false }
      if (routeSheetBeingEdited) {
        const ok = updateRouteSheet(
          thread.id,
          routeSheetBeingEdited.id,
          payload,
        )
        if (!ok) {
          toast.error(
            'No se pudo guardar: revisa título, mercancías y al menos un tramo con origen y destino',
          )
        }
        return ok
          ? { ok: true, routeSheetId: routeSheetBeingEdited.id }
          : { ok: false }
      }
      const id = createRouteSheet(thread.id, payload)
      if (!id) {
        if (!threadHasAcceptedAgreement(thread)) {
          toast.error(
            'Necesitas al menos un contrato aceptado para crear una hoja de ruta.',
          )
        } else if (
          (thread.routeSheets?.length ?? 0) >= (thread.contracts?.length ?? 0)
        ) {
          toast.error(
            'No puedes tener más hojas de ruta que acuerdos. Emite otro acuerdo o elimina una hoja.',
          )
        } else {
          toast.error(
            'Completa título, mercancías y al menos un tramo con origen y destino',
          )
        }
        return { ok: false }
      }
      return { ok: true, routeSheetId: id }
    },
    [isActingSeller, routeSheetBeingEdited, thread, updateRouteSheet, createRouteSheet],
  )

  return {
    showAgreementForm,
    agreementBeingEditedId,
    showRouteSheetForm,
    routeSheetBeingEdited,
    pendingRouteSheetTrustConfirm,
    agreementDeleteSheetsModal,
    agreementFormInitial,
    routeOfferForEditingRouteSheet,
    routeSheetLockedByPaidAgreement,
    routeSheetCarrierContactEditOnly,
    routeLegPaymentCurrency,
    openEmitAgreement,
    onOpenNewRouteSheet,
    onEditRouteSheet,
    onToggleRouteStop,
    onRequestEditAgreement,
    onDuplicateAgreement,
    onDeleteAgreement,
    onCloseAgreementDeleteSheets,
    onCloseRouteSheetTrustConfirm,
    onConfirmRouteSheetTrust,
    onCloseAgreementForm,
    onSubmitAgreement,
    onCloseRouteSheetForm,
    onSubmitRouteSheet,
  }
}
