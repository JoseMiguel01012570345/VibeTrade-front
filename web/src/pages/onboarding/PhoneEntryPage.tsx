import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { CountrySelect } from './CountrySelect'
import { COUNTRIES, type Country } from './countries'
import './onboarding.css'

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
      <div className="vt-onb-wrap">
        <div className="vt-onb-head">
          <h1 className="vt-h1">Verificación de teléfono</h1>
          <div className="vt-muted">Te enviaremos un SMS con tu código de verificación.</div>
        </div>

        <div className="vt-card vt-card-pad vt-onb-card">
          <div className="vt-col">
            <div>
              <div className="vt-onb-label">País</div>
              <CountrySelect value={country} onChange={setCountry} />
            </div>

            <div>
              <div className="vt-onb-label">Número</div>
              <div className="vt-row">
                <div className="vt-onb-prefix" aria-hidden="true">
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
              <div className="vt-onb-legal">Se enviará un SMS para verificar tu número.</div>
            </div>

            <button
              className="vt-btn vt-btn-primary vt-onb-action"
              disabled={!canSend}
              onClick={() => nav('/onboarding/otp', { state: { phone } })}
            >
              Enviar código
            </button>
          </div>
        </div>

        <div className="vt-onb-foot">
          <div className="vt-pill">Demo: tu OTP válido es 123456</div>
        </div>
      </div>
    </div>
  )
}

