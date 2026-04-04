import toast from 'react-hot-toast'
import { ChevronRight, ExternalLink, MapPin } from 'lucide-react'
import { agreementDeclaresMerchandise, type TradeAgreement } from '../../domain/tradeAgreementTypes'
import { hasMerchandise } from '../../domain/tradeAgreementValidation'
import type { RouteSheet } from '../../domain/routeSheetTypes'
import { AgreementDetailView } from '../modals/AgreementDetailView'
import {
  contractStatusClass,
  contractStatusLabel,
  filterChipClass,
  railItemClass,
} from './chatRailStyles'
import type { ContractFilter } from './chatRailStyles'

type Props = {
  bodyClassName: string
  cFilter: ContractFilter
  setCFilter: (f: ContractFilter) => void
  storeName: string
  buyerName: string
  selContract: TradeAgreement | null
  setSelContract: (c: TradeAgreement | null) => void
  agreementForDetail: TradeAgreement | null
  displayContracts: TradeAgreement[]
  routeSheets: RouteSheet[]
  actionsLocked: boolean
  threadId: string
  linkAgreementToRouteSheet: (threadId: string, agreementId: string, routeSheetId: string) => boolean
  unlinkAgreementFromRouteSheet: (threadId: string, agreementId: string) => boolean
  openRouteFromContract: (routeId: string) => void
  onEditPendingAgreement?: (agreement: TradeAgreement) => void
}

export function ChatRightRailContractsPanel({
  bodyClassName,
  cFilter,
  setCFilter,
  storeName,
  buyerName,
  selContract,
  setSelContract,
  agreementForDetail,
  displayContracts,
  routeSheets,
  actionsLocked,
  threadId,
  linkAgreementToRouteSheet,
  unlinkAgreementFromRouteSheet,
  openRouteFromContract,
  onEditPendingAgreement,
}: Props) {
  return (
    <div className={bodyClassName}>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <button type="button" className={filterChipClass(cFilter === 'all')} onClick={() => setCFilter('all')}>
          Todos
        </button>
        <button type="button" className={filterChipClass(cFilter === 'store')} onClick={() => setCFilter('store')}>
          {storeName}
        </button>
        <button type="button" className={filterChipClass(cFilter === 'buyer')} onClick={() => setCFilter('buyer')}>
          {buyerName}
        </button>
      </div>

      {selContract && agreementForDetail ? (
        <div className="text-[13px]">
          <button
            type="button"
            className="mb-2.5 inline-flex cursor-pointer border-0 bg-transparent p-0 text-xs font-extrabold text-[var(--primary)]"
            onClick={() => setSelContract(null)}
          >
            ← Volver
          </button>
          {agreementForDetail.status === 'accepted' ? (
            <p className="mb-2.5 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] px-2.5 py-2 text-[12px] leading-snug text-[var(--muted)]">
              Este acuerdo fue <strong className="text-[var(--text)]">aceptado por las partes</strong>; su texto ya
              no puede modificarse. Si hace falta otro entendimiento, emití un <strong>nuevo</strong> acuerdo desde el
              chat.
            </p>
          ) : null}
          {(agreementForDetail.status === 'pending_buyer' || agreementForDetail.status === 'rejected') &&
          !actionsLocked &&
          agreementForDetail.issuerLabel === storeName &&
          onEditPendingAgreement ? (
            <div className="mb-2.5">
              <button
                type="button"
                className="vt-btn vt-btn-sm"
                onClick={() => onEditPendingAgreement(agreementForDetail)}
              >
                Editar acuerdo
              </button>
              <p className="vt-muted mt-1.5 text-[11px] leading-snug">
                {agreementForDetail.status === 'rejected'
                  ? 'Tras guardar, el acuerdo volverá a quedar pendiente para que el comprador lo acepte o rechace.'
                  : 'Podés corregir el texto mientras el comprador no lo haya aceptado.'}
              </p>
            </div>
          ) : null}
          <AgreementDetailView
            a={agreementForDetail}
            routeSheets={routeSheets}
            linkActionsDisabled={actionsLocked}
            onLinkRouteSheet={(agreementId, routeSheetId) => {
              const ok = linkAgreementToRouteSheet(threadId, agreementId, routeSheetId)
              if (ok) toast.success('Vinculación registrada; se notificó en el chat')
              else toast.error('No se pudo vincular (elegí otra hoja).')
            }}
            onUnlinkRouteSheet={(agreementId) => {
              const ok = unlinkAgreementFromRouteSheet(threadId, agreementId)
              if (ok) toast.success('Vínculo quitado; se notificó en el chat')
              else toast.error('No se pudo desvincular (la hoja ya está publicada).')
            }}
            onOpenRouteSheet={(rid) => openRouteFromContract(rid)}
          />
        </div>
      ) : displayContracts.length === 0 ? (
        <p className="vt-muted px-1 py-3 text-[13px]">No hay contratos.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {displayContracts.map((c) => (
            <li key={c.id}>
              <button type="button" className={railItemClass} onClick={() => setSelContract(c)}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-extrabold leading-tight">{c.title}</span>
                  <span className={contractStatusClass(c.status)}>{contractStatusLabel(c.status)}</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">{c.issuerLabel}</div>
                {agreementDeclaresMerchandise(c) &&
                hasMerchandise({ merchandise: c.merchandise }) &&
                (c.routeSheetId || c.routeSheetUrl) ? (
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                    {c.routeSheetId ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> Hoja de ruta (app)
                      </span>
                    ) : null}
                    {c.routeSheetUrl ? (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink size={12} /> Externo
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <ChevronRight
                  size={16}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
