import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { CountrySelect } from './CountrySelect'
import type { Country } from './countries'
import { apiFetch } from '../../utils/http/apiClient'
import { fetchSignInCountries } from '../../utils/http/fetchSignInCountries'
import type { OnboardingMode } from './OnboardingWelcomePage'

type PhoneLocationState = {
  mode?: OnboardingMode
}

export function PhoneEntryPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const mode = (loc.state as PhoneLocationState | null)?.mode ?? 'register'

  const [countries, setCountries] = useState<Country[]>([])
  const [country, setCountry] = useState<Country | null>(null)
  const [countriesStatus, setCountriesStatus] = useState<
    'loading' | 'ok' | 'error'
  >('loading')
  const [number, setNumber] = useState('')
  const [sending, setSending] = useState(false)

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

  const canSend =
    country != null &&
    number.replace(/[^\d]/g, '').length >= 7 &&
    !sending &&
    countriesStatus === 'ok'

  const heading =
    mode === 'login' ? 'Iniciar sesión' : 'Crear tu cuenta'
  const lead =
    mode === 'login' ?
      'Ingresá el número con el que te registraste. Te enviaremos un código por SMS.'
    : 'Ingresá tu número. Te enviaremos un código por SMS para verificarlo y crear tu perfil.'

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
          <h1 className="vt-h1">{heading}</h1>
          <div className="vt-muted">{lead}</div>
        </div>

        <div className="vt-card vt-card-pad bg-[var(--surface)]">
          <div className="vt-col">
            <div>
              <div className="mb-1.5 text-xs font-extrabold text-[var(--muted)]">País</div>
              {countriesStatus === 'loading' ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted)]">
                  Cargando países…
                </div>
              ) : countriesStatus === 'error' ? (
                <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                  <div className="text-sm text-[var(--muted)]">
                    No se pudo obtener la lista de países.
                  </div>
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm self-start"
                    onClick={() => void loadCountries()}
                  >
                    Reintentar
                  </button>
                </div>
              ) : country ? (
                <CountrySelect
                  countries={countries}
                  value={country}
                  onChange={setCountry}
                />
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 text-xs font-extrabold text-[var(--muted)]">Número</div>
              <div className="vt-row">
                <div
                  className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-3 py-3 text-[var(--muted)]"
                  aria-hidden="true"
                >
                  <Phone size={16} />
                  {country?.dial ?? '—'}
                </div>
                <input
                  className="vt-input vt-input-lg"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="11 5555 5555"
                  value={number}
                  disabled={!country || countriesStatus !== 'ok'}
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
              onClick={() => {
                void (async () => {
                  setSending(true)
                  try {
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
                      toast.error('No se pudo enviar el código. ¿Backend en marcha?')
                      return
                    }
                    const json = (await res.json()) as {
                      codeLength: number
                      devMockCode?: string | null
                    }
                    nav('/onboarding/otp', {
                      state: {
                        phone,
                        mode,
                        codeLength: json.codeLength,
                        devHint: json.devMockCode ?? undefined,
                      },
                    })
                  } finally {
                    setSending(false)
                  }
                })()
              }}
            >
              {sending ? 'Enviando…' : 'Enviar código'}
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="vt-pill max-w-[520px] text-center text-xs leading-relaxed text-[var(--muted)]">
            El código es de un solo uso. En entornos de desarrollo puede mostrarse como{' '}
            <span className="font-black text-[var(--text)]">devMockCode</span> en la respuesta del servidor.
          </div>
        </div>
      </div>
    </div>
  )
}
