import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { CeTransitionModalShell } from "@shared/components/ui";
import "../styles/auth.css";

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

const AUTH_MODAL_PANEL =
  "flex max-h-[min(90dvh,720px)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] text-[var(--text)] vt-auth-page";

export function AuthEntryModal({ open, onClose }: Props) {
  const nav = useNavigate();

  function go(path: string) {
    onClose();
    nav(path);
  }

  return (
    <CeTransitionModalShell
      show={open}
      onClose={onClose}
      size="lg"
      theme={{
        content: {
          inner: AUTH_MODAL_PANEL,
        },
      }}
      backdropClassName="bg-[rgba(2,6,23,0.55)]"
    >
      <h2 className="vt-auth-title text-[1.35rem]">Iniciar sesión</h2>
      <p className="vt-auth-subtitle">
        Elige cómo quieres continuar. El login usa email y contraseña.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          className="vt-auth-option-card"
          onClick={() => go("/onboarding/register")}
        >
          <div className="flex items-start gap-3">
            <span className="vt-auth-option-card__icon">
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
          className="vt-auth-option-card"
          onClick={() => go("/onboarding/login")}
        >
          <div className="flex items-start gap-3">
            <span className="vt-auth-option-card__icon">
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
    </CeTransitionModalShell>
  );
}
