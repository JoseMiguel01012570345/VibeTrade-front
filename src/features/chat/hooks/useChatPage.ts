import { useParams } from 'react-router-dom'
import { useAppStore } from '@features/auth/store/useAppStore'
import { useMarketStore } from '@features/market/model/store/useMarketStore'

/** Estado de ruta del hilo activo (hidratación en ChatPage vía useHydratePersistedChatThread). */
export function useChatPage() {
  const { threadId } = useParams()
  const me = useAppStore((s) => s.me)
  const thread = useMarketStore((s) =>
    threadId ? s.threads[threadId] : undefined,
  )

  return { threadId, thread, me }
}
