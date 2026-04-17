import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FileText, Megaphone, Route, Users } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import type { StoreBadge, ThreadChatCarrier } from '../../../../app/store/useMarketStore'
import { useMarketStore } from '../../../../app/store/useMarketStore'
import { cn } from '../../../../lib/cn'
import type { TradeAgreement } from '../../domain/tradeAgreementTypes'
import type { RouteSheet } from '../../domain/routeSheetTypes'
import { buildChatParticipants } from '../../lib/chatParticipants'
import { PublishRouteSheetsModal } from '../modals/PublishRouteSheetsModal'
import {
  RAIL_BODY,
  RAIL_ROOT,
  TAB_BASE,
  TAB_ON,
  type ContractFilter,
} from './chatRailStyles'
import { ChatRightRailContractsPanel } from './ChatRightRailContractsPanel'
import { ChatRightRailPeoplePanel } from './ChatRightRailPeoplePanel'
import { ChatRightRailRoutesPanel } from './ChatRightRailRoutesPanel'

export type { ContractFilter } from './chatRailStyles'

type Props = {
  threadId: string
  threadStoreId: string
  contracts: TradeAgreement[]
  routeSheets: RouteSheet[]
  actionsLocked?: boolean
  storeName: string
  buyerName: string
  buyer: { id: string; name: string; trustScore: number; avatarUrl?: string }
  seller: StoreBadge
  focusRouteId?: string | null
  onConsumedRouteFocus?: () => void
  onOpenNewRouteSheet: () => void
  onEditRouteSheet: (sheet: RouteSheet) => void
  toggleRouteStop: (threadId: string, routeSheetId: string, stopId: string) => void
  /** Vendedor (dueño de la tienda del hilo) puede pedir editar acuerdo; ChatPage muestra el aviso de confianza. */
  onRequestEditAgreement?: (agreement: TradeAgreement) => void
  isActingSeller?: boolean
  onDeleteAgreement?: (agreement: TradeAgreement) => void
  chatCarriers?: ThreadChatCarrier[]
}

