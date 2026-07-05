import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useLogin } from '../hooks/useLogin'
import { PasswordInput } from '../components/PasswordInput'
import { AuthFormField, AuthPageShell } from '../components/AuthPageShell'

export function LoginPage() {
  const nav = useNavigate()
  const { email, setEmail, password, setPassword, busy, submit } = useLogin()

  return (
    <AuthPageShell
      title="Iniciar sesión"
      subtitle="Ingresá tu email y contraseña."
      backLabel="Volver a opciones"
      onBack={() => nav('/onboarding')}
    >
      <form className="vt-auth-form" onSubmit={(e) => void submit(e)}>
        <AuthFormField label="Email" icon={Mail} htmlFor="login-email">
          <input
            id="login-email"
            className="vt-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 120))}
            autoComplete="email"
            maxLength={120}
          />
        </AuthFormField>

        <AuthFormField label="Contraseña" icon={Lock}>
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </AuthFormField>

        <button type="submit" className="vt-btn vt-btn-primary w-full px-3 py-3" disabled={busy}>
          {busy ? 'Ingresando…' : 'Iniciar sesión'}
        </button>

        <Link to="/onboarding/forgot-password" className="vt-auth-link">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </AuthPageShell>
  )
}
