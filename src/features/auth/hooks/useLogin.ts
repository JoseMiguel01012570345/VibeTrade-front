import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { login } from '../api/credentialsAuth'
import { applyAuthSession } from '../logic/applyAuthSession'
import { isValidEmail } from '../logic/credentialsValidation'

export function useLogin() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!isValidEmail(email) || !password) {
      toast.error('Completa email y contraseña')
      return
    }
    setBusy(true)
    try {
      const json = await login(email.trim(), password)
      await applyAuthSession(json, nav, { successMessage: 'Sesión iniciada' })
    } catch (err) {
      const payload = (err as { payload?: { message?: string } }).payload
      toast.error(payload?.message ?? 'Email o contraseña incorrectos')
    } finally {
      setBusy(false)
    }
  }

  return { email, setEmail, password, setPassword, busy, submit }
}
