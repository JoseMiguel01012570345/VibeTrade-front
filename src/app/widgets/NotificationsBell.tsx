import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, History, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import type { NotificationItem } from '../store/useAppStore'
import { cn } from '../../lib/cn'
import { fetchChatNotifications, markChatNotificationsRead } from '../../utils/chat/chatApi'
import {
  DESKTOP_NOTIFICATIONS_PREF_STORAGE_KEY,
  getDesktopNotificationPermission,
  getDesktopNotificationsEnabledPreference,
  isDesktopNotificationSupported,
  requestDesktopNotificationPermission,
  setDesktopNotificationsEnabledPreference,
} from '../../utils/notifications/desktopNotifications'
import { notificationDeepLink } from '../../utils/notifications/notificationRoutes'
import { VtDateField } from '../../components/VtDateField'
import { VtTimeField } from '../../components/VtTimeField'
import {
  mapServerNotification,
  syncChatNotificationsFromServer,
} from '../../utils/notifications/notificationsSync'

/** Chat primero salvo avisos explícitos de comentario en ficha → oferta + ancla a comentarios. */
function notificationHref(n: {
  kind: string
  threadId?: string
  offerId?: string
  routeSheetId?: string
  highlightCarrierUserId?: string
}): string | null {
  return notificationDeepLink(
    n as Parameters<typeof notificationDeepLink>[0],
  )
}

