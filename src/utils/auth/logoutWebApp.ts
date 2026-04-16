import { useAppStore } from '../../app/store/useAppStore'
import { bootstrapWebApp } from '../bootstrap/bootstrapWebApp'
import { apiFetch } from '../http/apiClient'
import { setSessionToken } from '../http/sessionToken'

export async function logoutWebApp(): Promise<void> {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  setSessionToken(null)
  useAppStore.getState().setSessionActive(false)
  useAppStore.getState().resetSessionProfile()
  await bootstrapWebApp()
}
