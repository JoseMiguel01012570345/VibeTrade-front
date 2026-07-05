import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Home,
  MessageCircle,
  PlaySquare,
  Search,
  User,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { isStaffSession } from "@features/auth/logic/roles";
import { isStoreSurfacePath } from "@features/market/logic/store/storePath";
import { GuestAuthControls } from "@features/auth/components/GuestAuthControls";
import { NotificationsBell } from "../widgets/NotificationsBell";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { AuthEntryModal } from "@features/auth";
import { syncChatNotificationsFromServer } from "@features/notifications/logic/notificationsSync";
import { useTrustGate } from "@features/trust";
import { AnalyticsTracker } from "@features/analytics";
import { useMinWidth961 } from "@features/chat/hooks/useMinWidth961";

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

const NAV_TAB_ACTIVE =
  "bg-[color-mix(in_oklab,#0f766e_12%,transparent)] text-[#0f766e] active:bg-[color-mix(in_oklab,#0f766e_20%,transparent)]";

const NAV_PROFILE_AVATAR_RING =
  "ring-2 ring-[color-mix(in_oklab,#0f766e_45%,transparent)] ring-offset-2 ring-offset-[var(--surface)]";

const NAV_PROFILE_AVATAR_PLACEHOLDER =
  "vt-avatar-placeholder text-[10px] font-black";

function tabIsActive(pathname: string, t: (typeof tabs)[number]) {
  if ("activePrefix" in t && t.activePrefix) {
    const p = t.activePrefix;
    return pathname === p || pathname.startsWith(`${p}/`);
  }
  return pathname === t.to || pathname.startsWith(`${t.to}/`);
}

/** Lista `/chat`; hilo `/chat/:threadId` â€” en el hilo se oculta la barra inferior para pantalla completa. */
function isChatThreadPath(pathname: string) {
  return pathname.startsWith("/chat/") && pathname.length > "/chat/".length;
}

function isReelsRoute(pathname: string) {
  return pathname === "/reels" || pathname.startsWith("/reels/");
}

/**
 * Superficies de tienda (storefront `/{nombre}` y su panel, ficha `/offer/:id` y el
 * legado `/store/:id`): traen su propia cabecera de tienda.
 */
function isStoreSurfaceRoute(pathname: string) {
  return isStoreSurfacePath(pathname);
}

