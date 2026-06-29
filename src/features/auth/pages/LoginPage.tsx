import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useLogin } from '../hooks/useLogin'
import { PasswordInput } from '../components/PasswordInput'

export function LoginPage() {
  const nav = useNavigate()
  const { email, setEmail, password, setPassword, busy, submit } = useLogin()

  return (
    <div className="container vt-page">
      <div className="mx-auto mt-[18px] flex w-full max-w-[520px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="self-start border-0 bg-transparent px-0 text-sm font-extrabold text-[var(--primary)] underline-offset-2 hover:underline"
            onClick={() => nav('/onboarding')}
          >
            ← Volver a opciones
          </button>
          <h1 className="vt-h1">Iniciar sesión</h1>
          <div className="vt-muted">Ingresá tu email y contraseña.</div>
        </div>

        <form className="vt-card vt-card-pad bg-[var(--surface)]" onSubmit={(e) => void submit(e)}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Mail size={14} /> Email
              </span>
              <input
                className="vt-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 120))}
                autoComplete="email"
                maxLength={120}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Lock size={14} /> Contraseña
              </span>
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="vt-btn vt-btn-primary w-full px-3 py-3" disabled={busy}>
              {busy ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
            <Link
              to="/onboarding/forgot-password"
              className="text-center text-sm font-extrabold text-[var(--primary)] underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
