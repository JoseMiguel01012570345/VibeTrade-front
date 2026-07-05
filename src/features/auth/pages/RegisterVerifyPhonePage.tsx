import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { OtpInput } from '../components/OtpInput'
import { DevCodeBanner } from '../components/DevCodeBanner'
import { verifyRegistrationPhone } from '@features/auth/api/credentialsAuth'
import { AuthPageShell } from '../components/AuthPageShell'

type LocationState = {
  registrationId?: string
  phone?: string
  email?: string
  codeLength?: number
  devHint?: string | null
}

export function RegisterVerifyPhonePage() {
  const nav = useNavigate()
  const loc = useLocation()
  const state = loc.state as LocationState | null
  const registrationId = state?.registrationId ?? ''
  const phone = state?.phone ?? ''
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
      const json = await verifyRegistrationPhone(registrationId, code)
      nav('/onboarding/verify-email', {
        replace: true,
        state: {
          registrationId,
          email,
          codeLength: json.codeLength,
          devHint: json.devMockCode ?? undefined,
        },
      })
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
      title="Verificá tu teléfono"
      subtitle={`Ingresá el código enviado por SMS${phone ? ` a ${phone}` : ''}.`}
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
          {busy ? 'Verificando…' : 'Continuar'}
        </button>
      </div>
    </AuthPageShell>
  )
}
