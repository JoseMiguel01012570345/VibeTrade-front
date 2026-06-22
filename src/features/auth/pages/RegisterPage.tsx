import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { CountrySelect } from './CountrySelect'
import type { Country } from './countries'
import { fetchSignInCountries } from '@shared/services/http/fetchSignInCountries'
import { register } from '@features/auth/api/credentialsAuth'
import { isValidEmail, isValidPassword } from '@features/auth/lib/credentialsValidation'
import { PasswordInput } from './PasswordInput'

export function RegisterPage() {
  const nav = useNavigate()
  const [countries, setCountries] = useState<Country[]>([])
  const [country, setCountry] = useState<Country | null>(null)
  const [countriesStatus, setCountriesStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [number, setNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const loadCountries = useCallback(async () => {
    setCountriesStatus('loading')
    try {
      const list = await fetchSignInCountries()
      if (list.length === 0) {
        setCountriesStatus('error')
        toast.error('No hay países disponibles para registro.')
        return
      }
      setCountries(list)
      setCountry(list[0])
      setCountriesStatus('ok')
    } catch {
      setCountriesStatus('error')
      toast.error('No se pudieron cargar los países.')
    }
  }, [])

  useEffect(() => {
    void loadCountries()
  }, [loadCountries])

  const phone = useMemo(() => {
    const digits = number.replace(/[^\d]/g, '')
    if (!country) return ''
    return `${country.dial} ${digits}`
  }, [country, number])

  const canSubmit =
    country != null &&
    number.replace(/[^\d]/g, '').length >= 7 &&
    isValidEmail(email) &&
    isValidPassword(password) &&
    password === confirmPassword &&
    !busy &&
    countriesStatus === 'ok'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      const json = await register(password, email.trim(), phone)
      nav('/onboarding/verify-phone', {
        state: {
          registrationId: json.registrationId,
          phone,
          email: email.trim(),
          codeLength: json.codeLength,
          devHint: json.devMockCode ?? undefined,
        },
      })
    } catch (err) {
      const payload = (err as { payload?: { error?: string; message?: string } }).payload
      toast.error(payload?.message ?? 'No se pudo iniciar el registro')
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
            onClick={() => nav('/onboarding')}
          >
            ← Volver a opciones
          </button>
          <h1 className="vt-h1">Crear tu cuenta</h1>
          <div className="vt-muted">
            Ingresá contraseña, email y teléfono. Luego verificaremos tu número y email.
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
                autoComplete="new-password"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Lock size={14} /> Confirmar contraseña
              </span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
            </label>
            <div>
              <div className="mb-1.5 text-xs font-extrabold text-[var(--muted)]">País</div>
              {countriesStatus === 'loading' ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted)]">
                  Cargando países…
                </div>
              ) : countriesStatus === 'error' ? (
                <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                  <div className="text-sm text-[var(--muted)]">No se pudo obtener la lista de países.</div>
                  <button type="button" className="vt-btn vt-btn-ghost vt-btn-sm self-start" onClick={() => void loadCountries()}>
                    Reintentar
                  </button>
                </div>
              ) : country ? (
                <CountrySelect countries={countries} value={country} onChange={setCountry} />
              ) : null}
            </div>
            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Phone size={14} /> Teléfono
              </span>
              <input
                className="vt-input"
                inputMode="tel"
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                autoComplete="tel-national"
              />
            </label>
            <button type="submit" className="vt-btn vt-btn-primary w-full px-3 py-3" disabled={!canSubmit}>
              {busy ? 'Enviando…' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
