import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, Phone, User } from 'lucide-react'
import { CountrySelect } from '../components/CountrySelect'
import { sanitizeUsernameInput } from '@features/auth/model/credentialsValidation'
import { PasswordInput } from '../components/PasswordInput'
import { useRegister } from '../hooks/useRegister'

export function RegisterPage() {
  const nav = useNavigate()
  const {
    countries,
    country,
    setCountry,
    countriesStatus,
    number,
    setNumber,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    busy,
    canSubmit,
    submit,
    loadCountries,
  } = useRegister()

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
          <h1 className="vt-h1">Crear cuenta</h1>
          <div className="vt-muted">Teléfono, usuario, email y contraseña.</div>
        </div>

        <form className="vt-card vt-card-pad bg-[var(--surface)]" onSubmit={(e) => void submit(e)}>
          <div className="flex flex-col gap-3">
            {countriesStatus === 'error' ? (
              <button type="button" className="vt-btn" onClick={() => void loadCountries()}>
                Reintentar cargar países
              </button>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Phone size={14} /> Teléfono
              </span>
              <div className="flex gap-2">
                {country ? (
                  <CountrySelect
                    countries={countries}
                    value={country}
                    onChange={setCountry}
                  />
                ) : (
                  <div className="vt-input min-w-[8rem] opacity-60">País…</div>
                )}
                <input
                  className="vt-input min-w-0 flex-1"
                  inputMode="tel"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.slice(0, 20))}
                  disabled={countriesStatus !== 'ok' || busy}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <User size={14} /> Usuario
              </span>
              <input
                className="vt-input"
                value={username}
                onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                maxLength={32}
                disabled={busy}
              />
            </label>

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
                disabled={busy}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                <Lock size={14} /> Contraseña
              </span>
              <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-black text-[var(--muted)]">Confirmar contraseña</span>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              className="vt-btn vt-btn-primary w-full px-3 py-3"
              disabled={!canSubmit}
            >
              {busy ? 'Registrando…' : 'Continuar'}
            </button>

            <Link
              to="/onboarding/login"
              className="text-center text-sm font-extrabold text-[var(--primary)] underline-offset-2 hover:underline"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
