import { useAppStore } from "@app/store/useAppStore";
import { bootstrapWebApp } from "@/utils/bootstrap/bootstrapWebApp"
import { stopChatRealtime } from "@/utils/chat/chatRealtime"
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
