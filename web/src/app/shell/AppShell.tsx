import { Link, Outlet, useLocation } from 'react-router-dom'
import { Bell, Home, MessageCircle, PlaySquare, User } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAppStore } from '../store/useAppStore'
import { TrustBar } from '../widgets/TrustBar'

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
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_65%,transparent)] backdrop-blur-[10px]">
        <div className="container">{isSessionActive ? <TrustBar /> : null}</div>
      </div>

      <main className="vt-main min-h-0 flex-1 py-4 pb-[88px]">
        <Outlet />
      </main>

      {!isOnboarding && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="container grid grid-cols-5 gap-1.5 py-2.5">
            {tabs.map((t) => {
              const active = tabIsActive(pathname, t)
              const Icon = t.icon
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-xs text-[var(--muted)]',
                    active &&
                      'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]',
                  )}
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
