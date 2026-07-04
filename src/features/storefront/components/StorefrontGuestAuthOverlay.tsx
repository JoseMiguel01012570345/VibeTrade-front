import { createPortal } from "react-dom";
import { LogIn } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { ThemeToggle } from "@app/widgets/ThemeToggle";

/**
 * Acceso de invitado superpuesto sobre el chrome de la tienda (esquina superior
 * derecha). Evita la franja duplicada de AppShell y usa los estilos emerald del
 * storefront.
 */
export function StorefrontGuestAuthOverlay() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  if (isSessionActive || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[55]">
      <div className="mx-auto flex max-w-[1140px] justify-end gap-2 px-4 pe-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(0.625rem,env(safe-area-inset-top,0px))]">
        <button
          type="button"
          onClick={openAuthModal}
          className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-3.5 text-xs font-bold text-emerald-800 shadow-[0_2px_10px_rgba(15,118,110,0.12)] backdrop-blur-sm transition hover:border-emerald-300 hover:bg-emerald-50 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
        >
          <LogIn size={16} strokeWidth={2.25} aria-hidden />
          <span className="max-[380px]:hidden">Iniciar sesión</span>
          <span className="hidden max-[380px]:inline">Entrar</span>
        </button>
        <div className="pointer-events-auto [&_button]:border-emerald-200 [&_button]:bg-white/95 [&_button]:shadow-[0_2px_10px_rgba(15,118,110,0.08)]">
          <ThemeToggle />
        </div>
      </div>
    </div>,
    document.body,
  );
}
