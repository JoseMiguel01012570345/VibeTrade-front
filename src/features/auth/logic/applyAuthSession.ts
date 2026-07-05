import { toast } from 'sonner'
import type { NavigateFunction } from 'react-router-dom'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { setSessionToken } from '@shared/services/http/sessionToken'
import { stopChatRealtime } from '@features/chat/logic/realtime/chatRealtime'
import { bootstrapWebApp } from '@app/bootstrap/bootstrapWebApp'
import type { AuthSessionJson } from '../Dtos/sessionUserTypes'
import { userFromSessionJson } from './sessionUser'

export async function applyAuthSession(
  json: AuthSessionJson,
  nav: NavigateFunction,
  options?: {
    successMessage?: string
    redirectTo?: string
  },
) {
  const setSessionActive = useAppStore.getState().setSessionActive
  const applySessionUser = useAppStore.getState().applySessionUser

  setSessionToken(json.sessionToken)
  stopChatRealtime()
  const user = userFromSessionJson(json.user)
  applySessionUser(user)
  if (options?.successMessage) toast.success(options.successMessage)
  setSessionActive(true)
  await bootstrapWebApp()
  // El personal (staff) aterriza directamente en el panel de su tienda.
  const staffRedirect = user.staffStoreId
    ? `/store/${user.staffStoreId}/panel/productos`
    : undefined
  nav(options?.redirectTo ?? staffRedirect ?? '/home', { replace: true })
}
