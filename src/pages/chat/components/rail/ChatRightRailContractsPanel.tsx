import toast from 'react-hot-toast'
import { ChevronRight, ExternalLink, MapPin, Trash2 } from 'lucide-react'
import { type TradeAgreement } from '../../domain/tradeAgreementTypes'
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
  threadStoreId: string
  linkAgreementToRouteSheet: (
    threadId: string,
    agreementId: string,
    routeSheetId: string,
  ) => Promise<boolean>
  unlinkAgreementFromRouteSheet: (threadId: string, agreementId: string) => Promise<boolean>
  openRouteFromContract: (routeId: string) => void
  onRequestEditAgreement?: (agreement: TradeAgreement) => void
  isActingSeller?: boolean
  onDeleteAgreement?: (agreement: TradeAgreement) => void
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
  threadStoreId,
  linkAgreementToRouteSheet,
  unlinkAgreementFromRouteSheet,
  openRouteFromContract,
  onRequestEditAgreement,
  isActingSeller = false,
  onDeleteAgreement,
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
          {agreementForDetail.status === 'deleted' ? (
            <p className="mb-2.5 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] px-2.5 py-2 text-[12px] leading-snug text-[var(--muted)]">
              Este acuerdo fue <strong className="text-[var(--text)]">eliminado</strong> por el vendedor. Queda en el
              historial como registro; no se puede editar ni volver a usar como contrato activo.
            </p>
          ) : null}
          {agreementForDetail.status === 'accepted' ? (
            <p className="mb-2.5 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] px-2.5 py-2 text-[12px] leading-snug text-[var(--muted)]">
              Este acuerdo está <strong className="text-[var(--text)]">aceptado</strong>. Si el vendedor lo modifica,
              vuelve a estar pendiente hasta nueva respuesta del comprador (el comprador puede rechazarlo y{' '}
              <strong className="text-[var(--text)]">permanece en el chat</strong>).
            </p>
          ) : null}
          {isActingSeller &&
          !actionsLocked &&
          agreementForDetail.status !== 'deleted' &&
          agreementForDetail.issuedByStoreId === threadStoreId &&
          onRequestEditAgreement ? (
            <div className="mb-2.5 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vt-btn vt-btn-sm"
                  disabled={agreementForDetail.sellerEditBlockedUntilBuyerResponse === true}
                  title={
                    agreementForDetail.sellerEditBlockedUntilBuyerResponse ?
                      'Esperá la respuesta del comprador a la última versión antes de volver a editar'
                    : undefined
                  }
                  onClick={() => onRequestEditAgreement(agreementForDetail)}
                >
                  Editar acuerdo
                </button>
                {agreementForDetail.status !== 'accepted' && onDeleteAgreement ? (
                  <button
                    type="button"
                    className="vt-btn vt-btn-sm inline-flex items-center gap-1 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] bg-[color-mix(in_oklab,#dc2626_6%,var(--surface))] text-[color-mix(in_oklab,#dc2626_88%,var(--text))]"
                    onClick={() => onDeleteAgreement(agreementForDetail)}
                    title="No disponible si el acuerdo ya fue aceptado"
                  >
                    <Trash2 size={14} aria-hidden /> Eliminar
                  </button>
                ) : null}
              </div>
              <p className="vt-muted text-[11px] leading-snug">
                {agreementForDetail.sellerEditBlockedUntilBuyerResponse ?
                  <>
                    Ya enviaste cambios: no podés editar de nuevo hasta que el comprador{' '}
                    <strong className="text-[var(--text)]">acepte o rechace</strong> esta versión en el chat.
                  </>
                : agreementForDetail.status === 'accepted' ?
                  'Antes de abrir el formulario verás un aviso: editar puede impactar en tu barra de confianza.'
                : agreementForDetail.status === 'rejected' ?
                  'Tras guardar, el acuerdo volverá a quedar pendiente para que el comprador lo acepte o rechace.'
                : 'Podés corregir el texto; el comprador deberá aceptar o rechazar los cambios si el acuerdo ya estaba aceptado, o seguirá pendiente si aún no lo aceptó.'}
              </p>
            </div>
          ) : null}
          <AgreementDetailView
            a={agreementForDetail}
            routeSheets={routeSheets}
            linkActionsDisabled={actionsLocked || agreementForDetail.status === 'deleted'}
            onLinkRouteSheet={async (agreementId, routeSheetId) => {
              const ok = await linkAgreementToRouteSheet(threadId, agreementId, routeSheetId)
              if (ok) toast.success('Vinculación registrada; se notificó en el chat')
              else toast.error('No se pudo vincular (elegí otra hoja).')
            }}
            onUnlinkRouteSheet={async (agreementId) => {
              const ok = await unlinkAgreementFromRouteSheet(threadId, agreementId)
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
                {(c.routeSheetId || c.routeSheetUrl) ? (
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