export function ChatRightRail({
  threadId,
  threadStoreId,
  contracts,
  routeSheets,
  actionsLocked = false,
  storeName,
  buyerName,
  focusRouteId,
  buyer,
  seller,
  onConsumedRouteFocus,
  onOpenNewRouteSheet,
  onEditRouteSheet,
  toggleRouteStop,
  onRequestEditAgreement,
  isActingSeller = false,
  onDeleteAgreement,
  chatCarriers,
}: Props) {
  const publishRouteSheetsToPlatform = useMarketStore((s) => s.publishRouteSheetsToPlatform)
  const linkAgreementToRouteSheet = useMarketStore((s) => s.linkAgreementToRouteSheet)
  const unlinkAgreementFromRouteSheet = useMarketStore((s) => s.unlinkAgreementFromRouteSheet)
  const deleteRouteSheet = useMarketStore((s) => s.deleteRouteSheet)
  const routeOfferForThread = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId]
      return th ? s.routeOfferPublic[th.offerId] : undefined
    }),
  )
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [tab, setTab] = useState<'contracts' | 'routes' | 'people'>('contracts')
  const [cFilter, setCFilter] = useState<ContractFilter>('all')
  const [selContract, setSelContract] = useState<TradeAgreement | null>(null)
  const [selRouteId, setSelRouteId] = useState<string | null>(null)

  useEffect(() => {
    if (!focusRouteId) return
    setTab('routes')
    setSelRouteId(focusRouteId)
    onConsumedRouteFocus?.()
  }, [focusRouteId, onConsumedRouteFocus])

  const participants = useMemo(
    () => buildChatParticipants(buyer, seller, chatCarriers),
    [buyer, seller, chatCarriers],
  )

  const hasAcceptedContract = useMemo(() => contracts.some((c) => c.status === 'accepted'), [contracts])

  const allTramosConfirmedOnOffer = useMemo(() => {
    const ro = routeOfferForThread
    if (!ro?.tramos?.length) return false
    return ro.tramos.every((t) => t.assignment?.status === 'confirmed')
  }, [routeOfferForThread])

  const linkedRouteSheetIds = useMemo(() => {
    const s = new Set<string>()
    for (const c of contracts) {
      if (c.routeSheetId) s.add(c.routeSheetId)
    }
    return s
  }, [contracts])

  const routeSheetsEligibleToPublish = useMemo(
    () =>
      routeSheets.filter((r) => {
        if (!linkedRouteSheetIds.has(r.id)) return false
        if (!r.publicadaPlataforma) return true
        if (routeOfferForThread?.routeSheetId !== r.id) return false
        return !allTramosConfirmedOnOffer
      }),
    [routeSheets, linkedRouteSheetIds, routeOfferForThread, allTramosConfirmedOnOffer],
  )

  const displayContracts = useMemo(() => {
    if (cFilter === 'all') return contracts
    if (cFilter === 'store') return contracts.filter((c) => c.issuedByStoreId === threadStoreId)
    return contracts.filter((c) => c.status === 'pending_buyer' || c.respondedAt != null)
  }, [contracts, cFilter, threadStoreId])

  const selRoute = selRouteId ? routeSheets.find((r) => r.id === selRouteId) : undefined
  const agreementForDetail = selContract
    ? contracts.find((c) => c.id === selContract.id) ?? selContract
    : null

  function handlePublishToPlatform() {
    if (contracts.length === 0) {
      toast.error('Necesitás al menos un acuerdo antes de publicar hojas de ruta.')
      setTab('contracts')
      return
    }
    if (routeSheets.length === 0) {
      toast.error('Creá una hoja de ruta en la pestaña Rutas y vinculála a un acuerdo.')
      setTab('routes')
      return
    }
    if (routeSheetsEligibleToPublish.length === 0) {
      const unpublishedButUnlinked = routeSheets.some(
        (r) => !r.publicadaPlataforma && !linkedRouteSheetIds.has(r.id),
      )
      if (unpublishedButUnlinked) {
        toast.error(
          'Solo podés publicar hojas vinculadas a un acuerdo. Abrí el contrato en Contratos y usá «Vincular».',
        )
      } else if (
        routeSheets.some((r) => r.publicadaPlataforma && linkedRouteSheetIds.has(r.id)) &&
        allTramosConfirmedOnOffer
      ) {
        toast('No hay hojas para republicar: todos los tramos tienen transportista confirmado.', {
          icon: 'ℹ️',
        })
      } else {
        toast('Las hojas de ruta de este chat ya están publicadas en la plataforma.', { icon: 'ℹ️' })
      }
      setTab('contracts')
      return
    }
    setPublishModalOpen(true)
  }

  function confirmPublish(ids: string[]) {
    const allowed = ids.filter((id) => linkedRouteSheetIds.has(id))
    if (!allowed.length) {
      toast.error('Ninguna de las hojas elegidas está vinculada a un acuerdo.')
      return
    }
    publishRouteSheetsToPlatform(threadId, allowed)
    toast.success(
      `Listo (${allowed.length} hoja${allowed.length === 1 ? '' : 's'}) — publicación o republicación en demo`,
    )
  }

  function openRouteFromContract(rid: string) {
    setTab('routes')
    setSelRouteId(rid)
    setSelContract(null)
  }

  return (
    <>
      <PublishRouteSheetsModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        routeSheets={routeSheetsEligibleToPublish}
        onConfirm={confirmPublish}
      />
      <aside className={RAIL_ROOT} aria-label="Contratos, rutas e integrantes del chat">
        <div className="shrink-0 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] px-2.5 pb-3 pt-2.5">
          <button
            type="button"
            className="vt-btn vt-btn-primary flex w-full justify-center gap-2"
            disabled={actionsLocked}
            title={
              actionsLocked
                ? 'No disponible hasta registrar el pago en el chat'
                : 'Ofrece las hojas de ruta a transportistas en la plataforma'
            }
            onClick={handlePublishToPlatform}
          >
            <Megaphone size={16} aria-hidden />
            Publicar hoja de ruta
          </button>
          <p className="mb-0 mt-2 text-[11px] leading-snug text-[var(--muted)]">
            Publicá por primera vez o republicá mientras falten tramos por cubrir con transportista confirmado.
            Siempre con la hoja vinculada a un acuerdo (Contratos → Vincular). Demo.
          </p>
        </div>
        <div className="flex shrink-0 border-b border-[var(--border)]">
          <button
            type="button"
            className={cn(TAB_BASE, tab === 'contracts' && TAB_ON)}
            onClick={() => {
              setTab('contracts')
              setSelRouteId(null)
            }}
          >
            <FileText size={15} aria-hidden /> Contratos
          </button>
          <button
            type="button"
            className={cn(TAB_BASE, tab === 'routes' && TAB_ON)}
            onClick={() => {
              setTab('routes')
              setSelContract(null)
            }}
          >
            <Route size={15} aria-hidden /> Rutas
          </button>
          <button
            type="button"
            className={cn(TAB_BASE, tab === 'people' && TAB_ON)}
            onClick={() => {
              setTab('people')
              setSelContract(null)
              setSelRouteId(null)
            }}
          >
            <Users size={15} aria-hidden /> Integrantes
          </button>
        </div>

        {tab === 'contracts' && (
          <ChatRightRailContractsPanel
            bodyClassName={RAIL_BODY}
            cFilter={cFilter}
            setCFilter={setCFilter}
            storeName={storeName}
            buyerName={buyerName}
            selContract={selContract}
            setSelContract={setSelContract}
            agreementForDetail={agreementForDetail}
            displayContracts={displayContracts}
            routeSheets={routeSheets}
            actionsLocked={actionsLocked}
            threadId={threadId}
            threadStoreId={threadStoreId}
            linkAgreementToRouteSheet={linkAgreementToRouteSheet}
            unlinkAgreementFromRouteSheet={unlinkAgreementFromRouteSheet}
            openRouteFromContract={openRouteFromContract}
            onRequestEditAgreement={onRequestEditAgreement}
            isActingSeller={isActingSeller}
            onDeleteAgreement={onDeleteAgreement}
          />
        )}

        {tab === 'routes' && (
          <ChatRightRailRoutesPanel
            bodyClassName={RAIL_BODY}
            actionsLocked={actionsLocked}
            hasAcceptedContract={hasAcceptedContract}
            agreementCount={contracts.length}
            routeSheets={routeSheets}
            selRoute={selRoute}
            setSelRouteId={setSelRouteId}
            threadId={threadId}
            onOpenNewRouteSheet={onOpenNewRouteSheet}
            onEditRouteSheet={onEditRouteSheet}
            toggleRouteStop={toggleRouteStop}
            deleteRouteSheet={deleteRouteSheet}
            routeOffer={routeOfferForThread}
          />
        )}

        {tab === 'people' && <ChatRightRailPeoplePanel bodyClassName={RAIL_BODY} participants={participants} />}
      </aside>
    </>
  )
}
