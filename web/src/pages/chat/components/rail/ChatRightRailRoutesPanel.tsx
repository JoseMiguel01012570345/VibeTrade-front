import toast from 'react-hot-toast'
import { Check, ChevronRight, MapPin, Pencil, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { useAppStore } from '../../../../app/store/useAppStore'
import { useMarketStore } from '../../../../app/store/useMarketStore'
import { cn } from '../../../../lib/cn'
import type { RouteSheet } from '../../domain/routeSheetTypes'
import { routeStatusLabel, tramoResumenLinea } from '../../domain/routeSheetTypes'
import { railItemClass } from './chatRailStyles'
import { statusPillOk, statusPillPending } from '../../styles/formModalStyles'

type Props = {
  bodyClassName: string
  actionsLocked: boolean
  hasAcceptedContract: boolean
  routeSheets: RouteSheet[]
  selRoute: RouteSheet | undefined
  setSelRouteId: (id: string | null) => void
  threadId: string
  onOpenNewRouteSheet: () => void
  onEditRouteSheet: (sheet: RouteSheet) => void
  toggleRouteStop: (threadId: string, routeSheetId: string, stopId: string) => void
  deleteRouteSheet: (threadId: string, routeSheetId: string) => boolean
}

export function ChatRightRailRoutesPanel({
  bodyClassName,
  actionsLocked,
  hasAcceptedContract,
  routeSheets,
  selRoute,
  setSelRouteId,
  threadId,
  onOpenNewRouteSheet,
  onEditRouteSheet,
  toggleRouteStop,
  deleteRouteSheet,
}: Props) {
  const me = useAppStore((s) => s.me)
  const offerId = useMarketStore((s) => s.threads[threadId]?.offerId ?? '')
  const routeOffer = useMarketStore((s) => (offerId ? s.routeOfferPublic[offerId] : undefined))
  const routeSheetEditAcks = useMarketStore((s) => s.threads[threadId]?.routeSheetEditAcks)
  const chatCarriers = useMarketStore((s) => s.threads[threadId]?.chatCarriers)
  const respondRouteSheetEdit = useMarketStore((s) => s.respondRouteSheetEdit)

  const selSheetHasConfirmedCarriers =
    !!selRoute &&
    routeOffer?.routeSheetId === selRoute.id &&
    routeOffer.tramos.some((t) => t.assignment?.status === 'confirmed')

  const myCarrierAck =
    selRoute && me.id && chatCarriers?.some((c) => c.id === me.id) ?
      routeSheetEditAcks?.[selRoute.id]?.byCarrier[me.id]
    : undefined

  return (
    <div className={bodyClassName}>
      <button
        type="button"
        className="vt-btn vt-btn-primary mb-3 flex w-full justify-center gap-2"
        disabled={actionsLocked || !hasAcceptedContract}
        title={
          actionsLocked
            ? 'No disponible hasta registrar el pago en el chat'
            : !hasAcceptedContract
              ? 'Necesitás al menos un contrato aceptado para crear una hoja de ruta'
              : undefined
        }
        onClick={onOpenNewRouteSheet}
      >
        <MapPin size={16} /> Nueva hoja de ruta
      </button>

      {selRoute ? (
        <div className="text-[13px]">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="m-0 inline-flex cursor-pointer border-0 bg-transparent p-0 text-xs font-extrabold text-[var(--primary)]"
              onClick={() => setSelRouteId(null)}
            >
              ← Lista
            </button>
            <button
              type="button"
              className="vt-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
              disabled={actionsLocked}
              title={
                actionsLocked ?
                  'No disponible hasta registrar el pago'
                : selRoute.publicadaPlataforma ?
                  'Editar: se notifica en el chat y los transportistas pueden aceptar o rechazar (demo)'
                : 'Editar hoja de ruta'
              }
              onClick={() => onEditRouteSheet(selRoute)}
            >
              <Pencil size={14} aria-hidden /> Editar
            </button>
            {!selSheetHasConfirmedCarriers ? (
              <button
                type="button"
                className="vt-btn inline-flex items-center gap-1.5 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] bg-[color-mix(in_oklab,#dc2626_6%,var(--surface))] px-2.5 py-1.5 text-xs text-[color-mix(in_oklab,#dc2626_88%,var(--text))] hover:bg-[color-mix(in_oklab,#dc2626_10%,var(--surface))]"
                disabled={actionsLocked}
                title={
                  actionsLocked
                    ? 'No disponible hasta registrar el pago'
                    : 'Eliminar si no hay transportistas con tramo ya aceptado; las solicitudes pendientes no lo impiden'
                }
                onClick={() => {
                  if (
                    !globalThis.confirm(
                      `¿Eliminar la hoja de ruta «${selRoute.titulo}»? Se quitará el vínculo en los acuerdos.`,
                    )
                  )
                    return
                  const ok = deleteRouteSheet(threadId, selRoute.id)
                  if (ok) {
                    toast.success('Hoja de ruta eliminada')
                    setSelRouteId(null)
                  } else {
                    toast.error('No se puede eliminar: hay al menos un transportista con tramo confirmado en esta oferta.')
                  }
                }}
              >
                <Trash2 size={14} aria-hidden /> Eliminar
              </button>
            ) : null}
          </div>
          <div className="mb-1.5 text-[15px] font-black">{selRoute.titulo}</div>
          {myCarrierAck === 'pending' && routeSheetEditAcks?.[selRoute.id] ? (
            <div className="mb-3 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-3 py-2.5">
              <div className="text-xs font-extrabold leading-snug">
                Cambios en la hoja (revisión {routeSheetEditAcks[selRoute.id].revision})
              </div>
              <p className="vt-muted mb-2 mt-1 text-[11px] leading-snug">
                El vendedor editó la hoja. Como transportista en este hilo, podés aceptarla o rechazarla.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vt-btn vt-btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                  disabled={actionsLocked}
                  onClick={() => {
                    const ok = respondRouteSheetEdit(threadId, selRoute.id, me.id, true)
                    if (ok) toast.success('Aceptaste la versión actual de la hoja')
                    else toast.error('No se pudo registrar la aceptación')
                  }}
                >
                  <ThumbsUp size={14} aria-hidden /> Aceptar cambios
                </button>
                <button
                  type="button"
                  className="vt-btn inline-flex items-center gap-1 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] px-2.5 py-1.5 text-xs"
                  disabled={actionsLocked}
                  onClick={() => {
                    const ok = respondRouteSheetEdit(threadId, selRoute.id, me.id, false)
                    if (ok) toast('Rechazaste los cambios; tu tramo queda libre en la oferta (demo)', { icon: 'ℹ️' })
                    else toast.error('No se pudo registrar el rechazo')
                  }}
                >
                  <ThumbsDown size={14} aria-hidden /> Rechazar
                </button>
              </div>
            </div>
          ) : null}
          {myCarrierAck === 'accepted' ? (
            <p className="vt-muted mb-2 text-[11px]">Confirmaste la última versión de esta hoja.</p>
          ) : null}
          {myCarrierAck === 'rejected' ? (
            <p className="vt-muted mb-2 text-[11px]">Rechazaste la última edición de esta hoja.</p>
          ) : null}
          {selRoute.publicadaPlataforma ? (
            <div className={cn(statusPillOk, 'mb-2 inline-block')}>En plataforma</div>
          ) : null}
          <div className={cn(statusPillPending, 'mb-2 inline-block')}>{routeStatusLabel(selRoute.estado)}</div>
          <div className="mt-2.5">
            <strong>Mercancías</strong>
            <p className="mb-0 mt-1 leading-snug">{selRoute.mercanciasResumen}</p>
          </div>
          {selRoute.notasGenerales ? (
            <div className="mt-2.5">
              <strong>Notas generales</strong>
              <p className="mb-0 mt-1 leading-snug">{selRoute.notasGenerales}</p>
            </div>
          ) : null}
          <ul className="mb-0 mt-3 list-none space-y-0 p-0">
            {selRoute.paradas.map((p) => (
              <li
                key={p.id}
                className="mb-2.5 list-none border-b border-dashed border-[color-mix(in_oklab,var(--border)_80%,transparent)] pb-2.5"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-black text-[var(--muted)]">{p.orden}</span>
                  <button
                    type="button"
                    className={cn(
                      'cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5',
                      p.completada && 'text-[color-mix(in_oklab,var(--good)_92%,var(--muted))]',
                    )}
                    disabled={actionsLocked}
                    title={actionsLocked ? 'No disponible hasta registrar el pago' : 'Marcar tramo'}
                    onClick={() => toggleRouteStop(threadId, selRoute.id, p.id)}
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="font-extrabold">{tramoResumenLinea(p)}</div>
                {(p.origenLat || p.origenLng) && (
                  <div className="vt-muted">
                    Coord. origen: {p.origenLat ?? '—'}, {p.origenLng ?? '—'}
                  </div>
                )}
                {(p.destinoLat || p.destinoLng) && (
                  <div className="vt-muted">
                    Coord. destino: {p.destinoLat ?? '—'}, {p.destinoLng ?? '—'}
                  </div>
                )}
                {p.tiempoRecogidaEstimado ? (
                  <div className="vt-muted">Recogida: {p.tiempoRecogidaEstimado}</div>
                ) : null}
                {p.tiempoEntregaEstimado ? (
                  <div className="vt-muted">Entrega: {p.tiempoEntregaEstimado}</div>
                ) : null}
                {p.ventanaHoraria ? <div className="vt-muted">{p.ventanaHoraria}</div> : null}
                {p.precioTransportista ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    <strong>Precio transportista:</strong> {p.precioTransportista}
                  </div>
                ) : null}
                {p.cargaEnTramo ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    <strong>Carga en tramo:</strong> {p.cargaEnTramo}
                  </div>
                ) : null}
                {p.tipoMercanciaCarga || p.tipoMercanciaDescarga ? (
                  <div className="vt-muted">
                    Mercancía carga: {p.tipoMercanciaCarga ?? '—'} · descarga: {p.tipoMercanciaDescarga ?? '—'}
                  </div>
                ) : null}
                {p.responsabilidadEmbalaje ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    <strong>Responsabilidad embalaje:</strong> {p.responsabilidadEmbalaje}
                  </div>
                ) : null}
                {p.requisitosEspeciales ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    <strong>Requisitos especiales:</strong> {p.requisitosEspeciales}
                  </div>
                ) : null}
                {p.tipoVehiculoRequerido ? (
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    <strong>Vehículo requerido:</strong> {p.tipoVehiculoRequerido}
                  </div>
                ) : null}
                {p.notas ? <div className="mt-1 text-xs text-[var(--muted)]">{p.notas}</div> : null}
                {p.telefonoTransportista ? (
                  <div className="mt-1 text-xs font-semibold text-[var(--text)]">
                    <span className="text-[var(--muted)]">Contacto tramo: </span>
                    {p.telefonoTransportista}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : routeSheets.length === 0 ? (
        <p className="vt-muted px-1 py-3 text-[13px]">
          {!hasAcceptedContract
            ? 'Primero tenés que tener al menos un contrato aceptado; después podés crear la hoja de ruta y vincularla al acuerdo.'
            : 'Creá una hoja de ruta y vinculála al acuerdo desde Contratos (con mercancías) antes de publicar en la plataforma.'}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {routeSheets.map((r) => (
            <li key={r.id}>
              <button type="button" className={railItemClass} onClick={() => setSelRouteId(r.id)}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-extrabold leading-tight">{r.titulo}</span>
                  <span className={statusPillPending}>{routeStatusLabel(r.estado)}</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">
                  {r.paradas.length} tramo{r.paradas.length === 1 ? '' : 's'}
                  {r.publicadaPlataforma ? (
                    <span className="font-bold text-[color-mix(in_oklab,var(--primary)_85%,var(--muted))]">
                      {' '}
                      · Plataforma
                    </span>
                  ) : null}
                </div>
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