/** Lista `/chat` o cualquier ruta bajo `/chat/`. */
function isChatRoute(pathname: string) {
  return pathname === "/chat" || pathname.startsWith("/chat/");
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const wide = useMinWidth961();
  const isOnboarding = pathname.startsWith("/onboarding");
  const isHome = pathname === "/home";
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const staffSession = isStaffSession(useAppStore((s) => s.me)) && isSessionActive;
  /** El personal (staff) navega solo el panel: sin barra inferior. */
  const hideBottomNav =
    staffSession || (!wide && isChatThreadPath(pathname));
  /** Sin campana en hilo de chat ni en Reels; en listado `/chat` sÃ­. */
  const showNotificationsBell =
    isSessionActive &&
    !isChatThreadPath(pathname) &&
    !isReelsRoute(pathname);
  /** Home: barra con tÃ­tulo y buscador. El resto de acciones va en overlay superior derecho. */
  const showStickyShellHeader = isHome && !isOnboarding;
  /** Chat en escritorio: el hilo ocupa todo el alto; la nav flota encima. */
  const chatFullHeightDesktop = wide && isChatRoute(pathname);
  const hideShellOverlayOnWideChat = chatFullHeightDesktop;
  const showNotificationsInOverlay =
    showNotificationsBell &&
    isSessionActive &&
    !isOnboarding &&
    !isStoreSurfaceRoute(pathname) &&
    !hideShellOverlayOnWideChat;
  const showGuestAuthInOverlay =
    !isSessionActive && !isOnboarding && !staffSession && !isStoreSurfaceRoute(pathname);
  const showShellTopRightOverlay =
    showGuestAuthInOverlay || showNotificationsInOverlay;
  const me = useAppStore((s) => s.me);
  const trustThreshold = useAppStore((s) => s.trustThreshold);
  const showTrustBanner =
    isSessionActive &&
    !isOnboarding &&
    pathname !== "/mensualidad" &&
    trustThreshold > 0 &&
    me.trustScore < trustThreshold;
  const authOpen = useAppStore((s) => s.authModalOpen);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);

  // Sincroniza puntaje/umbral de confianza desde el backend para el gate de interacciones (wiki cap. 08/10).
  useTrustGate();

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
      <AnalyticsTracker />
      {showTrustBanner ? (
        <button
          type="button"
          onClick={() => navigate("/mensualidad")}
          className="flex w-full items-center justify-center gap-2 bg-[color-mix(in_oklab,var(--bad)_16%,var(--surface))] px-3 py-2 text-center text-[13px] font-semibold text-[var(--bad)]"
          aria-label="Tu confianza estÃ¡ por debajo del umbral. Regularizar la mensualidad"
        >
          <AlertTriangle size={16} aria-hidden />
          <span>
            Tu confianza estÃ¡ por debajo del umbral. Regulariza tu mensualidad
            para reactivar tu cuenta.
          </span>
        </button>
      ) : null}
      {showStickyShellHeader ? (
        <div className="sticky top-0 z-50 overflow-visible border-b border-emerald-100 bg-white/95 pt-[max(10px,env(safe-area-inset-top,0px))] backdrop-blur-sm">
          <div className="container mx-auto max-w-[1140px] pb-3">
            {isHome && !isOnboarding ? (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 pt-2.5 md:flex-nowrap">
                <h1 className="order-1 shrink-0 text-lg font-extrabold tracking-tight text-emerald-700 sm:text-xl">
                  Ofertas
                </h1>
                <button
                  type="button"
                  className="order-2 flex w-full min-w-0 basis-full items-center gap-2 rounded-full border border-emerald-100 bg-stone-50 px-3 py-2.5 text-left text-[13px] shadow-none transition hover:border-emerald-300 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 md:w-auto md:flex-1 md:basis-auto"
                  onClick={() => navigate("/search")}
                  aria-label="Abrir búsqueda de tiendas, productos y servicios"
                >
                  <Search
                    size={18}
                    strokeWidth={2.25}
                    className="shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  <span className="min-w-0 text-slate-500 max-md:whitespace-normal max-md:break-words max-md:leading-snug md:truncate">
                    Buscar tiendas, productos o servicios…
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showShellTopRightOverlay ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[55]">
          <div className="container flex items-center justify-end gap-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pe-[max(10px,calc(env(safe-area-inset-right,0px)+10px))] sm:pe-4">
            {showGuestAuthInOverlay ? (
              <GuestAuthControls className="pointer-events-auto" />
            ) : null}
            {showNotificationsInOverlay ? (
              <div className="pointer-events-auto flex h-10 items-center">
                <NotificationsBell />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <main
        className={cn(
          "vt-main min-h-0 min-w-0 w-full flex-1",
          isChatRoute(pathname) ? "pt-0 pb-0" : "pt-4",
          !isChatRoute(pathname) && !hideBottomNav && "pb-[var(--vt-bottom-nav-clearance)]",
        )}
      >
        <Outlet />
      </main>

      {!isOnboarding && !hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-[2rem] border-t border-transparent bg-[var(--surface)] min-[961px]:rounded-none">
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
                    active && NAV_TAB_ACTIVE,
                  )}
                  aria-label={`${t.label} (requiere iniciar sesiÃ³n)`}
                >
                  {profileTab ? (
                    <span
                      className={cn(
                        "grid h-[22px] w-[22px] shrink-0 place-items-center overflow-hidden rounded-full",
                        NAV_PROFILE_AVATAR_PLACEHOLDER,
                        active && NAV_PROFILE_AVATAR_RING,
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
                    active && NAV_TAB_ACTIVE,
                  )}
                >
                  {profileTab ? (
                    <span
                      className={cn(
                        "grid h-[22px] w-[22px] shrink-0 place-items-center overflow-hidden rounded-full",
                        !me.avatarUrl && NAV_PROFILE_AVATAR_PLACEHOLDER,
                        active && NAV_PROFILE_AVATAR_RING,
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