function fmt(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function toIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toHm24(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Combina fecha (yyyy-MM-dd) y hora (HH:mm) en hora local y devuelve ms, o null. */
function localDateAndTimeToMs(dateIso: string, timeHm: string): number | null {
  const d = (dateIso ?? '').trim()
  const t = (timeHm ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  if (!/^\d{1,2}:\d{2}$/.test(t)) return null
  const m = new Date(`${d}T${t}`).getTime()
  return Number.isFinite(m) ? m : null
}

const NOTIF_PAGE_SIZE = 8

export function NotificationsBell() {
  const items = useAppStore((s) => s.notifications)
  const markAllRead = useAppStore((s) => s.markAllRead)
  const clearAllNotifications = useAppStore((s) => s.clearAllNotifications)
  const unread = useMemo(() => items.filter((x) => !x.read).length, [items])

  const [open, setOpen] = useState(false)
  const [historyFiltersOpen, setHistoryFiltersOpen] = useState(false)
  const [historyFromDate, setHistoryFromDate] = useState('')
  const [historyFromTime, setHistoryFromTime] = useState('')
  const [historyToDate, setHistoryToDate] = useState('')
  const [historyToTime, setHistoryToTime] = useState('')
  const [historyFiltered, setHistoryFiltered] = useState<NotificationItem[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [notifPage, setNotifPage] = useState(0)
  const [desktopNotifPerm, setDesktopNotifPerm] = useState<NotificationPermission>(() =>
    isDesktopNotificationSupported() ? getDesktopNotificationPermission() : 'denied',
  )
  const [desktopPref, setDesktopPref] = useState(() =>
    getDesktopNotificationsEnabledPreference(),
  )
  const filteredListAnchorRef = useRef<HTMLDivElement | null>(null)

  const desktopEffectiveOn =
    desktopPref && desktopNotifPerm === 'granted'

  useEffect(() => {
    if (!open) return
    setDesktopNotifPerm(getDesktopNotificationPermission())
    setDesktopPref(getDesktopNotificationsEnabledPreference())
  }, [open])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DESKTOP_NOTIFICATIONS_PREF_STORAGE_KEY) return
      setDesktopPref(getDesktopNotificationsEnabledPreference())
    }
    globalThis.addEventListener?.('storage', onStorage)
    return () => globalThis.removeEventListener?.('storage', onStorage)
  }, [])

  const toggleDesktopNotifications = useCallback(async () => {
    if (!isDesktopNotificationSupported()) return
    if (desktopEffectiveOn) {
      setDesktopNotificationsEnabledPreference(false)
      setDesktopPref(false)
      toast.success('Avisos fuera del navegador desactivados')
      return
    }
    setDesktopNotificationsEnabledPreference(true)
    setDesktopPref(true)
    if (desktopNotifPerm === 'default') {
      const p = await requestDesktopNotificationPermission()
      setDesktopNotifPerm(p)
      if (p === 'granted') {
        toast.success('Listo: te avisaremos cuando esta pestaña no esté activa')
      } else {
        toast.error('Sin permiso del navegador no podemos mostrar avisos del sistema')
      }
      return
    }
    if (desktopNotifPerm === 'denied') {
      toast.error(
        'Este sitio no tiene permiso. Abrí el candado de la barra de direcciones o la configuración del navegador y permití notificaciones.',
      )
      return
    }
    if (desktopNotifPerm === 'granted') {
      toast.success('Avisos fuera del navegador activados')
    }
  }, [desktopEffectiveOn, desktopNotifPerm])

  useEffect(() => {
    if (!open) return
    void (async () => {
      try {
        await syncChatNotificationsFromServer()
      } catch {
        /* ignore */
      }
      try {
        await markChatNotificationsRead()
      } catch {
        /* ignore */
      }
      markAllRead()
    })()
  }, [open, markAllRead])

  useEffect(() => {
    if (!open) return
    const onFocus = () => {
      void syncChatNotificationsFromServer()
    }
    globalThis.addEventListener?.('focus', onFocus)
    return () => globalThis.removeEventListener?.('focus', onFocus)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const w = globalThis as unknown as Window
    w.addEventListener('keydown', onKey)
    return () => w.removeEventListener('keydown', onKey)
  }, [open])

  const badgeText = unread > 99 ? '99+' : String(unread)

  const displayItems = historyFiltered !== null ? historyFiltered : items

  const notifPageCount = Math.max(1, Math.ceil(displayItems.length / NOTIF_PAGE_SIZE))
  const notifPageSafe = Math.min(notifPage, notifPageCount - 1)
  const pagedNotifItems = useMemo(() => {
    const start = notifPageSafe * NOTIF_PAGE_SIZE
    return displayItems.slice(start, start + NOTIF_PAGE_SIZE)
  }, [displayItems, notifPageSafe])

  const notifRangeLabel = useMemo(() => {
    if (displayItems.length === 0) return null
    const from = notifPageSafe * NOTIF_PAGE_SIZE + 1
    const to = Math.min((notifPageSafe + 1) * NOTIF_PAGE_SIZE, displayItems.length)
    return { from, to, total: displayItems.length }
  }, [displayItems.length, notifPageSafe])

  useEffect(() => {
    setNotifPage((p) => {
      const maxP = Math.max(0, Math.ceil(displayItems.length / NOTIF_PAGE_SIZE) - 1)
      return Math.min(p, maxP)
    })
  }, [displayItems.length, historyFiltered])

  useEffect(() => {
    if (!historyFiltered?.length) return
    filteredListAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [historyFiltered])

  const openHistoryWithDefaults = useCallback(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    setHistoryToDate(toIsoDate(end))
    setHistoryToTime(toHm24(end))
    setHistoryFromDate(toIsoDate(start))
    setHistoryFromTime(toHm24(start))
    setHistoryFiltersOpen(true)
    setHistoryError(null)
  }, [])

  const applyHistoryFilter = useCallback(async () => {
    const fromMs = localDateAndTimeToMs(historyFromDate, historyFromTime)
    const toMs = localDateAndTimeToMs(historyToDate, historyToTime)
    if (fromMs === null || toMs === null) {
      toast.error('Elegí fecha y hora de inicio y de fin.')
      return
    }
    if (fromMs > toMs) {
      toast.error('El inicio debe ser anterior o igual al fin.')
      return
    }
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const fromIso = new Date(fromMs).toISOString()
      const toIso = new Date(toMs).toISOString()
      const raw = await fetchChatNotifications({ from: fromIso, to: toIso })
      setNotifPage(0)
      setHistoryFiltered(raw.map(mapServerNotification))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar el historial.'
      setHistoryError(msg)
      setNotifPage(0)
      setHistoryFiltered([])
    } finally {
      setHistoryLoading(false)
    }
  }, [historyFromDate, historyFromTime, historyToDate, historyToTime])

  const handleClearAll = () => {
    void (async () => {
      try {
        await markChatNotificationsRead()
      } catch {
        /* offline / 401 */
      }
      clearAllNotifications()
    })()
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          'relative grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]',
          'shadow-[0_10px_25px_rgba(15,23,42,0.06)] hover:text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))]',
          'active:scale-[0.98]',
        )}
        aria-label="Abrir notificaciones"
        title="Notificaciones"
        onClick={() => {
          void (async () => {
            await syncChatNotificationsFromServer()
            setOpen(true)
          })()
        }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            className="absolute bottom-0 right-0 z-[1] grid h-5 min-w-5 translate-x-1/4 translate-y-1/4 place-items-center rounded-full bg-[var(--bad)] px-1 text-[11px] font-black leading-none text-white shadow-[0_10px_25px_rgba(239,68,68,0.25)]"
            aria-label={`${unread} notificaciones sin leer`}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={cn(
              'vt-modal-backdrop',
              /* Sobre la barra inferior (z-60); el overlay vivía en el header (z-50) y quedaba debajo. */
              '!z-[100]',
            )}
            role="button"
            tabIndex={0}
            aria-label="Cerrar notificaciones"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setOpen(false)
              }
            }}
          >
            <div
              className="vt-modal flex max-h-[min(88dvh,40rem)] w-[min(100vw-2.25rem,36rem)] max-w-[36rem] flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-5 pb-7 [-ms-overflow-style:none] [scrollbar-width:none] sm:min-w-[22rem] sm:px-6 sm:pt-6 sm:pb-8 [&::-webkit-scrollbar]:hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notifications-modal-title"
              onPointerDown={(e) => e.stopPropagation()}
            >
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div>
                <div className="vt-modal-title" id="notifications-modal-title">
                  Notificaciones
                </div>
                <div className="vt-modal-body">Historial y avisos recientes.</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-3 py-1.5 text-xs font-extrabold text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--muted)_14%,var(--surface))]"
                    onClick={() => {
                      if (historyFiltersOpen) {
                        setHistoryFiltersOpen(false)
                      } else {
                        openHistoryWithDefaults()
                      }
                    }}
                  >
                    <History size={14} aria-hidden />
                    {historyFiltersOpen ? 'Ocultar filtros' : 'Historial por fechas'}
                  </button>
                  {historyFiltered !== null ? (
                    <button
                      type="button"
                      className="text-xs font-extrabold text-[var(--primary)] underline-offset-2 hover:underline"
                      onClick={() => {
                        setNotifPage(0)
                        setHistoryFiltered(null)
                        setHistoryError(null)
                      }}
                    >
                      Ver avisos recientes
                    </button>
                  ) : null}
                </div>
                {historyFiltersOpen ? (
                  <div
                    className="mt-3 w-full min-w-0 rounded-[12px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 sm:p-4"
                    role="search"
                    aria-label="Filtro de notificaciones por rango de fechas"
                  >
                    <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Rango (hora local)
                    </div>
                    <div className="grid w-full min-w-0 grid-cols-1 gap-4">
                      <div className="min-w-0">
                        <div className="text-[12px] font-extrabold text-[var(--text)]">Desde</div>
                        <div className="mt-1.5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                          <div className="w-full min-w-0">
                            <VtDateField
                              value={historyFromDate}
                              onChange={setHistoryFromDate}
                              disabled={historyLoading}
                              className="w-full min-w-0"
                              buttonClassName="w-full min-w-0 justify-between gap-2"
                              placeholder="Fecha inicio"
                              aria-label="Fecha de inicio"
                            />
                          </div>
                          <div className="w-full min-w-0">
                            <VtTimeField
                              value={historyFromTime}
                              onChange={setHistoryFromTime}
                              disabled={historyLoading}
                              className="w-full min-w-0"
                              buttonClassName="w-full min-w-0 justify-between gap-2"
                              placeholder="Hora"
                              aria-label="Hora de inicio"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-extrabold text-[var(--text)]">Hasta</div>
                        <div className="mt-1.5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                          <div className="w-full min-w-0">
                            <VtDateField
                              value={historyToDate}
                              onChange={setHistoryToDate}
                              disabled={historyLoading}
                              className="w-full min-w-0"
                              buttonClassName="w-full min-w-0 justify-between gap-2"
                              placeholder="Fecha fin"
                              aria-label="Fecha de fin"
                            />
                          </div>
                          <div className="w-full min-w-0">
                            <VtTimeField
                              value={historyToTime}
                              onChange={setHistoryToTime}
                              disabled={historyLoading}
                              className="w-full min-w-0"
                              buttonClassName="w-full min-w-0 justify-between gap-2"
                              placeholder="Hora"
                              aria-label="Hora de fin"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="vt-btn vt-btn-primary text-xs font-extrabold"
                        onClick={() => void applyHistoryFilter()}
                        disabled={historyLoading}
                      >
                        {historyLoading ? 'Buscando…' : 'Aplicar filtro'}
                      </button>
                    </div>
                    {historyError ? (
                      <p className="mb-0 mt-2 text-[12px] font-semibold text-[var(--bad)]">{historyError}</p>
                    ) : null}
                  </div>
                ) : null}
                {historyFiltered !== null ? (
                  <p className="mb-0 mt-2 text-[11px] text-[var(--muted)]">
                    {displayItems.length} notificación
                    {displayItems.length === 1 ? '' : 'es'} en el rango elegido
                    {notifPageCount > 1 ? ' (usá Anterior / Siguiente abajo)' : ''}.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[var(--text)]"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {isDesktopNotificationSupported() && (
              <div
                className="mt-3 shrink-0 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-3 pr-4"
                role="region"
                aria-label="Notificaciones fuera del navegador"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1 pr-1">
                    <div className="text-sm font-extrabold leading-snug text-[var(--text)]">
                      Avisos fuera del navegador
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                      Cuando cambies de pestaña o minimices, el sistema puede mostrar avisos por mensajes y
                      alertas (mientras esta pestaña está al frente no duplicamos el aviso).
                    </p>
                    {desktopNotifPerm === 'denied' ? (
                      <p className="mt-2 text-xs font-semibold text-[var(--bad)]">
                        Permiso denegado: habilitá notificaciones para este sitio en el navegador.
                      </p>
                    ) : null}
                    {desktopNotifPerm === 'default' && !desktopEffectiveOn ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Activá el interruptor para que el navegador pida permiso.
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={desktopEffectiveOn}
                    aria-label={
                      desktopEffectiveOn
                        ? 'Desactivar avisos fuera del navegador'
                        : 'Activar avisos fuera del navegador'
                    }
                    className={cn(
                      'relative mt-0.5 h-7 w-11 shrink-0 overflow-hidden rounded-full border border-transparent transition-colors',
                      desktopEffectiveOn
                        ? 'bg-[var(--primary)]'
                        : 'bg-[color-mix(in_oklab,var(--muted)_32%,var(--border))]',
                    )}
                    onClick={() => void toggleDesktopNotifications()}
                  >
                    <span
                      className={cn(
                        'pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-[left] duration-200',
                        desktopEffectiveOn
                          ? 'left-[calc(100%-0.125rem-1.25rem)]'
                          : 'left-0.5',
                      )}
                      aria-hidden
                    />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex shrink-0 justify-end">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-extrabold',
                  'border-[color-mix(in_oklab,var(--bad)_35%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_6%,var(--surface))] text-[var(--text)]',
                  'hover:bg-[color-mix(in_oklab,var(--bad)_12%,var(--surface))] disabled:pointer-events-none disabled:opacity-40',
                )}
                disabled={items.length === 0 || historyFiltered !== null}
                title={
                  historyFiltered !== null
                    ? 'Volvé a “avisos recientes” para limpiar la bandeja en esta vista.'
                    : undefined
                }
                aria-label="Limpiar todas las notificaciones"
                onClick={handleClearAll}
              >
                <Trash2 size={16} className="text-[var(--bad)]" aria-hidden />
                Limpiar
              </button>
            </div>

            <div ref={filteredListAnchorRef} className="mt-3 flex flex-col gap-2 scroll-mt-3">
              {notifRangeLabel && notifPageCount > 1 ? (
                <p className="m-0 text-center text-[11px] text-[var(--muted)]" aria-live="polite">
                  {notifRangeLabel.from}–{notifRangeLabel.to} de {notifRangeLabel.total} · Página {notifPageSafe + 1} de {notifPageCount}
                </p>
              ) : null}
              <div className="pr-1">
              {displayItems.length === 0 ? (
                <div className="vt-muted">
                  {historyFiltered !== null
                    ? 'No hay notificaciones en este rango de fechas.'
                    : 'Aún no hay notificaciones.'}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {pagedNotifItems.map((n) => {
                    const wrapClass = cn(
                      'grid grid-cols-[32px_1fr] gap-2.5 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-3 py-2.5',
                      !n.read &&
                        'border-[color-mix(in_oklab,var(--primary)_20%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))]',
                    )
                    const inner = (
                      <>
                        <div className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                          <Bell size={16} />
                        </div>
                        <div>
                          <div className="font-black tracking-[-0.02em]">{n.title}</div>
                          <div className="vt-muted whitespace-pre-wrap break-words">{n.body}</div>
                          <div className="mt-1.5 text-xs text-[var(--muted)]">{fmt(n.createdAt)}</div>
                  {n.kind === 'route_tramo_subscribe' ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Ver suscriptor en el chat →
                    </div>
                  ) : n.kind === 'route_tramo_subscribe_accepted' ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Abrir chat de la operación →
                    </div>
                  ) : n.kind === 'route_tramo_subscribe_rejected' ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Ver oferta de ruta →
                    </div>
                  ) : n.kind === 'route_tramo_seller_expelled' && n.offerId ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Ver ficha o chat →
                    </div>
                  ) : n.kind === 'route_tramo_seller_expelled' && n.threadId ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Abrir chat →
                    </div>
                  ) : n.kind === 'route_sheet_presel' && n.threadId ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Abrir chat de la operación →
                    </div>
                  ) : n.kind === 'offer_comment' ||
                    n.kind === 'offer_like' ||
                    n.kind === 'qa_comment_like' ||
                    (!n.threadId && n.offerId) ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Ver oferta y comentarios →
                    </div>
                  ) : n.threadId ? (
                    <div className="mt-1.5 text-[11px] font-extrabold text-[var(--primary)]">
                      Abrir chat →
                    </div>
                  ) : null}
                        </div>
                      </>
                    )
                    const href = notificationHref(n)
                    return href ? (
                      <Link
                        key={n.id}
                        to={href}
                        className={cn(wrapClass, 'text-left no-underline text-[var(--text)]')}
                        onClick={() => setOpen(false)}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={n.id} className={wrapClass}>
                        {inner}
                      </div>
                    )
                  })}
                </div>
              )}
              </div>
              {displayItems.length > 0 && notifPageCount > 1 ? (
                <div className="mt-2 flex shrink-0 items-center justify-center gap-2 border-t border-[color-mix(in_oklab,var(--border)_70%,transparent)] pt-3 pb-1">
                  <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[var(--text)] disabled:pointer-events-none disabled:opacity-35"
                    aria-label="Página anterior"
                    disabled={notifPageSafe < 1}
                    onClick={() => setNotifPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={16} aria-hidden />
                    <span className="text-[11px] font-extrabold">Anterior</span>
                  </button>
                  <span className="min-w-[5.5rem] text-center text-[12px] font-extrabold text-[var(--muted)]">
                    {notifPageSafe + 1} / {notifPageCount}
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[var(--text)] disabled:pointer-events-none disabled:opacity-35"
                    aria-label="Página siguiente"
                    disabled={notifPageSafe >= notifPageCount - 1}
                    onClick={() => setNotifPage((p) => Math.min(notifPageCount - 1, p + 1))}
                  >
                    <span className="text-[11px] font-extrabold">Siguiente</span>
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}

