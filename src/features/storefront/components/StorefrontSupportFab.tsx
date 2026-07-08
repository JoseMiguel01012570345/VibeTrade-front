import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Headset } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { toast } from "sonner";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { isStaffSession } from "@features/auth/logic/roles";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { createSupportThread } from "@features/chat/api/chatApi";
import { toastApiError } from "@features/auth/logic/toastApiError";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { cn } from "@shared/lib/cn";
import { useStorefrontAmbient, storefrontAmbientCssVarsOnly } from "../context/StorefrontAmbientContext";

/** Altura reservada por la barra inferior fija de AppShell. */
const BOTTOM_NAV_CLEARANCE_PX = 78;

function isChatThreadPath(pathname: string) {
  return pathname.startsWith("/chat/") && pathname.length > "/chat/".length;
}

function supportFabBottomClass(hideBottomNav: boolean): string {
  if (hideBottomNav) {
    return "bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:bottom-[max(2rem,env(safe-area-inset-bottom,0px))]";
  }
  return cn(
    "bottom-[calc(var(--vt-bottom-nav-clearance)+max(0.75rem,env(safe-area-inset-bottom,0px)))]",
    "sm:bottom-[calc(var(--vt-bottom-nav-clearance)+1.25rem)]",
  );
}

/**
 * Botón flotante de soporte (esquina inferior derecha). Abre el chat de soporte
 * con la tienda al instante, sin formulario intermedio.
 */
export function StorefrontSupportFab({
  store,
}: Readonly<{
  store: StoreBadge;
}>) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const me = useAppStore((s) => s.me);
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const onThreadCreated = useMarketStore((s) => s.onThreadCreatedFromServer);
  const [opening, setOpening] = useState(false);
  const ambient = useStorefrontAmbient();

  const hideBottomNav =
    isChatThreadPath(pathname) ||
    (isStaffSession(me) && isSessionActive) ||
    pathname.startsWith("/onboarding");

  if (typeof document === "undefined") return null;

  async function handleOpenSupport() {
    if (!getSessionToken() || me.id === "guest") {
      openAuthModal();
      return;
    }
    const ownerId = store.ownerUserId?.trim();
    if (ownerId && ownerId === me.id.trim()) {
      toast.error("No puedes abrir soporte en tu propia tienda.");
      return;
    }

    setOpening(true);
    try {
      const dto = await createSupportThread({ storeId: store.id });
      onThreadCreated(dto);
      nav(`/chat/${encodeURIComponent(dto.id)}`);
    } catch (e) {
      toastApiError(e, "No se pudo abrir el chat de soporte.");
    } finally {
      setOpening(false);
    }
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      style={
        {
          ["--vt-bottom-nav-clearance" as string]: `${BOTTOM_NAV_CLEARANCE_PX}px`,
        } as CSSProperties
      }
      aria-hidden={false}
    >
      <button
        type="button"
        disabled={opening}
        onClick={() => void handleOpenSupport()}
        className={cn(
          "pointer-events-auto fixed right-[max(1.25rem,env(safe-area-inset-right,0px))] z-[91] grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_14px_32px_rgba(4,120,87,0.35)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70 sm:right-[max(2rem,env(safe-area-inset-right,0px))]",
          ambient.hasPageAmbient
            ? "vt-storefront-ambient vt-storefront-accent-btn focus-visible:outline-[color-mix(in_oklab,rgb(var(--storefront-accent-strong-rgb))_100%,transparent)]"
            : "bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700",
          supportFabBottomClass(hideBottomNav),
        )}
        style={storefrontAmbientCssVarsOnly(ambient)}
        aria-label="Abrir chat de soporte"
        title="Soporte"
      >
        {opening ? (
          <CeSpinner size="lg" aria-hidden />
        ) : (
          <Headset size={24} strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </div>,
    document.body,
  );
}
