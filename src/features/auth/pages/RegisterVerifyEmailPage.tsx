import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { OtpInput } from './OtpInput'
import { DevCodeBanner } from './DevCodeBanner'
import { verifyRegistrationEmail } from '@features/auth/api/credentialsAuth'
import { applyAuthSession } from '@features/auth/api/applyAuthSession'

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
    <div className="container vt-page">
      <div className="mx-auto mt-[18px] flex w-full max-w-[520px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h1 className="vt-h1">Verificá tu email</h1>
          <div className="vt-muted">
            Ingresá el código enviado a {email || 'tu email'}.
          </div>
          <DevCodeBanner devHint={devHint} />
        </div>

        <div className="vt-card vt-card-pad bg-[var(--surface)]">
          <div className="vt-col">
            <OtpInput value={otp} length={codeLength} error={err} onChange={setOtp} onComplete={verify} />
            <button
              className="vt-btn vt-btn-primary w-full px-3 py-3"
              disabled={busy}
              onClick={() => void verify(otp)}
            >
              {busy ? 'Verificando…' : 'Completar registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
