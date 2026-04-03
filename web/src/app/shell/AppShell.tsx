import { Link, Outlet, useLocation } from 'react-router-dom'
import { Bell, Home, MessageCircle, PlaySquare, User } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { TrustBar } from '../widgets/TrustBar'
import './shell.css'

const tabs = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/reels', label: 'Reels', icon: PlaySquare },
  { to: '/notifications', label: 'Notifs', icon: Bell },
  /** Lista en `/chat`; `activePrefix` mantiene el tab activo dentro de un hilo. */
  { to: '/chat', label: 'Chat', icon: MessageCircle, activePrefix: '/chat' },
  { to: '/profile/me', label: 'Perfil', icon: User },
] as const

function tabIsActive(pathname: string, t: (typeof tabs)[number]) {
  if ('activePrefix' in t && t.activePrefix) {
    const p = t.activePrefix
    return pathname === p || pathname.startsWith(`${p}/`)
  }
  return pathname === t.to || pathname.startsWith(`${t.to}/`)
}

export function AppShell() {
  const { pathname } = useLocation()
  const isOnboarding = pathname.startsWith('/onboarding')
  const isSessionActive = useAppStore((s) => s.isSessionActive)

  return (
    <div className="vt-app">
      <div className="vt-top">
        <div className="container">
          {isSessionActive ? <TrustBar /> : null}
        </div>
      </div>

      <main className="vt-main">
        <Outlet />
      </main>

      {!isOnboarding && (
        <nav className="vt-nav">
          <div className="container vt-nav-inner">
            {tabs.map((t) => {
              const active = tabIsActive(pathname, t)
              const Icon = t.icon
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={active ? 'vt-tab vt-tab-active' : 'vt-tab'}
                >
                  <Icon size={18} />
                  <span>{t.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
