import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Home,
  LogIn,
  MessageCircle,
  PlaySquare,
  Search,
  ShoppingCart,
  User,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { isStaffSession } from "@features/auth/logic/roles";
import { useCartStore } from "@features/orders";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { storeCartHref } from "@features/market/logic/store/storePath";
import { NotificationsBell } from "../widgets/NotificationsBell";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { AuthEntryModal } from "@features/auth";
import { ThemeToggle } from "../widgets/ThemeToggle";
import { syncChatNotificationsFromServer } from "@features/notifications/logic/notificationsSync";
import { useTrustGate } from "@features/trust";
import { AnalyticsTracker } from "@features/analytics";

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

function isReelsRoute(pathname: string) {
  return pathname === "/reels" || pathname.startsWith("/reels/");
}

/**
 * Primeros segmentos que pertenecen a la app (no son tiendas). Todo lo demás en la
 * raíz (`/{nombre}`) es el storefront/panel de una tienda por su nombre.
 */
const KNOWN_TOP_LEVEL_ROUTES = new Set<string>([
  "onboarding",
  "home",
  "search",
  "stores",
  "offer",
  "staff-login",
  "store",
  "cart",
  "checkout",
  "pedido",
  "rastreo",
  "mis-compras",
  "finanzas",
  "afiliado",
  "almacen",
  "mensualidad",
  "admin",
  "estadisticas",
  "chat",
  "invite",
  "reels",
  "profile",
  "notifications",
]);

/**
 * Superficies de tienda (storefront `/{nombre}` y su panel, ficha `/offer/:id`, el
 * carrito `/cart` y el legado `/store/:id`): traen su propia cabecera de tienda, así
 * que la campana flotante de la app no debe superponerse. Una tienda es también
 * cualquier ruta de raíz cuyo primer segmento no sea una ruta conocida de la app.
 */
