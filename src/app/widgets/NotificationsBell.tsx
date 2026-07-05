import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, ExternalLink, History, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CeButton, CeDateField, CeModal, CeTimeField } from '@shared/components/ui'
import { useAppStore } from "@features/auth/logic/useAppStore"
import type { NotificationItem } from "@features/notifications/Dtos/notificationItem"
import { cn } from "@shared/lib/cn"
import { fetchChatNotifications, markChatNotificationsRead } from "@features/chat/api/chatApi"
import {
  DESKTOP_NOTIFICATIONS_PREF_STORAGE_KEY,
  getDesktopNotificationPermission,
  getDesktopNotificationsEnabledPreference,
  isDesktopNotificationSupported,
  requestDesktopNotificationPermission,
  setDesktopNotificationsEnabledPreference,
} from "@features/notifications/logic/desktopNotifications"
import { notificationDeepLink } from "@features/notifications/logic/notificationRoutes"
import { useNotifications, mapServerNotification } from '@features/notifications'

/** Chat primero salvo avisos explícitos de comentario en ficha → oferta + ancla a comentarios. */
function notificationHref(n: {
  kind: string
  threadId?: string
  offerId?: string
  routeSheetId?: string
  highlightCarrierUserId?: string
  stopId?: string
  preselStopIds?: string[]
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

const hintClass = 'mt-1.5 text-[11px] font-extrabold text-[var(--primary)]'

function formatBadgeText(unread: number): string {
  if (unread > 99) return '99+'
  return String(unread)
}

function historyToggleLabel(open: boolean): string {
  if (open) return 'Ocultar filtros'
  return 'Historial por fechas'
}

function applyFilterButtonLabel(loading: boolean): string {
  if (loading) return 'Buscando…'
  return 'Aplicar filtro'
}

function desktopToggleAriaLabel(enabled: boolean): string {
  if (enabled) return 'Desactivar avisos fuera del navegador'
  return 'Activar avisos fuera del navegador'
}

function clearNotificationsTitle(
  historyFiltered: NotificationItem[] | null,
): string | undefined {
  if (historyFiltered !== null) {
    return 'Vuelve a “avisos recientes” para limpiar la bandeja en esta vista.'
  }
  return undefined
}

function historyCountWord(count: number): string {
  if (count === 1) return 'notificación'
  return 'notificaciones'
}

function historyPaginationSuffix(pageCount: number): string {
  if (pageCount > 1) return ' (usa Anterior / Siguiente abajo)'
  return ''
}

function emptyNotificationsMessage(
  historyFiltered: NotificationItem[] | null,
): string {
  if (historyFiltered !== null) {
    return 'No hay notificaciones en este rango de fechas.'
  }
  return 'Aún no hay notificaciones.'
}

function ViewRecentNotificationsButton({
  onClick,
}: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      className="text-xs font-extrabold text-[var(--primary)] underline-offset-2 hover:underline"
      onClick={onClick}
    >
      Ver avisos recientes
    </button>
  )
}

function HistoryFiltersPanel({
  historyFromDate,
  historyFromTime,
  historyToDate,
  historyToTime,
  historyLoading,
  historyError,
  onFromDateChange,
  onFromTimeChange,
  onToDateChange,
  onToTimeChange,
  onApply,
}: Readonly<{
  historyFromDate: string
  historyFromTime: string
  historyToDate: string
  historyToTime: string
  historyLoading: boolean
  historyError: string | null
  onFromDateChange: (value: string) => void
  onFromTimeChange: (value: string) => void
  onToDateChange: (value: string) => void
  onToTimeChange: (value: string) => void
  onApply: () => void
}>) {
  return (
    <div
      className="mt-3 w-full min-w-0 rounded-[12px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 sm:p-4"
      role="search"
      aria-label="Filtro de notificaciones por rango de fechas"
    >
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
        Rango (hora local)
      </div>
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <CeDateField
          label="Desde (fecha)"
          value={historyFromDate}
          onChange={onFromDateChange}
        />
        <CeTimeField
          label="Desde (hora)"
          value={historyFromTime}
          onChange={onFromTimeChange}
          disabled={historyLoading}
        />
        <CeDateField
          label="Hasta (fecha)"
          value={historyToDate}
          onChange={onToDateChange}
        />
        <CeTimeField
          label="Hasta (hora)"
          value={historyToTime}
          onChange={onToTimeChange}
          disabled={historyLoading}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CeButton
          size="sm"
          loading={historyLoading}
          onClick={onApply}
        >
          {applyFilterButtonLabel(historyLoading)}
        </CeButton>
      </div>
      {historyError && (
        <p className="mb-0 mt-2 text-[12px] font-semibold text-[var(--bad)]">{historyError}</p>
      )}
    </div>
  )
}

function HistoryRangeSummary({
  count,
  pageCount,
}: Readonly<{ count: number; pageCount: number }>) {
  return (
    <p className="mb-0 mt-2 text-[11px] text-[var(--muted)]">
      {count} {historyCountWord(count)} en el rango elegido
      {historyPaginationSuffix(pageCount)}.
    </p>
  )
}

function DesktopNotificationHints({
  permission,
  effectiveOn,
}: Readonly<{ permission: NotificationPermission; effectiveOn: boolean }>) {
  if (permission === 'denied') {
    return (
      <p className="mt-2 text-xs font-semibold text-[var(--bad)]">
        Permiso denegado: habilitá notificaciones para este sitio en el navegador.
      </p>
    )
  }
  if (permission === 'default' && !effectiveOn) {
    return (
      <p className="mt-2 text-xs text-[var(--muted)]">
        Activá el interruptor para que el navegador pida permiso.
      </p>
    )
  }
  return null
}

function DesktopNotificationToggle({
  enabled,
  onToggle,
}: Readonly<{ enabled: boolean; onToggle: () => void }>) {
  let trackClass = 'bg-[color-mix(in_oklab,var(--muted)_32%,var(--border))]'
  let thumbClass = 'left-0.5'
  if (enabled) {
    trackClass = 'bg-[var(--primary)]'
    thumbClass = 'left-[calc(100%-0.125rem-1.25rem)]'
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={desktopToggleAriaLabel(enabled)}
      className={cn(
        'relative mt-0.5 h-7 w-11 shrink-0 overflow-hidden rounded-full border border-transparent transition-colors',
        trackClass,
      )}
      onClick={onToggle}
    >
      <span
        className={cn(
          'pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-[left] duration-200',
          thumbClass,
        )}
        aria-hidden
      />
    </button>
  )
}

function NotificationsRangeLabel({
  label,
  pageCount,
  pageIndex,
}: Readonly<{
  label: { from: number; to: number; total: number }
  pageCount: number
  pageIndex: number
}>) {
  if (pageCount <= 1) return null
  return (
    <p className="m-0 text-center text-[11px] text-[var(--muted)]" aria-live="polite">
      {label.from}–{label.to} de {label.total} · Página {pageIndex + 1} de {pageCount}
    </p>
  )
}

function NotificationKindHint({ n }: Readonly<{ n: NotificationItem }>) {
  if (n.kind === 'route_tramo_subscribe') {
    return <div className={hintClass}>Ver suscriptor en el chat →</div>
  }
  if (n.kind === 'route_tramo_subscribe_accepted') {
    return (
      <div className="mt-1.5 flex flex-col gap-1">
        <div className={hintClass}>Abrir chat de la operación →</div>
        {n.storeServiceId && (
          <Link
            to={`/offer/${encodeURIComponent(n.storeServiceId)}`}
            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--primary)] no-underline hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver ficha del servicio <ExternalLink size={12} aria-hidden />
          </Link>
        )}
      </div>
    )
  }
  if (n.kind === 'route_tramo_subscribe_rejected') {
    return <div className={hintClass}>Ver oferta de ruta →</div>
  }
  if (n.kind === 'route_tramo_seller_expelled' && n.offerId) {
    return <div className={hintClass}>Ver ficha o chat →</div>
  }
  if (n.kind === 'route_tramo_seller_expelled' && n.threadId) {
    return <div className={hintClass}>Abrir chat →</div>
  }
  if (n.kind === 'route_sheet_presel' && n.threadId) {
    return <div className={hintClass}>Ver invitación (mapa y datos) →</div>
  }
  if (n.kind === 'route_sheet_presel_decl' && n.threadId) {
    return <div className={hintClass}>Abrir chat de la operación →</div>
  }
  if (n.kind === 'route_ownership_granted' && n.threadId) {
    return <div className={hintClass}>Abrir Rutas en el chat →</div>
  }
  if (n.kind === 'store_trust_penalty' && n.threadId) {
    return <div className={hintClass}>Abrir chat de la operación →</div>
  }
  if (n.kind === 'store_trust_penalty' && n.offerId) {
    return <div className={hintClass}>Ver ficha →</div>
  }
  if (
    n.kind === 'offer_comment' ||
    n.kind === 'offer_like' ||
    n.kind === 'qa_comment_like' ||
    (!n.threadId && n.offerId)
  ) {
    return <div className={hintClass}>Ver oferta y comentarios →</div>
  }
  if (n.threadId) {
    return <div className={hintClass}>Abrir chat →</div>
  }
  return null
}

