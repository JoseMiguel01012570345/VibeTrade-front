import { useAppStore } from '@features/auth/model/useAppStore'
import { bootstrapWebApp } from '@app/bootstrap/bootstrapWebApp'
import { stopChatRealtime } from '@features/chat/model/chatRealtime'
import { postLogout } from '../api/authSession'
import { setSessionToken } from '@shared/services/http/sessionToken'

export async function logoutWebApp(): Promise<void> {
  stopChatRealtime()
  await postLogout()
  setSessionToken(null)
  useAppStore.getState().setSessionActive(false)
  useAppStore.getState().resetSessionProfile()
  await bootstrapWebApp()
}
