import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import { mergeMissingChatListThreadsFromServer } from '@features/chat/logic/thread/mergeMissingChatListThreadsFromServer'

/** Lista de hilos: sincroniza con servidor al montar. */
export function useChatListPage() {
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const threads = useMarketStore((s) => s.threads)
  const hydratedRef = useRef(false)

  const refreshThreads = useCallback(async () => {
    await mergeMissingChatListThreadsFromServer()
  }, [])

  useEffect(() => {
    if (hydratedRef.current || me.id === 'guest') return
    hydratedRef.current = true
    void refreshThreads().catch(() => {
      hydratedRef.current = false
    })
  }, [me.id, refreshThreads])

  return { threads, me, nav, refreshThreads }
}
