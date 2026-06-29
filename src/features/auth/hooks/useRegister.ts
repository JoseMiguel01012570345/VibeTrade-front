import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { SignInCountry } from '../Dtos/signInCountry'
import {
  isValidEmail,
  isValidPassword,
  isValidUsername,
} from '../logic/credentialsValidation'
import { useSignInCountries } from './useSignInCountries'
import { useRegisterMutation } from './useRegisterMutation'

export function useRegister() {
  const nav = useNavigate()
  const countriesQuery = useSignInCountries()
  const registerMutation = useRegisterMutation()
  const [country, setCountry] = useState<SignInCountry | null>(null)
  const [number, setNumber] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const countries = countriesQuery.data ?? []

  useEffect(() => {
    if (countries.length === 0) return
    setCountry((prev) => prev ?? countries[0] ?? null)
  }, [countries])

  useEffect(() => {
    if (countriesQuery.isError) {
      toast.error('No se pudieron cargar los países.')
    } else if (
      countriesQuery.isSuccess &&
      countries.length === 0
    ) {
      toast.error('No hay países disponibles para registro.')
    }
  }, [countriesQuery.isError, countriesQuery.isSuccess, countries.length])

  const countriesStatus = countriesQuery.isLoading
    ? ('loading' as const)
    : countriesQuery.isError || countries.length === 0
      ? ('error' as const)
      : ('ok' as const)

  const loadCountries = useCallback(async () => {
    await countriesQuery.refetch()
  }, [countriesQuery])

  const phone = useMemo(() => {
    const digits = number.replace(/[^\d]/g, '')
    if (!country) return ''
    return `${country.dial} ${digits}`
  }, [country, number])

  const busy = registerMutation.isPending

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
    try {
      const json = await registerMutation.mutateAsync({
        password,
        email: email.trim(),
        username: username.trim(),
        phone,
      })
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
