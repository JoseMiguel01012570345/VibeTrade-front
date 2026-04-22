import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useMarketStore } from '../../../../app/store/useMarketStore'
import {
  agreementDeleteBlockedByRouteSheetInvariant,
  routeSheetHasConfirmedCarriersOnOffer,
  sheetPreviewContactLine,
} from '../../domain/routeSheetOfferGuards'
import { routeStatusLabel } from '../../domain/routeSheetTypes'
import { mapBackdropLayerAboveChatRail, modalShellWide } from '../../styles/formModalStyles'

type Props = Readonly<{
  open: boolean
  threadId: string
  agreementId: string
  agreementTitle: string
  onClose: () => void
  onAgreementDeleted: () => void
}>

function tramoPreviewLine(origen: string, destino: string): string {
  const o = origen.trim()
  const d = destino.trim()
  if (o || d) return `${o || '…'} → ${d || '…'}`
  return 'Tramo sin datos'
}

export function AgreementDeleteRouteSheetsModal({
  open,
  threadId,
  agreementId,
  agreementTitle,
  onClose,
  onAgreementDeleted,
}: Props) {
  const deleteRouteSheet = useMarketStore((s) => s.deleteRouteSheet)
  const deleteTradeAgreement = useMarketStore((s) => s.deleteTradeAgreement)

  const { contracts, routeSheets, routeOffer } = useMarketStore(
    useShallow((s) => {
      const th = s.threads[threadId]
      const ro = th ? s.routeOfferPublic[th.offerId] : undefined
      return {
        contracts: th?.contracts ?? [],
        routeSheets: th?.routeSheets ?? [],
        routeOffer: ro,
      }
    }),
  )

  const blockedByInvariant = useMemo(
    () => agreementDeleteBlockedByRouteSheetInvariant(contracts.length, routeSheets.length),
    [contracts.length, routeSheets.length],
  )

  const anySheetDeletable = useMemo(
    () =>
      routeSheets.some((rs) => !routeSheetHasConfirmedCarriersOnOffer(routeOffer, rs.id)),
    [routeSheets, routeOffer],
  )

  const canDeleteAgreementNow =
    !agreementDeleteBlockedByRouteSheetInvariant(contracts.length, routeSheets.length)

  if (!open) return null

  return (
    <div
      className={mapBackdropLayerAboveChatRail}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agr-del-routes-title"
    >
      <div className={modalShellWide}>
        <div id="agr-del-routes-title" className="vt-modal-title">
          No podés eliminar este acuerdo todavía
        </div>
        <div className="vt-modal-body mt-1 flex min-h-0 flex-1 flex-col gap-4 overflow-auto text-sm text-[var(--text)]">
          <p className="vt-muted text-[13px] leading-snug">
            En esta operación la cantidad de <strong className="text-[var(--text)]">hojas de ruta</strong> no puede ser{' '}
            <strong className="text-[var(--text)]">mayor</strong> que la de{' '}
            <strong className="text-[var(--text)]">acuerdos</strong> (puede ser igual o menor). Si eliminás el acuerdo «
            {agreementTitle}», quedarían <strong className="text-[var(--text)]">{contracts.length - 1}</strong> acuerdo
            {contracts.length - 1 === 1 ? '' : 's'} y ahora tenés{' '}
            <strong className="text-[var(--text)]">{routeSheets.length}</strong> hoja
            {routeSheets.length === 1 ? '' : 's'}: primero tenés que{' '}
            <strong className="text-[var(--text)]">eliminar al menos una hoja de ruta</strong>.
          </p>
          <p className="vt-muted text-[12px] leading-snug">
            Elegí una hoja en la grilla (vista previa). Sólo podés borrar hojas sin transportistas con tramo ya
            confirmado en la oferta pública; las solicitudes pendientes no bloquean la eliminación.
          </p>

          {!anySheetDeletable && blockedByInvariant ? (
            <p className="rounded-lg border border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_8%,var(--surface))] px-3 py-2 text-[12px] font-semibold leading-snug text-[color-mix(in_oklab,#b45309_95%,var(--text))]">
              Ninguna hoja se puede eliminar ahora porque todas las que podrían liberarse tienen al menos un tramo con
              transportista confirmado. Resolvé la operación de transporte o desasigná tramos antes de bajar acuerdos en
              la demo.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {routeSheets.map((rs) => {
              const first = rs.paradas[0]
              const locked = routeSheetHasConfirmedCarriersOnOffer(routeOffer, rs.id)
              return (
                <div
                  key={rs.id}
                  className="flex flex-col rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_94%,transparent)] p-3 shadow-[0_1px_0_color-mix(in_oklab,var(--border)_40%,transparent)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-extrabold leading-tight text-[var(--text)]">{rs.titulo}</span>
                    <span className="shrink-0 rounded-full bg-[color-mix(in_oklab,var(--border)_22%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                      {routeStatusLabel(rs.estado)}
                    </span>
                  </div>
                  {rs.mercanciasResumen.trim() ? (
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">
                      {rs.mercanciasResumen.trim()}
                    </p>
                  ) : null}
                  {first ? (
                    <p className="mt-1.5 text-[11px] font-semibold text-[var(--text)]">
                      {tramoPreviewLine(first.origen, first.destino)}
                      {rs.paradas.length > 1 ? (
                        <span className="font-normal text-[var(--muted)]"> (+{rs.paradas.length - 1})</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-[var(--muted)]">Sin tramos cargados</p>
                  )}
                  {(() => {
                    const contacts = sheetPreviewContactLine(rs, routeOffer)
                    return contacts ? (
                      <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-snug text-[var(--text)]">
                        <span className="text-[var(--muted)]">Contacto: </span>
                        {contacts}
                      </p>
                    ) : null
                  })()}
                  {rs.publicadaPlataforma ? (
                    <p className="mt-1 text-[10px] font-bold text-[color-mix(in_oklab,var(--primary)_85%,var(--muted))]">
                      Publicada en plataforma
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-1 flex-col justify-end gap-1">
                    {locked ? (
                      <p className="text-[11px] leading-snug text-[var(--muted)]">
                        No disponible: hay transportistas con tramo confirmado en la oferta vinculada a esta hoja.
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="vt-btn vt-btn-sm inline-flex w-full justify-center gap-1.5 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] bg-[color-mix(in_oklab,#dc2626_6%,var(--surface))] text-[color-mix(in_oklab,#dc2626_88%,var(--text))]"
                        onClick={() => {
                          const ok = deleteRouteSheet(threadId, rs.id)
                          if (ok) toast.success(`Hoja «${rs.titulo}» eliminada`)
                          else
                            toast.error('No se pudo eliminar la hoja (p. ej. transportistas confirmados en la oferta).')
                        }}
                      >
                        <Trash2 size={14} aria-hidden /> Eliminar esta hoja
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {routeSheets.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">No hay hojas de ruta en este hilo (estado inesperado).</p>
          ) : null}
        </div>

        <div className="vt-modal-actions mt-4 flex flex-wrap gap-2">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cerrar
          </button>
          {canDeleteAgreementNow ? (
            <button
              type="button"
              className="vt-btn vt-btn-primary"
              onClick={() => {
                void (async () => {
                  const ok = await deleteTradeAgreement(threadId, agreementId)
                  if (ok) {
                    toast.success('Acuerdo eliminado')
                    onAgreementDeleted()
                    onClose()
                  } else {
                    toast.error('No se pudo eliminar el acuerdo (ya aceptado, bloqueado o restricción de hojas).')
                  }
                })()
              }}
            >
              Eliminar acuerdo «{agreementTitle}»
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
