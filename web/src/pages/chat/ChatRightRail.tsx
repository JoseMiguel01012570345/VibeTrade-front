import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  MapPin,
  Megaphone,
  Pencil,
  Route,
  Trash2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { StoreBadge } from '../../app/store/useMarketStore'
import { useMarketStore } from '../../app/store/useMarketStore'
import { cn } from '../../lib/cn'
import { agreementDeclaresMerchandise, type TradeAgreement } from './tradeAgreementTypes'
import { hasMerchandise } from './tradeAgreementValidation'
import type { RouteSheet } from './routeSheetTypes'
import { routeStatusLabel, tramoResumenLinea } from './routeSheetTypes'
import { buildChatParticipants } from './chatParticipants'
import { AgreementDetailView } from './AgreementDetailView'
import { PublishRouteSheetsModal } from './PublishRouteSheetsModal'
import { statusPillNo, statusPillOk, statusPillPending } from './formModalStyles'

export type ContractFilter = 'all' | 'store' | 'buyer'

type Props = {
  threadId: string
  contracts: TradeAgreement[]
  routeSheets: RouteSheet[]
  /** Sin pago tras salir con acuerdo emitido: solo lectura en acciones de contratos/rutas. */
  actionsLocked?: boolean
  storeName: string
  buyerName: string
  buyer: { id: string; name: string; trustScore: number }
  seller: StoreBadge
  /** Al incrementarse, cambia a la pestaña Integrantes (p. ej. desde el encabezado del chat). */
  participantsFocusEpoch?: number
  focusRouteId?: string | null
  onConsumedRouteFocus?: () => void
  onOpenNewRouteSheet: () => void
  onEditRouteSheet: (sheet: RouteSheet) => void
  toggleRouteStop: (threadId: string, routeSheetId: string, stopId: string) => void
}

const RAIL_ROOT =
  'vt-chat-rail flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] max-[960px]:min-h-[min(480px,70vh)]'

const RAIL_BODY =
  'min-h-0 flex-1 overflow-auto px-3.5 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'

const TAB_BASE =
  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent py-2.5 text-[13px] font-extrabold text-[var(--muted)] max-[1100px]:gap-1 max-[1100px]:px-1 max-[1100px]:text-[11px]'

const TAB_ON =
  'text-[var(--text)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] shadow-[inset_0_-2px_0_var(--primary)]'

function statusLabel(s: TradeAgreement['status']) {
  switch (s) {
    case 'pending_buyer':
      return 'Pendiente'
    case 'accepted':
      return 'Aceptado'
    case 'rejected':
      return 'Rechazado'
    default:
      return s
  }
}

function statusClass(s: TradeAgreement['status']) {
  switch (s) {
    case 'pending_buyer':
      return statusPillPending
    case 'accepted':
      return statusPillOk
    case 'rejected':
      return statusPillNo
    default:
      return ''
  }
}

