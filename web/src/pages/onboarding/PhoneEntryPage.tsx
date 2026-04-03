import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { CountrySelect } from './CountrySelect'
import { COUNTRIES, type Country } from './countries'

export function PhoneEntryPage() {
  const nav = useNavigate()
  const [country, setCountry] = useState<Country>(COUNTRIES[0])
  const [number, setNumber] = useState('')

  const phone = useMemo(() => {
    const digits = number.replace(/[^\d]/g, '')
    return `${country.dial} ${digits}`
  }, [country.dial, number])

  const canSend = number.replace(/[^\d]/g, '').length >= 7

  return (
    <div className="container vt-page">
      <div className="mx-auto mt-[18px] flex w-full max-w-[520px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h1 className="vt-h1">Verificación de teléfono</h1>
          <div className="vt-muted">Te enviaremos un SMS con tu código de verificación.</div>
        </div>

        <div className="vt-card vt-card-pad bg-[var(--surface)]">
          <div className="vt-col">
            <div>
              <div className="mb-1.5 text-xs font-extrabold text-[var(--muted)]">País</div>
              <CountrySelect value={country} onChange={setCountry} />
            </div>

            <div>
              <div className="mb-1.5 text-xs font-extrabold text-[var(--muted)]">Número</div>
              <div className="vt-row">
                <div
                  className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-3 py-3 text-[var(--muted)]"
                  aria-hidden="true"
                >
                  <Phone size={16} />
                  {country.dial}
                </div>
                <input
                  className="vt-input vt-input-lg"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="11 5555 5555"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </div>
              <div className="mt-2 text-xs text-[color-mix(in_oklab,var(--muted)_85%,var(--text))]">
                Se enviará un SMS para verificar tu número.
              </div>
            </div>

            <button
              className="vt-btn vt-btn-primary w-full px-3 py-3"
              disabled={!canSend}
              onClick={() => nav('/onboarding/otp', { state: { phone } })}
            >
              Enviar código
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="vt-pill">Demo: tu OTP válido es 123456</div>
        </div>
      </div>
    </div>
  )
}
