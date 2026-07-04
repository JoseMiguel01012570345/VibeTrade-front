import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Headset, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { createSupportThread } from "@features/chat/api/chatApi";
import { errorToUserMessage } from "@shared/services/http/apiErrorMessage";
import { getSessionToken } from "@shared/services/http/sessionToken";

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
  const me = useAppStore((s) => s.me);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const onThreadCreated = useMarketStore((s) => s.onThreadCreatedFromServer);
  const [opening, setOpening] = useState(false);

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
      aria-hidden={false}
    >
      <button
        type="button"
        disabled={opening}
        onClick={() => void handleOpenSupport()}
        className="pointer-events-auto fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))] z-[91] grid h-14 w-14 place-items-center rounded-full bg-emerald-700 text-white shadow-[0_14px_32px_rgba(4,120,87,0.35)] transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-70 sm:bottom-[max(2rem,env(safe-area-inset-bottom,0px))] sm:right-[max(2rem,env(safe-area-inset-right,0px))]"
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