export function ChatRightRail({
  threadId,
  contracts,
  routeSheets,
  actionsLocked = false,
  storeName,
  buyerName,
  focusRouteId,
  buyer,
  seller,
  participantsFocusEpoch = 0,
  onConsumedRouteFocus,
  onOpenNewRouteSheet,
  onEditRouteSheet,
  toggleRouteStop,
}: Props) {
  const publishRouteSheetsToPlatform = useMarketStore((s) => s.publishRouteSheetsToPlatform)
  const linkAgreementToRouteSheet = useMarketStore((s) => s.linkAgreementToRouteSheet)
  const deleteRouteSheet = useMarketStore((s) => s.deleteRouteSheet)
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

  useEffect(() => {
    if (!participantsFocusEpoch) return
    setTab('people')
    setSelContract(null)
    setSelRouteId(null)
  }, [participantsFocusEpoch])

  const participants = useMemo(() => buildChatParticipants(buyer, seller), [buyer, seller])

  const hasAcceptedContract = useMemo(
    () => contracts.some((c) => c.status === 'accepted'),
    [contracts],
  )

  const routeSheetsUnpublished = useMemo(
    () => routeSheets.filter((r) => !r.publicadaPlataforma).length,
    [routeSheets],
  )

  const linkedRouteSheetIds = useMemo(() => {
    const s = new Set<string>()
    for (const c of contracts) {
      if (c.routeSheetId) s.add(c.routeSheetId)
    }
    return s
  }, [contracts])

  /** No publicadas y vinculadas a algún acuerdo (único caso publicable). */
  const routeSheetsEligibleToPublish = useMemo(
    () => routeSheets.filter((r) => !r.publicadaPlataforma && linkedRouteSheetIds.has(r.id)),
    [routeSheets, linkedRouteSheetIds],
  )

  const displayContracts = useMemo(() => {
    if (cFilter === 'all') return contracts
    if (cFilter === 'store') return contracts.filter((c) => c.issuerLabel === storeName)
    return contracts.filter((c) => c.status === 'pending_buyer' || c.respondedAt != null)
  }, [contracts, cFilter, storeName])

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
      if (routeSheetsUnpublished > 0) {
        toast.error(
          'Solo podés publicar hojas vinculadas a un acuerdo. Abrí el contrato en Contratos y usá «Vincular».',
        )
      } else {
        toast('Las hojas de ruta de este chat ya están publicadas en la plataforma', { icon: 'ℹ️' })
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
      `Publicado en la plataforma (${allowed.length} hoja${allowed.length === 1 ? '' : 's'}) — demo`,
    )
  }

  const chip = (on: boolean) =>
    cn(
      'cursor-pointer rounded-full border px-2 py-1 text-[11px]',
      on
        ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-extrabold'
        : 'border-[var(--border)] bg-[var(--surface)]',
    )

  const railItem =
    'relative w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_60%,transparent)] py-2.5 pl-2.5 pr-7 text-left hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))]'

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
            Publicar en la plataforma
          </button>
          <p className="mb-0 mt-2 text-[11px] leading-snug text-[var(--muted)]">
            Solo se publican hojas ya vinculadas a un acuerdo (desde la pestaña Contratos). Creá la hoja en Rutas,
            vinculala al contrato y luego publicá (demo).
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
          <div className={RAIL_BODY}>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <button type="button" className={chip(cFilter === 'all')} onClick={() => setCFilter('all')}>
                Todos
              </button>
              <button type="button" className={chip(cFilter === 'store')} onClick={() => setCFilter('store')}>
                {storeName}
              </button>
              <button type="button" className={chip(cFilter === 'buyer')} onClick={() => setCFilter('buyer')}>
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
                <AgreementDetailView
                  a={agreementForDetail}
                  routeSheets={routeSheets}
                  linkActionsDisabled={actionsLocked}
                  onLinkRouteSheet={(agreementId, routeSheetId) => {
                    const ok = linkAgreementToRouteSheet(threadId, agreementId, routeSheetId)
                    if (ok) toast.success('Vinculación registrada; se notificó en el chat')
                    else toast.error('No se pudo vincular (elegí otra hoja).')
                  }}
                  onOpenRouteSheet={(rid) => {
                    setTab('routes')
                    setSelRouteId(rid)
                    setSelContract(null)
                  }}
                />
              </div>
            ) : displayContracts.length === 0 ? (
              <p className="vt-muted px-1 py-3 text-[13px]">No hay contratos.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {displayContracts.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={railItem} onClick={() => setSelContract(c)}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-extrabold leading-tight">{c.title}</span>
                        <span className={statusClass(c.status)}>{statusLabel(c.status)}</span>
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
                      <ChevronRight size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'routes' && (
          <div className={RAIL_BODY}>
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
                    disabled={actionsLocked || !!selRoute.publicadaPlataforma}
                    title={
                      actionsLocked
                        ? 'No disponible hasta registrar el pago'
                        : selRoute.publicadaPlataforma
                          ? 'No se puede editar una hoja ya publicada'
                          : 'Editar hoja de ruta'
                    }
                    onClick={() => {
                      if (selRoute.publicadaPlataforma) {
                        toast.error('No se puede editar una hoja de ruta ya publicada en la plataforma.')
                        return
                      }
                      onEditRouteSheet(selRoute)
                    }}
                  >
                    <Pencil size={14} aria-hidden /> Editar
                  </button>
                  {!selRoute.publicadaPlataforma ? (
                    <button
                      type="button"
                      className="vt-btn inline-flex items-center gap-1.5 border-[color-mix(in_oklab,#dc2626_28%,var(--border))] bg-[color-mix(in_oklab,#dc2626_6%,var(--surface))] px-2.5 py-1.5 text-xs text-[color-mix(in_oklab,#dc2626_88%,var(--text))] hover:bg-[color-mix(in_oklab,#dc2626_10%,var(--surface))]"
                      disabled={actionsLocked}
                      title={
                        actionsLocked
                          ? 'No disponible hasta registrar el pago'
                          : 'Eliminar esta hoja (no disponible si ya está publicada en la plataforma)'
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
                          toast.error('No se puede eliminar una hoja ya publicada en la plataforma.')
                        }
                      }}
                    >
                      <Trash2 size={14} aria-hidden /> Eliminar
                    </button>
                  ) : null}
                </div>
                <div className="mb-1.5 text-[15px] font-black">{selRoute.titulo}</div>
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
                          title={
                            actionsLocked ? 'No disponible hasta registrar el pago' : 'Marcar tramo'
                          }
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
                      {(p.tipoMercanciaCarga || p.tipoMercanciaDescarga) ? (
                        <div className="vt-muted">
                          Mercancía carga: {p.tipoMercanciaCarga ?? '—'} · descarga:{' '}
                          {p.tipoMercanciaDescarga ?? '—'}
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
                    <button type="button" className={railItem} onClick={() => setSelRouteId(r.id)}>
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
                      <ChevronRight size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'people' && (
          <div className={RAIL_BODY}>
            <p className="vt-muted mb-3 px-1 py-3 text-[13px]">Comprador y vendedor con acceso a este hilo.</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {participants.map((p) => (
                <li key={`${p.role}-${p.id}`}>
                  <Link
                    to={`/profile/${p.id}`}
                    className="relative flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_60%,transparent)] py-2.5 pl-2.5 pr-7 text-inherit no-underline hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))]"
                    data-chat-interactive
                  >
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[15px] font-black text-[var(--text)]"
                      aria-hidden
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold leading-tight">{p.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-[var(--muted)]">
                        <span className="font-bold">{p.roleLabel}</span>
                        {p.verified ? (
                          <span className="inline-flex text-[var(--primary)]" title="Verificado">
                            <ShieldCheck size={12} aria-hidden />
                          </span>
                        ) : null}
                        <span
                          className="ml-auto inline-flex rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-1 text-[11px] font-black text-[var(--muted)]"
                          title="Confianza"
                        >
                          {p.trustScore}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </>
  )
}
