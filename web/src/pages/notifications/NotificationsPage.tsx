import { Bell, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../../app/store/useAppStore'
import './notifications.css'

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
      <div className="vt-notifs">
        <div className="vt-notifs-head">
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
            <div className="vt-notifs-list">
              {items.map((n) => (
                <div key={n.id} className={n.read ? 'vt-notif' : 'vt-notif vt-notif-unread'}>
                  <div className="vt-notif-icon">
                    <Bell size={16} />
                  </div>
                  <div className="vt-notif-main">
                    <div className="vt-notif-title">{n.title}</div>
                    <div className="vt-muted">{n.body}</div>
                    <div className="vt-notif-time">{fmt(n.createdAt)}</div>
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

