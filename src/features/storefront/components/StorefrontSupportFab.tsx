import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Headset, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { isStaffSession } from "@features/auth/logic/roles";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { createSupportThread } from "@features/chat/api/chatApi";
import { errorToUserMessage } from "@shared/services/http/apiErrorMessage";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { cn } from "@shared/lib/cn";

/** Altura reservada por la barra inferior fija de AppShell (`pb-[88px]`). */
const BOTTOM_NAV_CLEARANCE_PX = 88;

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
      toast.error(errorToUserMessage(e, "No se pudo abrir el chat de soporte."));
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
          "pointer-events-auto fixed right-[max(1.25rem,env(safe-area-inset-right,0px))] z-[91] grid h-14 w-14 place-items-center rounded-full bg-emerald-700 text-white shadow-[0_14px_32px_rgba(4,120,87,0.35)] transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-70 sm:right-[max(2rem,env(safe-area-inset-right,0px))]",
          supportFabBottomClass(hideBottomNav),
        )}
        aria-label="Abrir chat de soporte"
        title="Soporte"
      >
        {opening ? (
          <Loader2 size={24} className="animate-spin" aria-hidden />
        ) : (
          <Headset size={24} strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </div>,
    document.body,
  );
}
