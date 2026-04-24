import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Bell, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../../lib/cn'
import { markChatNotificationsRead } from '../../utils/chat/chatApi'
import {
  DESKTOP_NOTIFICATIONS_PREF_STORAGE_KEY,
  getDesktopNotificationPermission,
  getDesktopNotificationsEnabledPreference,
  isDesktopNotificationSupported,
  requestDesktopNotificationPermission,
  setDesktopNotificationsEnabledPreference,
} from '../../utils/notifications/desktopNotifications'
import { notificationDeepLink } from '../../utils/notifications/notificationRoutes'
import { syncChatNotificationsFromServer } from '../../utils/notifications/notificationsSync'

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

export function NotificationsBell() {
  const items = useAppStore((s) => s.notifications)
  const markAllRead = useAppStore((s) => s.markAllRead)
  const clearAllNotifications = useAppStore((s) => s.clearAllNotifications)
  const unread = useMemo(() => items.filter((x) => !x.read).length, [items])

  const [open, setOpen] = useState(false)
  const [desktopNotifPerm, setDesktopNotifPerm] = useState<NotificationPermission>(() =>
    isDesktopNotificationSupported() ? getDesktopNotificationPermission() : 'denied',
  )
  const [desktopPref, setDesktopPref] = useState(() =>
    getDesktopNotificationsEnabledPreference(),
  )

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
              className="vt-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notifications-modal-title"
              onPointerDown={(e) => e.stopPropagation()}
            >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="vt-modal-title" id="notifications-modal-title">
                  Notificaciones
                </div>
                <div className="vt-modal-body">Historial y avisos recientes.</div>
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
                className="mt-3 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-3 pr-4"
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

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-extrabold',
                  'border-[color-mix(in_oklab,var(--bad)_35%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_6%,var(--surface))] text-[var(--text)]',
                  'hover:bg-[color-mix(in_oklab,var(--bad)_12%,var(--surface))] disabled:pointer-events-none disabled:opacity-40',
                )}
                disabled={items.length === 0}
                aria-label="Limpiar todas las notificaciones"
                onClick={handleClearAll}
              >
                <Trash2 size={16} className="text-[var(--bad)]" aria-hidden />
                Limpiar
              </button>
            </div>

            <div className="mt-3 max-h-[60vh] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="vt-muted">Aún no hay notificaciones.</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {items.map((n) => {
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
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}

