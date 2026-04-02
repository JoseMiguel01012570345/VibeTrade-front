import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, CreditCard, ExternalLink, Image, Mail, Phone, Save, UserCog } from 'lucide-react'
import { type UserRole, useAppStore } from '../../app/store/useAppStore'
import './profile.css'

const REEL_TITLES: Record<string, string> = {
  r1: 'Cosecha: Malanga premium',
  r2: 'Flete 5 Ton - disponibilidad hoy',
  r3: 'Cadena fría: exportación hortícola',
  r4: 'Granos a granel — origen Rosario',
  r5: 'Semi-remolque disponible Bs.As. → NEA',
}

export function ProfilePage() {
  const { userId } = useParams()
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const setRole = useAppStore((s) => s.setRole)
  const saved = useAppStore((s) => s.savedReels)

  const isMe = userId === 'me' || userId === me.id
  const [tab, setTab] = useState<'account' | 'reels'>('account')

  const savedIds = useMemo(() => Object.keys(saved).filter((id) => saved[id]), [saved])

  return (
    <div className="container vt-page">
      <div className="vt-prof">
        <div className="vt-card vt-card-pad vt-prof-head">
          <div className="vt-prof-avatar">{(isMe ? me.name : userId ?? 'U').slice(0, 1).toUpperCase()}</div>
          <div className="vt-prof-main">
            <div className="vt-prof-name">{isMe ? me.name : `Usuario ${userId}`}</div>
            <div className="vt-muted">{isMe ? me.phone : '+—'}</div>
          </div>
          <button className="vt-btn" onClick={() => nav(-1)}>
            Volver
          </button>
        </div>

        <div className="vt-prof-tabs">
          <button className={tab === 'account' ? 'vt-prof-tab vt-prof-tab-active' : 'vt-prof-tab'} onClick={() => setTab('account')}>
            Cuenta
          </button>
          <button className={tab === 'reels' ? 'vt-prof-tab vt-prof-tab-active' : 'vt-prof-tab'} onClick={() => setTab('reels')}>
            Mis Reels
          </button>
        </div>

        {tab === 'account' && (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Configuración del usuario</div>
            <div className="vt-divider" style={{ margin: '12px 0' }} />

            <div className="vt-prof-form">
              <label className="vt-prof-field">
                <span className="vt-prof-label">
                  <Mail size={14} /> Email (obligatorio)
                </span>
                <input className="vt-input" defaultValue="demo@vibetrade.app" disabled={!isMe} />
              </label>

              <label className="vt-prof-field">
                <span className="vt-prof-label">
                  <Phone size={14} /> Teléfono (obligatorio)
                </span>
                <input className="vt-input" defaultValue={me.phone} disabled />
              </label>

              <label className="vt-prof-field">
                <span className="vt-prof-label">
                  <UserCog size={14} /> Rol (demo)
                </span>
                <select
                  className="vt-input"
                  disabled={!isMe}
                  value={me.role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="buyer">Comprador</option>
                  <option value="seller">Vendedor</option>
                  <option value="carrier">Transportista</option>
                </select>
              </label>

              <div className="vt-prof-field">
                <div className="vt-prof-label">
                  <ExternalLink size={14} /> Multi-cuenta (Instagram / Telegram / X)
                </div>
                <div className="vt-prof-links">
                  <button className="vt-btn" disabled={!isMe}>
                    <Camera size={16} /> Conectar Instagram
                  </button>
                  <button className="vt-btn" disabled={!isMe}>
                    Conectar Telegram
                  </button>
                  <button className="vt-btn" disabled={!isMe}>
                    Conectar X
                  </button>
                </div>
              </div>

              <div className="vt-prof-field">
                <div className="vt-prof-label">
                  <Image size={14} /> Imagen de perfil
                </div>
                <button className="vt-btn" disabled={!isMe}>
                  Subir imagen
                </button>
              </div>

              {isMe && (
                <div className="vt-prof-field">
                  <div className="vt-prof-label">
                    <CreditCard size={14} /> Configurar tarjetas de pago (solo propietario)
                  </div>
                  <div className="vt-muted">
                    Elegí una pasarela y añadí credenciales necesarias por pasarela (demo).
                  </div>
                  <button className="vt-btn">Configurar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'reels' && (
          <div className="vt-card vt-card-pad">
            <div className="vt-h2">Guardados</div>
            <div className="vt-muted" style={{ marginTop: 6 }}>
              Reels guardados desde la barra lateral de la experiencia inmersiva.
            </div>
            <div className="vt-divider" style={{ margin: '12px 0' }} />
            {savedIds.length === 0 ? (
              <div className="vt-muted">Aún no guardaste Reels.</div>
            ) : (
              <div className="vt-prof-saved">
                {savedIds.map((id) => (
                  <div key={id} className="vt-prof-saved-item">
                    <Save size={16} />
                    <div>
                      <div className="vt-prof-saved-title">{REEL_TITLES[id] ?? id}</div>
                      <div className="vt-muted">ID: {id}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

