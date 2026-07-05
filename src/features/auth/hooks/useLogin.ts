import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { applyAuthSession } from '../logic/applyAuthSession'
import { isValidEmail } from '../logic/credentialsValidation'
import { useLoginMutation } from './useLoginMutation'

export function useLogin() {
  const nav = useNavigate()
  const loginMutation = useLoginMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!isValidEmail(email) || !password) {
      toast.error('Completa email y contraseña')
      return
    }
    try {
      const json = await loginMutation.mutateAsync({
        email: email.trim(),
        password,
      })
      await applyAuthSession(json, nav, { successMessage: 'Sesión iniciada' })
    } catch (err) {
      const payload = (err as { payload?: { message?: string } }).payload
      toast.error(payload?.message ?? 'Email o contraseña incorrectos')
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    busy: loginMutation.isPending,
    submit,
  }
}
