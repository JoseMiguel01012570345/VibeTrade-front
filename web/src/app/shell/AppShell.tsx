import { Link, Outlet, useLocation } from 'react-router-dom'
import { Bell, Home, MessageCircle, PlaySquare, User } from 'lucide-react'
import { TrustBar } from '../widgets/TrustBar'
import './shell.css'

const tabs = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/reels', label: 'Reels', icon: PlaySquare },
  { to: '/notifications', label: 'Notifs', icon: Bell },
  { to: '/chat/demo', label: 'Chat', icon: MessageCircle },
  { to: '/profile/me', label: 'Perfil', icon: User },
] as const

export function AppShell() {
  const { pathname } = useLocation()
  const isOnboarding = pathname.startsWith('/onboarding')

  return (
    <div className="vt-app">
      <div className="vt-top">
        <div className="container">
          <TrustBar />
        </div>
      </div>

      <main className="vt-main">
        <Outlet />
      </main>

      {!isOnboarding && (
        <nav className="vt-nav">
          <div className="container vt-nav-inner">
            {tabs.map((t) => {
              const active = pathname === t.to || pathname.startsWith(t.to + '/')
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
