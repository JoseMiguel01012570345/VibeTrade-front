import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import '../styles/auth.css'

export function OnboardingWelcomePage() {
  const nav = useNavigate()

  return (
    <div className="container vt-page vt-auth-page">
      <div className="vt-auth-page__inner flex min-h-[calc(100dvh-2rem)] flex-col justify-center gap-6">
        <header className="text-center">
          <h1 className="vt-auth-title">Bienvenido a VibeTrade</h1>
          <p className="vt-auth-subtitle">
            Elige cómo quieres continuar. El registro verifica tu teléfono y email; el login usa email y contraseña.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="vt-auth-option-card"
            onClick={() => nav('/onboarding/register')}
          >
            <div className="flex items-start gap-3">
              <span className="vt-auth-option-card__icon">
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
            className="vt-auth-option-card"
            onClick={() => nav('/onboarding/login')}
          >
            <div className="flex items-start gap-3">
              <span className="vt-auth-option-card__icon">
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