function isStoreSurfaceRoute(pathname: string) {
  if (
    pathname.startsWith("/store/") ||
    pathname.startsWith("/offer/") ||
    pathname === "/cart"
  )
    return true;
  const seg = pathname.split("/")[1] ?? "";
  if (!seg) return false;
  return !KNOWN_TOP_LEVEL_ROUTES.has(seg.toLowerCase());
}

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isOnboarding = pathname.startsWith("/onboarding");
  const isHome = pathname === "/home";
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const staffSession = isStaffSession(useAppStore((s) => s.me)) && isSessionActive;
  /** El personal (staff) navega solo el panel: sin barra inferior ni FAB de carrito. */
  const hideBottomNav = isChatThreadPath(pathname) || staffSession;
  /** Sin campana en hilo de chat ni en Reels; en listado `/chat` sí. */
  const showNotificationsBell =
    isSessionActive &&
    !isChatThreadPath(pathname) &&
    !isReelsRoute(pathname);
  /** Home / invitado u onboarding: barra superior con altura. Sesión en resto de rutas: sin franja vacía (campana superpuesta).
   *  En superficies de tienda el chrome propio incluye el acceso de invitado; no duplicar la franja de AppShell. */
  const showStickyShellHeader =
    (isHome && !isOnboarding) ||
    (!isHome &&
      !isStoreSurfaceRoute(pathname) &&
      (!isSessionActive || isOnboarding));
  const shellNotificationsOverlay =
    showNotificationsBell &&
    isSessionActive &&
    !isOnboarding &&
    !isHome &&
    !isStoreSurfaceRoute(pathname);
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

  const cartCount = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );
  // El carrito es de una sola tienda: el FAB abre `{base}/{nombre}/cart`.
  const cartStoreId = useCartStore((s) => s.items[0]?.storeId ?? "");
  const cartStore = useMarketStore((s) =>
    cartStoreId ? s.stores[cartStoreId] : undefined,
  );
  const cartHref = storeCartHref(cartStore);

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
          aria-label="Tu confianza está por debajo del umbral. Regularizar la mensualidad"
        >
          <AlertTriangle size={16} aria-hidden />
          <span>
            Tu confianza está por debajo del umbral. Regulariza tu mensualidad
            para reactivar tu cuenta.
          </span>
        </button>
      ) : null}
      {showStickyShellHeader ? (
        <div className="sticky top-0 z-50 overflow-visible bg-[color-mix(in_oklab,var(--bg)_65%,transparent)] pt-[max(10px,env(safe-area-inset-top,0px))] backdrop-blur-[10px]">
          <div className="container pb-2.5">
            {isHome && !isOnboarding ? (
              <>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 pt-2.5 md:flex-nowrap">
                  <h1 className="order-1 shrink-0 text-lg font-black tracking-[-0.03em] text-[var(--text)]">
                    Ofertas
                  </h1>
                  <button
                    type="button"
                    className="order-3 flex w-full min-w-0 basis-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 md:order-2 md:w-auto md:flex-1 md:basis-auto"
                    onClick={() => navigate("/search")}
                    aria-label="Abrir búsqueda de tiendas, productos y servicios"
                  >
                    <Search
                      size={18}
                      strokeWidth={2.25}
                      className="shrink-0 text-[var(--muted)]"
                      aria-hidden
                    />
                    <span className="min-w-0 text-[var(--muted)] max-md:whitespace-normal max-md:break-words max-md:leading-snug md:truncate">
                      Buscar tiendas, productos o servicios…
                    </span>
                  </button>
                  <div className="order-2 ml-auto flex shrink-0 items-center gap-2 self-center md:order-3 md:ml-0">
                    {isSessionActive ? (
                      <>
                        {showNotificationsBell ? <NotificationsBell /> : null}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="vt-btn vt-btn-primary"
                          onClick={openAuthModal}
                        >
                          <LogIn size={16} aria-hidden /> Iniciar sesión
                        </button>
                        <ThemeToggle />
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-end gap-2 pb-2.5 pt-2.5">
                {!isOnboarding && !isSessionActive ? (
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary"
                    onClick={openAuthModal}
                  >
                    <LogIn size={16} aria-hidden /> Iniciar sesión
                  </button>
                ) : null}
                {(!isSessionActive || isOnboarding) && <ThemeToggle />}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {shellNotificationsOverlay ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[55]">
          {/*
            Misma banda vertical que el contenido con `main` pt-4 + cabecera típica (~vt-card p-4).
            Margen extra respecto al borde + safe-area para que el botón no quede pegado.
          */}
          <div className="container flex justify-end pt-[calc(env(safe-area-inset-top,0px)+1.625rem)]">
            <div className="pointer-events-auto mt-1 shrink-0 pb-1 ps-2 pe-[max(10px,calc(env(safe-area-inset-right,0px)+10px))] pt-0.5 sm:pe-4">
              <NotificationsBell />
            </div>
          </div>
        </div>
      ) : null}

      <main
        className={cn(
          "vt-main min-h-0 min-w-0 w-full flex-1 pt-4",
          /* Hilo de chat (sin nav inferior): en móvil el padding inferior vive en el compositor (área segura); main sin hueco extra. */
          hideBottomNav
            ? "max-[960px]:pb-0 min-[961px]:pb-4"
            : "pb-[88px]",
        )}
      >
        <Outlet />
      </main>

      {!isOnboarding && !hideBottomNav && cartCount > 0 ? (
        <button
          type="button"
          onClick={() => navigate(cartHref)}
          aria-label={`Carrito (${cartCount})`}
          className="fixed bottom-[96px] right-4 z-[61] grid h-12 w-12 place-items-center rounded-full border border-[var(--border)] bg-[var(--primary)] text-white shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <ShoppingCart size={20} aria-hidden />
          <span className="absolute -right-1 -top-1 grid min-h-[20px] min-w-[20px] place-items-center rounded-full border-2 border-[var(--surface)] bg-[var(--bad)] px-1 text-[11px] font-black tabular-nums text-white">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        </button>
      ) : null}

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
