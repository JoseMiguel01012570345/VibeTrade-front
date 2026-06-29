import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { Country } from '../components/countries'
import { fetchSignInCountries } from '@shared/services/http/fetchSignInCountries'
import { register } from '../api/credentialsAuth'
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
} from '../lib/credentialsValidation'

export function useRegister() {
  const nav = useNavigate()
  const [countries, setCountries] = useState<Country[]>([])
  const [country, setCountry] = useState<Country | null>(null)
  const [countriesStatus, setCountriesStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [number, setNumber] = useState('')
  const [username, setUsername] = useState('')
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
    isValidUsername(username) &&
    isValidEmail(email) &&
    isValidPassword(password) &&
    password === confirmPassword &&
    !busy &&
    countriesStatus === 'ok'

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      const json = await register(password, email.trim(), username.trim(), phone)
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
      const payload = (err as { payload?: { message?: string } }).payload
      toast.error(payload?.message ?? 'No se pudo registrar')
    } finally {
      setBusy(false)
    }
  }

  return {
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
    phone,
  }
}
