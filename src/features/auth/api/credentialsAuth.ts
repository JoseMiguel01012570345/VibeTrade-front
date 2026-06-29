import { apiFetch } from '@shared/services/http/apiClient'
import type {
  OtpChallengeResponseJson,
  RegisterResponseJson,
} from '../Dtos/authApiTypes'
import type { AuthSessionJson } from '../Dtos/sessionUserTypes'
import { parseAuthError } from '../logic/authErrors'

export async function login(email: string, password: string) {
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await parseAuthError(res)
    throw Object.assign(new Error(err?.message ?? 'Login failed'), {
      payload: err,
      status: res.status,
    })
  }
  return (await res.json()) as AuthSessionJson
}

export async function register(
  password: string,
  email: string,
  username: string,
  phone: string,
) {
  const res = await apiFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ password, email, username, phone }),
  })
  if (!res.ok) {
    const err = await parseAuthError(res)
    throw Object.assign(new Error(err?.message ?? 'Register failed'), {
      payload: err,
      status: res.status,
    })
  }
  return (await res.json()) as RegisterResponseJson
}

export async function verifyRegistrationPhone(
  registrationId: string,
  code: string,
) {
  const res = await apiFetch('/api/v1/auth/register/verify-phone', {
    method: 'POST',
    body: JSON.stringify({ registrationId, code }),
  })
  if (!res.ok) {
    const err = await parseAuthError(res)
    throw Object.assign(new Error(err?.message ?? 'Verify phone failed'), {
      payload: err,
      status: res.status,
    })
  }
  return (await res.json()) as OtpChallengeResponseJson
}

export async function verifyRegistrationEmail(
  registrationId: string,
  code: string,
) {
  const res = await apiFetch('/api/v1/auth/register/verify-email', {
    method: 'POST',
    body: JSON.stringify({ registrationId, code }),
  })
  if (!res.ok) {
    const err = await parseAuthError(res)
    throw Object.assign(new Error(err?.message ?? 'Verify email failed'), {
      payload: err,
      status: res.status,
    })
  }
  return (await res.json()) as AuthSessionJson
}

export async function forgotPassword(email: string, newPassword: string) {
  const res = await apiFetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  })
  if (!res.ok) {
    const err = await parseAuthError(res)
    throw Object.assign(new Error(err?.message ?? 'Forgot password failed'), {
      payload: err,
      status: res.status,
    })
  }
  return (await res.json()) as OtpChallengeResponseJson
}

export async function confirmPasswordReset(email: string, code: string) {
  const res = await apiFetch('/api/v1/auth/confirm-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  if (!res.ok) {
    const err = await parseAuthError(res)
    throw Object.assign(new Error(err?.message ?? 'Confirm reset failed'), {
      payload: err,
      status: res.status,
    })
  }
}
