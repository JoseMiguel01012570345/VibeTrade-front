import { useAppStore } from "@features/auth/store/useAppStore";
import { bootstrapWebApp } from "@app/bootstrap/bootstrapWebApp"
import { stopChatRealtime } from "@features/chat/model/chatRealtime"
import { apiFetch } from "@shared/services/http/apiClient"
import { setSessionToken } from "@shared/services/http/sessionToken"

export async function logoutWebApp(): Promise<void> {
  stopChatRealtime()
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
  setSessionToken(null)
  useAppStore.getState().setSessionActive(false)
  useAppStore.getState().resetSessionProfile()
  await bootstrapWebApp()
}
