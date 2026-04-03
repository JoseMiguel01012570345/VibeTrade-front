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
import { agreementDeclaresMerchandise, type TradeAgreement } from './tradeAgreementTypes'
import { hasMerchandise } from './tradeAgreementValidation'
import type { RouteSheet } from './routeSheetTypes'
import { routeStatusLabel, tramoResumenLinea } from './routeSheetTypes'
import { buildChatParticipants } from './chatParticipants'
import { AgreementDetailView } from './AgreementDetailView'
import { PublishRouteSheetsModal } from './PublishRouteSheetsModal'

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
      return 'vt-agr-pill-pending'
    case 'accepted':
      return 'vt-agr-pill-ok'
    case 'rejected':
      return 'vt-agr-pill-no'
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

  return (
    <>
      <PublishRouteSheetsModal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        routeSheets={routeSheetsEligibleToPublish}
        onConfirm={confirmPublish}
      />
    <aside className="vt-chat-rail" aria-label="Contratos, rutas e integrantes del chat">
      <div className="vt-chat-rail-publish">
        <button
          type="button"
          className="vt-btn vt-btn-primary vt-chat-rail-publish-btn"
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
        <p className="vt-chat-rail-publish-hint">
          Solo se publican hojas ya vinculadas a un acuerdo (desde la pestaña Contratos). Creá la hoja en Rutas,
          vinculala al contrato y luego publicá (demo).
        </p>
      </div>
      <div className="vt-chat-rail-tabs">
        <button
          type="button"
          className={tab === 'contracts' ? 'vt-chat-rail-tab vt-chat-rail-tab--on' : 'vt-chat-rail-tab'}
          onClick={() => {
            setTab('contracts')
            setSelRouteId(null)
          }}
        >
          <FileText size={15} aria-hidden /> Contratos
        </button>
        <button
          type="button"
          className={tab === 'routes' ? 'vt-chat-rail-tab vt-chat-rail-tab--on' : 'vt-chat-rail-tab'}
          onClick={() => {
            setTab('routes')
            setSelContract(null)
          }}
        >
          <Route size={15} aria-hidden /> Rutas
        </button>
        <button
          type="button"
          className={tab === 'people' ? 'vt-chat-rail-tab vt-chat-rail-tab--on' : 'vt-chat-rail-tab'}
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
        <div className="vt-chat-rail-body">
          <div className="vt-chat-rail-filters">
            <button
              type="button"
              className={cFilter === 'all' ? 'vt-chat-rail-chip vt-chat-rail-chip--on' : 'vt-chat-rail-chip'}
              onClick={() => setCFilter('all')}
            >
              Todos
            </button>
            <button
              type="button"
              className={cFilter === 'store' ? 'vt-chat-rail-chip vt-chat-rail-chip--on' : 'vt-chat-rail-chip'}
              onClick={() => setCFilter('store')}
            >
              {storeName}
            </button>
            <button
              type="button"
              className={cFilter === 'buyer' ? 'vt-chat-rail-chip vt-chat-rail-chip--on' : 'vt-chat-rail-chip'}
              onClick={() => setCFilter('buyer')}
            >
              {buyerName}
            </button>
          </div>

          {selContract && agreementForDetail ? (
            <div className="vt-chat-rail-detail">
              <button type="button" className="vt-chat-rail-back" onClick={() => setSelContract(null)}>
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
            <p className="vt-muted vt-chat-rail-empty">No hay contratos.</p>
          ) : (
            <ul className="vt-chat-rail-list">
              {displayContracts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="vt-chat-rail-item"
                    onClick={() => setSelContract(c)}
                  >
                    <div className="vt-chat-rail-item-top">
                      <span className="vt-chat-rail-item-title">{c.title}</span>
                      <span className={statusClass(c.status)}>{statusLabel(c.status)}</span>
                    </div>
                    <div className="vt-chat-rail-item-meta">{c.issuerLabel}</div>
                    {agreementDeclaresMerchandise(c) &&
                    hasMerchandise({ merchandise: c.merchandise }) &&
                    (c.routeSheetId || c.routeSheetUrl) ? (
                      <div className="vt-chat-rail-item-links">
                        {c.routeSheetId ? (
                          <span className="vt-chat-rail-linkhint">
                            <MapPin size={12} /> Hoja de ruta (app)
                          </span>
                        ) : null}
                        {c.routeSheetUrl ? (
                          <span className="vt-chat-rail-linkhint">
                            <ExternalLink size={12} /> Externo
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <ChevronRight size={16} className="vt-chat-rail-item-chevron" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'routes' && (
        <div className="vt-chat-rail-body">
          <button
            type="button"
            className="vt-btn vt-btn-primary vt-chat-rail-new"
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
            <div className="vt-chat-rail-detail vt-chat-rail-detail--route">
              <div className="vt-chat-rail-route-actions">
                <button type="button" className="vt-chat-rail-back" onClick={() => setSelRouteId(null)}>
                  ← Lista
                </button>
                <button
                  type="button"
                  className="vt-btn vt-chat-rail-edit-route"
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
                    className="vt-btn vt-chat-rail-delete-route"
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
              <div className="vt-ruta-title">{selRoute.titulo}</div>
              {selRoute.publicadaPlataforma ? (
                <div className="vt-agr-pill-ok" style={{ display: 'inline-block', marginBottom: 8 }}>
                  En plataforma
                </div>
              ) : null}
              <div className="vt-agr-pill-pending" style={{ display: 'inline-block', marginBottom: 8 }}>
                {routeStatusLabel(selRoute.estado)}
              </div>
              <div className="vt-ruta-merc">
                <strong>Mercancías</strong>
                <p>{selRoute.mercanciasResumen}</p>
              </div>
              {selRoute.notasGenerales ? (
                <div className="vt-ruta-notes">
                  <strong>Notas generales</strong>
                  <p>{selRoute.notasGenerales}</p>
                </div>
              ) : null}
              <ol className="vt-ruta-stops">
                {selRoute.paradas.map((p) => (
                  <li key={p.id} className={p.completada ? 'vt-ruta-stop vt-ruta-stop--done' : 'vt-ruta-stop'}>
                    <div className="vt-ruta-stop-head">
                      <span className="vt-ruta-stop-n">{p.orden}</span>
                      <button
                        type="button"
                        className="vt-ruta-stop-check"
                        disabled={actionsLocked}
                        title={
                          actionsLocked
                            ? 'No disponible hasta registrar el pago'
                            : 'Marcar tramo'
                        }
                        onClick={() => toggleRouteStop(threadId, selRoute.id, p.id)}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="vt-ruta-stop-place">{tramoResumenLinea(p)}</div>
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
                      <div className="vt-ruta-stop-notes">
                        <strong>Precio transportista:</strong> {p.precioTransportista}
                      </div>
                    ) : null}
                    {p.cargaEnTramo ? (
                      <div className="vt-ruta-stop-notes">
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
                      <div className="vt-ruta-stop-notes">
                        <strong>Responsabilidad embalaje:</strong> {p.responsabilidadEmbalaje}
                      </div>
                    ) : null}
                    {p.requisitosEspeciales ? (
                      <div className="vt-ruta-stop-notes">
                        <strong>Requisitos especiales:</strong> {p.requisitosEspeciales}
                      </div>
                    ) : null}
                    {p.tipoVehiculoRequerido ? (
                      <div className="vt-ruta-stop-notes">
                        <strong>Vehículo requerido:</strong> {p.tipoVehiculoRequerido}
                      </div>
                    ) : null}
                    {p.notas ? <div className="vt-ruta-stop-notes">{p.notas}</div> : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : routeSheets.length === 0 ? (
            <p className="vt-muted vt-chat-rail-empty">
              {!hasAcceptedContract
                ? 'Primero tenés que tener al menos un contrato aceptado; después podés crear la hoja de ruta y vincularla al acuerdo.'
                : 'Creá una hoja de ruta y vinculála al acuerdo desde Contratos (con mercancías) antes de publicar en la plataforma.'}
            </p>
          ) : (
            <ul className="vt-chat-rail-list">
              {routeSheets.map((r) => (
                <li key={r.id}>
                  <button type="button" className="vt-chat-rail-item" onClick={() => setSelRouteId(r.id)}>
                    <div className="vt-chat-rail-item-top">
                      <span className="vt-chat-rail-item-title">{r.titulo}</span>
                      <span className="vt-agr-pill-pending">{routeStatusLabel(r.estado)}</span>
                    </div>
                    <div className="vt-chat-rail-item-meta">
                      {r.paradas.length} tramo{r.paradas.length === 1 ? '' : 's'}
                      {r.publicadaPlataforma ? (
                        <span className="vt-chat-rail-platform-badge"> · Plataforma</span>
                      ) : null}
                    </div>
                    <ChevronRight size={16} className="vt-chat-rail-item-chevron" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="vt-chat-rail-body">
          <p className="vt-muted vt-chat-rail-empty" style={{ marginBottom: 12 }}>
            Comprador y vendedor con acceso a este hilo.
          </p>
          <ul className="vt-chat-rail-participants">
            {participants.map((p) => (
              <li key={`${p.role}-${p.id}`}>
                <Link to={`/profile/${p.id}`} className="vt-chat-rail-participant" data-chat-interactive>
                  <span className="vt-chat-rail-participant-avatar" aria-hidden>
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="vt-chat-rail-participant-body">
                    <div className="vt-chat-rail-participant-name">{p.name}</div>
                    <div className="vt-chat-rail-participant-meta">
                      <span className="vt-chat-rail-participant-role">{p.roleLabel}</span>
                      {p.verified ? (
                        <span className="vt-chat-rail-participant-verified" title="Verificado">
                          <ShieldCheck size={12} aria-hidden />
                        </span>
                      ) : null}
                      <span className="vt-chat-trust" title="Confianza">
                        {p.trustScore}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="vt-chat-rail-item-chevron" aria-hidden />
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
