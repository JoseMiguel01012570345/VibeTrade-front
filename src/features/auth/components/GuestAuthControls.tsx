import { LogIn } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { cn } from "@shared/lib/cn";

const loginBtnClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-3.5 text-xs font-bold text-emerald-800 shadow-[0_2px_10px_rgba(15,118,110,0.12)] backdrop-blur-sm transition hover:border-emerald-300 hover:bg-emerald-50 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm";

/** Botón de inicio de sesión con estilo emerald del storefront. */
export function LoginNavButton({
  className,
  onClick,
}: Readonly<{
  className?: string;
  onClick?: () => void;
}>) {
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  return (
    <button
      type="button"
      onClick={onClick ?? openAuthModal}
      className={cn(loginBtnClass, className)}
    >
      <LogIn size={16} strokeWidth={2.25} aria-hidden />
      <span className="max-[380px]:hidden">Iniciar sesión</span>
      <span className="hidden max-[380px]:inline">Entrar</span>
    </button>
  );
}

/** Acceso de invitado: inicio de sesión. */
export function GuestAuthControls({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LoginNavButton />
    </div>
  );
}
