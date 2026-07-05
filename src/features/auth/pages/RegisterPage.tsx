import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, Phone, User } from 'lucide-react'
import { CountrySelect } from '../components/CountrySelect'
import { sanitizeUsernameInput } from '@features/auth/logic/credentialsValidation'
import { PasswordInput } from '../components/PasswordInput'
import { useRegister } from '../hooks/useRegister'
import { AuthFormField, AuthPageShell } from '../components/AuthPageShell'

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
    <AuthPageShell
      title="Crear cuenta"
      subtitle="Teléfono, usuario, email y contraseña."
      backLabel="Volver a opciones"
      onBack={() => nav('/onboarding')}
    >
      <form className="vt-auth-form" onSubmit={(e) => void submit(e)}>
        {countriesStatus === 'error' ? (
          <button type="button" className="vt-btn" onClick={() => void loadCountries()}>
            Reintentar cargar países
          </button>
        ) : null}

        <AuthFormField label="Teléfono" icon={Phone}>
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
        </AuthFormField>

        <AuthFormField label="Usuario" icon={User} htmlFor="register-username">
          <input
            id="register-username"
            className="vt-input"
            value={username}
            onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
            maxLength={32}
            disabled={busy}
          />
        </AuthFormField>

        <AuthFormField label="Email" icon={Mail} htmlFor="register-email">
          <input
            id="register-email"
            className="vt-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 120))}
            autoComplete="email"
            disabled={busy}
          />
        </AuthFormField>

        <AuthFormField label="Contraseña" icon={Lock}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </AuthFormField>

        <AuthFormField label="Confirmar contraseña">
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </AuthFormField>

        <button
          type="submit"
          className="vt-btn vt-btn-primary w-full px-3 py-3"
          disabled={!canSubmit}
        >
          {busy ? 'Registrando…' : 'Continuar'}
        </button>

        <Link to="/onboarding/login" className="vt-auth-link">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </form>
    </AuthPageShell>
  )
}
