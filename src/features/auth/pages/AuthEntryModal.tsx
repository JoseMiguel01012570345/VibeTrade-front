import { useId } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, X } from "lucide-react";
import { onBackdropPointerClose } from "@shared/lib/modals/modalClose";
import { modalShellWide } from "@shared/styles/modals/formModalStyles";

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

export function AuthEntryModal({ open, onClose }: Props) {
  const nav = useNavigate();
  const titleId = useId();
  if (!open) return null;

  function go(path: string) {
    onClose();
    nav(path);
  }

  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <div className="vt-modal-title" id={titleId}>
            Iniciar sesión
          </div>
          <button type="button" className="vt-btn" onClick={onClose}>
            <X size={16} aria-hidden /> Cerrar
          </button>
        </div>
        <div className="mt-1 text-sm text-[var(--muted)]">
          Elige cómo quieres continuar. El login usa email y contraseña.
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          <button
            type="button"
            className="vt-card vt-card-pad flex w-full flex-col items-stretch gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
            onClick={() => go("/onboarding/register")}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                <UserPlus size={20} strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-black tracking-[-0.03em] text-[var(--text)]">
                  Crear una cuenta nueva
                </div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">
                  Contraseña, email y teléfono con verificación.
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            className="vt-card vt-card-pad flex w-full flex-col items-stretch gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
            onClick={() => go("/onboarding/login")}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                <LogIn size={20} strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-black tracking-[-0.03em] text-[var(--text)]">
                  Ya tengo cuenta
                </div>
                <div className="mt-1 text-[13px] text-[var(--muted)]">
                  Inicia sesión con email y contraseña.
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
