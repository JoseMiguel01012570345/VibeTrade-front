import { useAppStore } from '../../app/store/useAppStore'
import { apiFetch } from '../http/apiClient'
import { getSessionToken, setSessionToken } from '../http/sessionToken'
import { stopChatRealtime } from '../chat/chatRealtime'
import { userFromSessionJson, type SessionUserJson } from './sessionUser'

/** Si hay token guardado, hidrata `me` y la bandera de sesión desde el backend. */
export async function restoreAuthSession(): Promise<void> {
  const token = getSessionToken()
  if (!token) {
    useAppStore.getState().setSessionActive(false)
    return
  }

  const res = await apiFetch('/api/v1/auth/session')
  if (!res.ok) {
    setSessionToken(null)
    stopChatRealtime()
    useAppStore.getState().setSessionActive(false)
    useAppStore.getState().resetSessionProfile()
    return
  }

  const json = (await res.json()) as { user: SessionUserJson }
  useAppStore.getState().applySessionUser(userFromSessionJson(json.user))
  useAppStore.getState().setSessionActive(true)
}
