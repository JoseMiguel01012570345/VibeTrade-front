import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  LogIn,
  MessageCircle,
  PlaySquare,
  Search,
  User,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useAppStore } from "../store/useAppStore";
import { TrustBar } from "../widgets/TrustBar";
import { NotificationsBell } from "../widgets/NotificationsBell";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { AuthEntryModal } from "../../pages/onboarding/AuthEntryModal";
import { syncChatNotificationsFromServer } from "../../utils/notifications/notificationsSync";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/reels", label: "Reels", icon: PlaySquare },
  /** Lista en `/chat`; `activePrefix` mantiene el tab activo dentro de un hilo. */
  { to: "/chat", label: "Chat", icon: MessageCircle, activePrefix: "/chat" },
  /** Cuenta / Reels / Tiendas viven bajo `/profile/me/...`. */
  {
    to: "/profile/me/account",
    label: "Perfil",
    icon: User,
    activePrefix: "/profile/me",
  },
] as const;

function tabIsActive(pathname: string, t: (typeof tabs)[number]) {
  if ("activePrefix" in t && t.activePrefix) {
    const p = t.activePrefix;
    return pathname === p || pathname.startsWith(`${p}/`);
  }
  return pathname === t.to || pathname.startsWith(`${t.to}/`);
}

/** Lista `/chat`; hilo `/chat/:threadId` — en el hilo se oculta la barra inferior para pantalla completa. */
function isChatThreadPath(pathname: string) {
  return pathname.startsWith("/chat/") && pathname.length > "/chat/".length;
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isOnboarding = pathname.startsWith("/onboarding");
  const isHome = pathname === "/home";
  const hideBottomNav = isChatThreadPath(pathname);
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const me = useAppStore((s) => s.me);
  const authOpen = useAppStore((s) => s.authModalOpen);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);

  useEffect(() => {
    if (!isSessionActive) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void syncChatNotificationsFromServer();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isSessionActive]);

  /** Tras cambiar de ruta, vuelve a sincronizar: el filtro por hilo abierto depende de `pathname`. */
  useEffect(() => {
    if (!isSessionActive) return;
    void syncChatNotificationsFromServer();
  }, [isSessionActive, pathname]);

  return (
    <div className="vt-app flex min-h-screen flex-col">
      <div className="sticky top-0 z-50 overflow-visible border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_65%,transparent)] pt-[max(10px,env(safe-area-inset-top,0px))] backdrop-blur-[10px]">
        <div className="container pb-2.5">
          {isHome && !isOnboarding ? (
            <>
              {isSessionActive ? (
                <div className="pb-2.5">
                  <TrustBar />
                </div>
              ) : null}
              <div
                className={cn(
                  "flex items-center gap-2.5",
                  isSessionActive && "pt-2.5",
                )}
              >
                <h1 className="shrink-0 text-lg font-black tracking-[-0.03em] text-[var(--text)]">
                  Ofertas
                </h1>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                  onClick={() => navigate("/search")}
                  aria-label="Abrir búsqueda de tiendas, productos y servicios"
                >
                  <Search
                    size={18}
                    strokeWidth={2.25}
                    className="shrink-0 text-[var(--muted)]"
                    aria-hidden
                  />
                  <span className="truncate text-[var(--muted)]">
                    Buscar tiendas, productos o servicios…
                  </span>
                </button>
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
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
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
          )}
        </div>
      </div>

      <main
        className={cn(
          "vt-main min-h-0 flex-1 py-4",
          hideBottomNav ? "pb-4" : "pb-[88px]",
        )}
      >
        <Outlet />
      </main>

      {!isOnboarding && !hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="container grid grid-cols-4 gap-1.5 py-2.5">
            {tabs.map((t) => {
              const active = tabIsActive(pathname, t);
              const Icon = t.icon;
              const profileTab =
                "activePrefix" in t && t.activePrefix === "/profile/me";
              const profileLetter = (me.name ?? "?").slice(0, 1).toUpperCase();
              const blockedForGuest =
                !isSessionActive &&
                (t.to === "/reels" ||
                  t.to === "/chat" ||
                  ("activePrefix" in t && t.activePrefix === "/profile/me"));
              return blockedForGuest ? (
                <button
                  key={t.to}
                  type="button"
                  onClick={openAuthModal}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-xs text-[var(--muted)] opacity-55",
                    active &&
                      "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]",
                  )}
                  aria-label={`${t.label} (requiere iniciar sesión)`}
                >
                  {profileTab ? (
                    <span
                      className={cn(
                        "grid h-[22px] w-[22px] shrink-0 place-items-center overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--bg)_60%,var(--surface))] text-[10px] font-black text-[var(--muted)]",
                        active &&
                          "ring-2 ring-[color-mix(in_oklab,var(--primary)_55%,transparent)] ring-offset-2 ring-offset-[var(--surface)]",
                      )}
                      aria-hidden
                    >
                      {profileLetter === "?" ? "VT" : profileLetter}
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
                    "flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-xs text-[var(--muted)]",
                    active &&
                      "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[var(--primary)]",
                  )}
                >
                  {profileTab ? (
                    <span
                      className={cn(
                        "grid h-[22px] w-[22px] shrink-0 place-items-center overflow-hidden rounded-full",
                        !me.avatarUrl &&
                          "bg-gradient-to-br from-[var(--primary)] to-violet-600 text-[10px] font-black text-white",
                        active &&
                          "ring-2 ring-[color-mix(in_oklab,var(--primary)_55%,transparent)] ring-offset-2 ring-offset-[var(--surface)]",
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
              );
            })}
          </div>
        </nav>
      )}

      <AuthEntryModal open={authOpen} onClose={closeAuthModal} />
    </div>
  );
}
