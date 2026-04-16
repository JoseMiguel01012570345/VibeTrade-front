import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../../lib/cn'

function fmt(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' })
}

export function NotificationsBell() {
  const items = useAppStore((s) => s.notifications)
  const markAllRead = useAppStore((s) => s.markAllRead)
  const unread = useMemo(() => items.filter((x) => !x.read).length, [items])

  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    // Requirement: when the user sees notifications, hide the unread badge.
    markAllRead()
  }, [open, markAllRead])

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
        onClick={() => setOpen(true)}
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

      {open && (
        <div
          className="vt-modal-backdrop"
          role="button"
          tabIndex={0}
          aria-label="Cerrar notificaciones"
          onClick={(e) => {
            // Close only when user clicks the backdrop itself (not the modal content).
            if (e.target === e.currentTarget) setOpen(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpen(false)
          }}
        >
          <div className="vt-modal">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="vt-modal-title">Notificaciones</div>
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

            <div className="mt-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="vt-muted">Aún no hay notificaciones.</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'grid grid-cols-[32px_1fr] gap-2.5 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-3 py-2.5',
                        !n.read &&
                          'border-[color-mix(in_oklab,var(--primary)_20%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))]',
                      )}
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <Bell size={16} />
                      </div>
                      <div>
                        <div className="font-black tracking-[-0.02em]">{n.title}</div>
                        <div className="vt-muted">{n.body}</div>
                        <div className="mt-1.5 text-xs text-[var(--muted)]">{fmt(n.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="vt-modal-actions">
              <button
                type="button"
                className="vt-btn"
                onClick={() => {
                  markAllRead()
                  setOpen(false)
                }}
                disabled={items.length === 0}
              >
                <CheckCircle2 size={16} /> Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

