import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '../../lib/cn'
import { useAppStore } from '../../app/store/useAppStore'
import { OtpInput } from './OtpInput'

function fmt(n: number) {
  const s = String(n).padStart(2, '0')
  return `00:${s}`
}

export function OtpPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const setSessionActive = useAppStore((s) => s.setSessionActive)
  const phone = (loc.state as { phone?: string } | null)?.phone ?? ''

  const [otp, setOtp] = useState('')
  const [err, setErr] = useState(false)
  const [seconds, setSeconds] = useState(59)

  useEffect(() => {
    const t = window.setInterval(() => setSeconds((s) => (s <= 0 ? 0 : s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [])

  const canResend = seconds === 0
  const helper = useMemo(() => {
    if (!canResend) return `Reenviar código en ${fmt(seconds)}`
    return 'Reenviar código'
  }, [canResend, seconds])

  function verify(code: string) {
    const ok = code === '123456'
    if (!ok) {
      setErr(true)
      window.setTimeout(() => setErr(false), 450)
      return
    }
    toast.success('Teléfono verificado')
    setSessionActive(true)
    nav('/home', { replace: true })
  }

  return (
    <div className="container vt-page">
      <div className="mx-auto mt-[18px] flex w-full max-w-[520px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h1 className="vt-h1">Verificá tu PIN</h1>
          <div className="vt-muted">
            Ingresá el código enviado por SMS{phone ? ` a ${phone}` : ''}.
          </div>
        </div>

        <div className="vt-card vt-card-pad bg-[var(--surface)]">
          <div className="vt-col">
            <OtpInput value={otp} length={6} error={err} onChange={setOtp} onComplete={verify} />

            <button className="vt-btn vt-btn-primary w-full px-3 py-3" onClick={() => verify(otp)}>
              Continuar
            </button>

            <button
              className={cn(
                'border-0 bg-transparent px-0 pb-0 pt-2',
                canResend
                  ? 'cursor-pointer font-extrabold text-[var(--primary)]'
                  : 'cursor-default text-[var(--muted)]',
              )}
              type="button"
              onClick={() => {
                if (!canResend) return
                setSeconds(59)
                toast('Código reenviado')
              }}
            >
              {helper}
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <button className="vt-btn" onClick={() => nav('/onboarding/phone')}>
            Cambiar número
          </button>
        </div>
      </div>
    </div>
  )
}
