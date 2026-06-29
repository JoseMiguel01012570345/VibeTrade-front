import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'

export function OnboardingWelcomePage() {
  const nav = useNavigate()

  return (
    <div className="container vt-page">
      <div className="mx-auto mt-[18px] flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="vt-h1">Bienvenido a VibeTrade</h1>
          <div className="vt-muted">
            Elige cómo quieres continuar. El registro verifica tu teléfono y email; el login usa email y contraseña.
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="vt-card vt-card-pad flex w-full flex-col items-stretch gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
            onClick={() => nav('/onboarding/register')}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                <UserPlus size={22} strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-black tracking-[-0.03em] text-[var(--text)]">
                  Crear una cuenta nueva
                </div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  Registrate con contraseña, email y teléfono. Verificamos ambos contactos antes de activar tu cuenta.
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            className="vt-card vt-card-pad flex w-full flex-col items-stretch gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]"
            onClick={() => nav('/onboarding/login')}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                <LogIn size={22} strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-black tracking-[-0.03em] text-[var(--text)]">
                  Ya tengo cuenta
                </div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  Inicia sesión con tu email y contraseña.
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
