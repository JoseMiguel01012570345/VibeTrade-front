import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, LogIn, MessageCircle, PlaySquare, User } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAppStore } from '../store/useAppStore'
import { TrustBar } from '../widgets/TrustBar'
import { NotificationsBell } from '../widgets/NotificationsBell'
import { ProtectedMediaImg } from '../../components/media/ProtectedMediaImg'
import { AuthEntryModal } from '../../pages/onboarding/AuthEntryModal'

const tabs = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/reels', label: 'Reels', icon: PlaySquare },
  /** Lista en `/chat`; `activePrefix` mantiene el tab activo dentro de un hilo. */
  { to: '/chat', label: 'Chat', icon: MessageCircle, activePrefix: '/chat' },
  /** Cuenta / Reels / Tiendas viven bajo `/profile/me/...`. */
  {
    to: '/profile/me/account',
    label: 'Perfil',
    icon: User,
    activePrefix: '/profile/me',
  },
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
  const me = useAppStore((s) => s.me)
  const authOpen = useAppStore((s) => s.authModalOpen)
  const openAuthModal = useAppStore((s) => s.openAuthModal)
  const closeAuthModal = useAppStore((s) => s.closeAuthModal)

  return (
    <div className="vt-app flex min-h-screen flex-col">
      <div className="sticky top-0 z-50 overflow-visible border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_65%,transparent)] pt-[max(10px,env(safe-area-inset-top,0px))] backdrop-blur-[10px]">
        <div className="container flex items-center justify-between gap-3 pb-2.5">
          <div className="min-w-0 flex-1">
            {isSessionActive ? <TrustBar /> : null}
          </div>
          {!isOnboarding ? (
            <div className="shrink-0 self-center">
              {isSessionActive ? (
                <NotificationsBell />
              ) : (
                <button
                  type="button"
                  className="vt-btn vt-btn-primary"
                  onClick={openAuthModal}
                >
                  <LogIn size={16} aria-hidden /> Iniciar sesión
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <main className="vt-main min-h-0 flex-1 py-4 pb-[88px]">
        <Outlet />
      </main>

      {!isOnboarding && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="container grid grid-cols-4 gap-1.5 py-2.5">
            {tabs.map((t) => {
              const active = tabIsActive(pathname, t)
              const Icon = t.icon
              const profileTab = 'activePrefix' in t && t.activePrefix === '/profile/me'
              const profileLetter = (me.name ?? '?').slice(0, 1).toUpperCase()
              const blockedForGuest =
                !isSessionActive &&
                (t.to === '/reels' ||
                  t.to === '/chat' ||
                  ('activePrefix' in t && t.activePrefix === '/profile/me'))
              return (
                blockedForGuest ? (
                  <button
                    key={t.to}
                    type="button"
                    onClick={openAuthModal}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-xs text-[var(--muted)] opacity-55',
                      active &&
                        'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]',
                    )}
                    aria-label={`${t.label} (requiere iniciar sesión)`}
                  >
                    {profileTab ? (
                      <span
                        className={cn(
                          'grid h-[22px] w-[22px] shrink-0 place-items-center overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--bg)_60%,var(--surface))] text-[10px] font-black text-[var(--muted)]',
                          active &&
                            'ring-2 ring-[color-mix(in_oklab,var(--primary)_55%,transparent)] ring-offset-2 ring-offset-[var(--surface)]',
                        )}
                        aria-hidden
                      >
                        {profileLetter === '?' ? 'VT' : profileLetter}
                      </span>
                    ) : (
                      <Icon size={18} />
                    )}
                    <span>{t.label}</span>
                  </button>
                ) : (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-xs text-[var(--muted)]',
                      active &&
                        'bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]',
                    )}
                  >
                    {profileTab ? (
                      <span
                        className={cn(
                          'grid h-[22px] w-[22px] shrink-0 place-items-center overflow-hidden rounded-full',
                          !me.avatarUrl &&
                            'bg-gradient-to-br from-[var(--primary)] to-violet-600 text-[10px] font-black text-white',
                          active &&
                            'ring-2 ring-[color-mix(in_oklab,var(--primary)_55%,transparent)] ring-offset-2 ring-offset-[var(--surface)]',
                        )}
                        aria-hidden
                      >
                        {me.avatarUrl ? (
                          <ProtectedMediaImg
                            src={me.avatarUrl}
                            alt=""
                            wrapperClassName="h-full w-full"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          profileLetter
                        )}
                      </span>
                    ) : (
                      <Icon size={18} />
                    )}
                    <span>{t.label}</span>
                  </Link>
                )
              )
            })}
          </div>
        </nav>
      )}

      <AuthEntryModal open={authOpen} onClose={closeAuthModal} />
    </div>
  )
}
