import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { cn } from '../../lib/cn'
import { useAppStore } from '../../app/store/useAppStore'
import { OtpInput } from './OtpInput'
import { apiFetch } from '../../utils/http/apiClient'
import { setSessionToken } from '../../utils/http/sessionToken'
import { stopChatRealtime } from '../../utils/chat/chatRealtime'
import { bootstrapWebApp } from '../../utils/bootstrap/bootstrapWebApp'
import { userFromSessionJson, type SessionUserJson } from '../../utils/auth/sessionUser'
import type { OnboardingMode } from './OnboardingWelcomePage'

function fmt(n: number) {
  const s = String(n).padStart(2, '0')
  return `00:${s}`
}

type OtpLocationState = {
  phone?: string
  mode?: OnboardingMode
  codeLength?: number
  devHint?: string | null
}

export function OtpPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const setSessionActive = useAppStore((s) => s.setSessionActive)
  const applySessionUser = useAppStore((s) => s.applySessionUser)

  const state = loc.state as OtpLocationState | null
  const phone = state?.phone ?? ''
  const mode = state?.mode ?? 'register'
  const codeLength = typeof state?.codeLength === 'number' && state.codeLength > 0 ? state.codeLength : 6
  const devHint = state?.devHint ?? ''

  const [otp, setOtp] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(59)

  useEffect(() => {
    if (!phone) nav('/onboarding/phone', { replace: true })
  }, [nav, phone])

  useEffect(() => {
    const t = window.setInterval(() => setSeconds((s) => (s <= 0 ? 0 : s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [])

  const canResend = seconds === 0
  const helper = useMemo(() => {
    if (!canResend) return `Reenviar código en ${fmt(seconds)}`
    return 'Reenviar código'
  }, [canResend, seconds])

  async function verify(code: string) {
    setBusy(true)
    try {
      const res = await apiFetch('/api/v1/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, mode }),
      })
      if (!res.ok) {
        if (res.status === 400) {
          let errPayload: { error?: string; message?: string } | null = null
          try {
            errPayload = (await res.json()) as {
              error?: string
              message?: string
            }
          } catch {
            /* ignore */
          }
          if (errPayload?.error === 'phone_already_registered') {
            toast.error(
              errPayload.message ??
                'Este número ya está registrado. Iniciá sesión si es tu cuenta.',
            )
            return
          }
        }
        setErr(true)
        window.setTimeout(() => setErr(false), 450)
        return
      }
      const json = (await res.json()) as { sessionToken: string; user: SessionUserJson }
      setSessionToken(json.sessionToken)
      stopChatRealtime()
      applySessionUser(userFromSessionJson(json.user))
      toast.success(mode === 'register' ? 'Cuenta verificada' : 'Sesión iniciada')
      setSessionActive(true)
      // Hydrate user-scoped workspace immediately after login.
      await bootstrapWebApp()
      nav('/home', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  if (!phone) return null

  return (
    <div className="container vt-page">
      <div className="mx-auto mt-[18px] flex w-full max-w-[520px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h1 className="vt-h1">Verificá tu PIN</h1>
          <div className="vt-muted">
            {mode === 'register' ?
              'Ingresá el código enviado por SMS para completar tu registro'
            : 'Ingresá el código enviado por SMS para iniciar sesión'}
            {phone ? ` a ${phone}` : ''}.
          </div>
          {devHint ?
            <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-3 py-2 text-xs text-[var(--muted)]">
              <span className="font-extrabold text-[var(--text)]">Dev:</span> código actual{' '}
              <span className="font-black tracking-wide text-[var(--text)]">{devHint}</span>
            </div>
          : null}
        </div>

        <div className="vt-card vt-card-pad bg-[var(--surface)]">
          <div className="vt-col">
            <OtpInput value={otp} length={codeLength} error={err} onChange={setOtp} onComplete={verify} />

            <button
              className="vt-btn vt-btn-primary w-full px-3 py-3"
              disabled={busy}
              onClick={() => void verify(otp)}
            >
              {busy ? 'Verificando…' : 'Continuar'}
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
                void (async () => {
                  const res = await apiFetch('/api/v1/auth/request-code', {
                    method: 'POST',
                    body: JSON.stringify({ phone, mode }),
                  })
                  if (!res.ok) {
                    let errPayload: { error?: string; message?: string } | null =
                      null
                    try {
                      errPayload = (await res.json()) as {
                        error?: string
                        message?: string
                      }
                    } catch {
                      /* ignore */
                    }
                    if (
                      res.status === 400 &&
                      errPayload?.error === 'phone_already_registered'
                    ) {
                      toast.error(
                        errPayload.message ??
                          'Este número ya está registrado. Iniciá sesión si es tu cuenta.',
                      )
                      return
                    }
                    toast.error('No se pudo reenviar el código')
                    return
                  }
                  const json = (await res.json()) as {
                    codeLength?: number
                    devMockCode?: string | null
                  }
                  setSeconds(59)
                  toast('Código reenviado')
                  nav(loc.pathname, {
                    replace: true,
                    state: {
                      phone,
                      mode,
                      codeLength:
                        typeof json.codeLength === 'number' && json.codeLength > 0 ?
                          json.codeLength
                        : codeLength,
                      devHint: json.devMockCode ?? undefined,
                    },
                  })
                  setOtp('')
                })()
              }}
            >
              {helper}
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            className="vt-btn"
            onClick={() => nav('/onboarding/phone', { state: { mode } })}
          >
            Cambiar número
          </button>
        </div>
      </div>
    </div>
  )
}
