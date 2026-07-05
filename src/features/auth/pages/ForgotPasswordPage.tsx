import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Lock, Mail } from 'lucide-react'
import { forgotPassword } from '@features/auth/api/credentialsAuth'
import { isValidEmail, isValidPassword } from '@features/auth/logic/credentialsValidation'
import { AuthFormField, AuthPageShell } from '../components/AuthPageShell'

export function ForgotPasswordPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit =
    isValidEmail(email) &&
    isValidPassword(newPassword) &&
    newPassword === confirmPassword &&
    !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      const json = await forgotPassword(email.trim(), newPassword)
      nav('/onboarding/confirm-password-reset', {
        state: {
          email: email.trim(),
          codeLength: json.codeLength,
          devHint: json.devMockCode ?? undefined,
        },
      })
    } catch (err) {
      const payload = (err as { payload?: { message?: string } }).payload
      toast.error(payload?.message ?? 'No se pudo solicitar el cambio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthPageShell
      title="Recuperar contraseña"
      subtitle="Ingresá tu email y la nueva contraseña. Te enviaremos un código de confirmación."
      backLabel="Volver al login"
      onBack={() => nav('/onboarding/login')}
    >
      <form className="vt-auth-form" onSubmit={(e) => void submit(e)}>
        <AuthFormField label="Email" icon={Mail} htmlFor="forgot-email">
          <input
            id="forgot-email"
            className="vt-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 120))}
            autoComplete="email"
          />
        </AuthFormField>

        <AuthFormField label="Nueva contraseña" icon={Lock} htmlFor="forgot-password">
          <input
            id="forgot-password"
            className="vt-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </AuthFormField>

        <AuthFormField label="Confirmar contraseña" icon={Lock} htmlFor="forgot-password-confirm">
          <input
            id="forgot-password-confirm"
            className="vt-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </AuthFormField>

        <button type="submit" className="vt-btn vt-btn-primary w-full px-3 py-3" disabled={!canSubmit}>
          {busy ? 'Enviando…' : 'Enviar confirmación por email'}
        </button>
      </form>
    </AuthPageShell>
  )
}
