import { Bell, CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAppStore } from '../../app/store/useAppStore'

function fmt(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' })
}

export function NotificationsPage() {
  const items = useAppStore((s) => s.notifications)
  const markAllRead = useAppStore((s) => s.markAllRead)
  const unread = items.filter((x) => !x.read).length

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="vt-h1">Notificaciones</h1>
            <div className="vt-muted">
              Prioridad alta: respuestas a preguntas y confirmaciones de pago aparecen como banner superior (toast).
              Aquí se guarda el historial.
            </div>
          </div>
          <button className="vt-btn" onClick={markAllRead} disabled={items.length === 0}>
            <CheckCircle2 size={16} /> Marcar todo leído {unread ? `(${unread})` : ''}
          </button>
        </div>

        <div className="vt-card vt-card-pad">
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
      </div>
    </div>
  )
}