function NotificationRow({
  n,
  onClose,
}: Readonly<{ n: NotificationItem; onClose: () => void }>) {
  const wrapClass = cn(
    'grid grid-cols-[32px_1fr] gap-2.5 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-3 py-2.5',
    !n.read &&
      'border-[color-mix(in_oklab,var(--primary)_20%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))]',
  )
  const content = (
    <>
      <div className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <Bell size={16} />
      </div>
      <div>
        <div className="font-black tracking-[-0.02em]">{n.title}</div>
        <div className="vt-muted whitespace-pre-wrap break-words">{n.body}</div>
        <div className="mt-1.5 text-xs text-[var(--muted)]">{fmt(n.createdAt)}</div>
        <NotificationKindHint n={n} />
      </div>
    </>
  )
  const href = notificationHref(n)
  if (href) {
    return (
      <Link
        to={href}
        className={cn(wrapClass, 'text-left no-underline text-[var(--text)]')}
        onClick={onClose}
      >
        {content}
      </Link>
    )
  }
  return <div className={wrapClass}>{content}</div>
}

function NotificationsList({
  items,
  historyFiltered,
  onClose,
}: Readonly<{
  items: NotificationItem[]
  historyFiltered: NotificationItem[] | null
  onClose: () => void
}>) {
  if (items.length === 0) {
    return (
      <div className="vt-muted">{emptyNotificationsMessage(historyFiltered)}</div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((n) => (
        <NotificationRow key={n.id} n={n} onClose={onClose} />
      ))}
    </div>
  )
}

