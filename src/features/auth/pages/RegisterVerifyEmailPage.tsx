import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { OtpInput } from '../components/OtpInput'
import { DevCodeBanner } from '../components/DevCodeBanner'
import { verifyRegistrationEmail } from '@features/auth/api/credentialsAuth'
import { applyAuthSession } from '../logic/applyAuthSession'
import { AuthPageShell } from '../components/AuthPageShell'

type LocationState = {
  registrationId?: string
  email?: string
  codeLength?: number
  devHint?: string | null
}

export function RegisterVerifyEmailPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const state = loc.state as LocationState | null
  const registrationId = state?.registrationId ?? ''
  const email = state?.email ?? ''
  const codeLength = typeof state?.codeLength === 'number' && state.codeLength > 0 ? state.codeLength : 7
  const devHint = state?.devHint ?? ''

  const [otp, setOtp] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!registrationId) nav('/onboarding/register', { replace: true })
  }, [nav, registrationId])

  async function verify(code: string) {
    setBusy(true)
    try {
      const json = await verifyRegistrationEmail(registrationId, code)
      await applyAuthSession(json, nav, { successMessage: 'Cuenta verificada' })
    } catch {
      setErr(true)
      window.setTimeout(() => setErr(false), 450)
      toast.error('Código inválido')
    } finally {
      setBusy(false)
    }
  }

  if (!registrationId) return null

  return (
    <AuthPageShell
      title="Verificá tu email"
      subtitle={`Ingresá el código enviado a ${email || 'tu email'}.`}
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
          {busy ? 'Verificando…' : 'Completar registro'}
        </button>
      </div>
    </AuthPageShell>
  )
}
