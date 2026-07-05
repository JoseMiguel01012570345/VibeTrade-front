import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Lock, Mail } from 'lucide-react'
import { forgotPassword } from '@features/auth/api/credentialsAuth'
import { isValidEmail, isValidPassword } from '@features/auth/logic/credentialsValidation'

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
    <div className="container vt-page">
      <div className="mx-auto mt-[18px] flex w-full max-w-[520px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="self-start border-0 bg-transparent px-0 text-sm font-extrabold text-[var(--primary)] underline-offset-2 hover:underline"
            onClick={() => nav('/onboarding/login')}
          >
            ← Volver al login
          </button>
          <h1 className="vt-h1">Recuperar contraseña</h1>
          <div className="vt-muted">
            Ingresá tu email y la nueva contraseña. Te enviaremos un código de confirmación.
          </div>
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
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Lock size={14} /> Nueva contraseña
              </span>
              <input
                className="vt-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Lock size={14} /> Confirmar contraseña
              </span>
              <input
                className="vt-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="vt-btn vt-btn-primary w-full px-3 py-3" disabled={!canSubmit}>
              {busy ? 'Enviando…' : 'Enviar confirmación por email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