function NotificationsPagination({
  pageIndex,
  pageCount,
  onPrevious,
  onNext,
}: Readonly<{
  pageIndex: number
  pageCount: number
  onPrevious: () => void
  onNext: () => void
}>) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-center gap-2 border-t border-gray-200 pt-3 pb-1 dark:border-gray-600">
      <CeButton
        color="gray"
        outline
        size="sm"
        aria-label="Página anterior"
        disabled={pageIndex < 1}
        onClick={onPrevious}
      >
        <ChevronLeft size={16} aria-hidden />
        Anterior
      </CeButton>
      <span className="min-w-[5.5rem] text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
        {pageIndex + 1} / {pageCount}
      </span>
      <CeButton
        color="gray"
        outline
        size="sm"
        aria-label="Página siguiente"
        disabled={pageIndex >= pageCount - 1}
        onClick={onNext}
      >
        Siguiente
        <ChevronRight size={16} aria-hidden />
      </CeButton>
    </div>
  )
}

export function NotificationsBell() {
  const { items, unread, markAllRead, syncFromServer } = useNotifications()
  const clearAllNotifications = useAppStore((s) => s.clearAllNotifications)

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
        'Este sitio no tiene permiso. Abre el candado de la barra de direcciones o la configuración del navegador y permití notificaciones.',
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
        await syncFromServer()
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
      void syncFromServer()
    }
    globalThis.addEventListener?.('focus', onFocus)
    return () => globalThis.removeEventListener?.('focus', onFocus)
  }, [open])

  const badgeText = formatBadgeText(unread)

  const displayItems = historyFiltered ?? items

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
      toast.error('Elige fecha y hora de inicio y de fin.')
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
            await syncFromServer()
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

      <CeModal
        show={open}
        onClose={() => setOpen(false)}
        size="2xl"
        bodyClassName="flex max-h-[min(78dvh,40rem)] flex-col gap-3 overflow-y-auto pt-2"
        title={
          <span className="inline-flex items-center gap-2">
            <Bell
              size={22}
              className="shrink-0 text-primary-600 dark:text-primary-400"
              aria-hidden
            />
            Notificaciones
          </span>
        }
      >
        <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
          Historial y avisos recientes.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <CeButton
            color="gray"
            outline
            size="sm"
            onClick={() => {
              if (historyFiltersOpen) {
                setHistoryFiltersOpen(false)
              } else {
                openHistoryWithDefaults()
              }
            }}
          >
            <History size={14} aria-hidden />
            {historyToggleLabel(historyFiltersOpen)}
          </CeButton>
          {historyFiltered !== null ? (
            <ViewRecentNotificationsButton
              onClick={() => {
                setNotifPage(0)
                setHistoryFiltered(null)
                setHistoryError(null)
              }}
            />
          ) : null}
        </div>

        {historyFiltersOpen ? (
          <HistoryFiltersPanel
            historyFromDate={historyFromDate}
            historyFromTime={historyFromTime}
            historyToDate={historyToDate}
            historyToTime={historyToTime}
            historyLoading={historyLoading}
            historyError={historyError}
            onFromDateChange={setHistoryFromDate}
            onFromTimeChange={setHistoryFromTime}
            onToDateChange={setHistoryToDate}
            onToTimeChange={setHistoryToTime}
            onApply={() => void applyHistoryFilter()}
          />
        ) : null}

        {historyFiltered !== null ? (
          <HistoryRangeSummary
            count={displayItems.length}
            pageCount={notifPageCount}
          />
        ) : null}

        {isDesktopNotificationSupported() ? (
          <div
            className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 dark:border-gray-600 dark:bg-gray-800/50"
            role="region"
            aria-label="Notificaciones fuera del navegador"
          >
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1 pr-1">
                <div className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                  Avisos fuera del navegador
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                  Cuando cambies de pestaña o minimices, el sistema puede mostrar avisos por mensajes y
                  alertas (mientras esta pestaña está al frente no duplicamos el aviso).
                </p>
                <DesktopNotificationHints
                  permission={desktopNotifPerm}
                  effectiveOn={desktopEffectiveOn}
                />
              </div>
              <DesktopNotificationToggle
                enabled={desktopEffectiveOn}
                onToggle={() => void toggleDesktopNotifications()}
              />
            </div>
          </div>
        ) : null}

        <div className="flex shrink-0 justify-end">
          <CeButton
            color="failure"
            outline
            size="sm"
            disabled={items.length === 0 || historyFiltered !== null}
            title={clearNotificationsTitle(historyFiltered)}
            aria-label="Limpiar todas las notificaciones"
            onClick={handleClearAll}
          >
            <Trash2 size={16} aria-hidden />
            Limpiar
          </CeButton>
        </div>

        <div ref={filteredListAnchorRef} className="flex flex-col gap-2 scroll-mt-3">
          {notifRangeLabel ? (
            <NotificationsRangeLabel
              label={notifRangeLabel}
              pageCount={notifPageCount}
              pageIndex={notifPageSafe}
            />
          ) : null}
          <NotificationsList
            items={pagedNotifItems}
            historyFiltered={historyFiltered}
            onClose={() => setOpen(false)}
          />
          {displayItems.length > 0 && notifPageCount > 1 ? (
            <NotificationsPagination
              pageIndex={notifPageSafe}
              pageCount={notifPageCount}
              onPrevious={() => setNotifPage((p) => Math.max(0, p - 1))}
              onNext={() => setNotifPage((p) => Math.min(notifPageCount - 1, p + 1))}
            />
          ) : null}
        </div>
      </CeModal>
    </>
  )
}
