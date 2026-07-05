import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { OtpInput } from '../components/OtpInput'
import { DevCodeBanner } from '../components/DevCodeBanner'
import { confirmPasswordReset } from '@features/auth/api/credentialsAuth'
import { AuthPageShell } from '../components/AuthPageShell'

type LocationState = {
  email?: string
  codeLength?: number
  devHint?: string | null
}

export function ConfirmPasswordResetPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const state = loc.state as LocationState | null
  const email = state?.email ?? ''
  const codeLength = typeof state?.codeLength === 'number' && state.codeLength > 0 ? state.codeLength : 7
  const devHint = state?.devHint ?? ''

  const [otp, setOtp] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!email) nav('/onboarding/forgot-password', { replace: true })
  }, [nav, email])

  async function verify(code: string) {
    setBusy(true)
    try {
      await confirmPasswordReset(email, code)
      toast.success('Contraseña actualizada')
      nav('/onboarding/login', { replace: true })
    } catch {
      setErr(true)
      window.setTimeout(() => setErr(false), 450)
      toast.error('Código inválido')
    } finally {
      setBusy(false)
    }
  }

  if (!email) return null

  return (
    <AuthPageShell
      title="Confirmar cambio"
      subtitle={`Ingresá el código de confirmación enviado a ${email}.`}
      headerExtra={<DevCodeBanner devHint={devHint} />}
    >
      <div className="vt-auth-form">
        <OtpInput value={otp} length={codeLength} error={err} onChange={setOtp} onComplete={verify} />
        <button
          type="button"
          className="vt-btn vt-btn-primary w-full px-3 py-3"
          disabled={busy}
          onClick={() => void verify(otp)}
        >
          {busy ? 'Confirmando…' : 'Confirmar cambio de contraseña'}
        </button>
      </div>
    </AuthPageShell>
  )
}
