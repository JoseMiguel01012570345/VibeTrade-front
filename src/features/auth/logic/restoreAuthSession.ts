import { useAppStore } from '@features/auth/logic/useAppStore'
import { getSessionToken, setSessionToken } from '@shared/services/http/sessionToken'
import { stopChatRealtime } from '@features/chat/logic/realtime/chatRealtime'
import { fetchAuthSession } from '../api/authSession'
import { userFromSessionJson } from './sessionUser'

/** Si hay token guardado, hidrata `me` y la bandera de sesión desde el backend. */
export async function restoreAuthSession(): Promise<void> {
  const token = getSessionToken()
  if (!token) {
    useAppStore.getState().setSessionActive(false)
    return
  }

  const json = await fetchAuthSession()
  if (!json) {
    setSessionToken(null)
    stopChatRealtime()
    useAppStore.getState().setSessionActive(false)
    useAppStore.getState().resetSessionProfile()
    return
  }

  useAppStore.getState().applySessionUser(userFromSessionJson(json.user))
  useAppStore.getState().setSessionActive(true)
}
