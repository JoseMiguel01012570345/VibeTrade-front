import { useQuery } from '@tanstack/react-query'
import {
  fetchChatMessages,
  fetchChatThread,
  fetchRouteSheetPreselPreview,
  fetchThreadRouteSheets,
  fetchThreadRouteTramoSubscriptions,
  fetchThreadTradeAgreements,
} from '../api/chatApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useChatThreadQuery(
  threadId: string | undefined,
  enabled = true,
) {
  const tid = threadId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.chatThread(tid),
    queryFn: () => fetchChatThread(tid),
    enabled: enabled && tid.startsWith('cth_'),
    staleTime: 15_000,
  })
}

export function useChatThreadMessagesQuery(
  threadId: string | undefined,
  enabled = true,
) {
  const tid = threadId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.chatThreadMessages(tid),
    queryFn: () => fetchChatMessages(tid),
    enabled: enabled && tid.startsWith('cth_'),
    staleTime: 10_000,
  })
}

export function useChatThreadAgreementsQuery(
  threadId: string | undefined,
  enabled = true,
) {
  const tid = threadId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.chatThreadAgreements(tid),
    queryFn: () => fetchThreadTradeAgreements(tid),
    enabled: enabled && tid.startsWith('cth_'),
    staleTime: 15_000,
    retry: 1,
  })
}

export function useChatThreadRouteSheetsQuery(
  threadId: string | undefined,
  enabled = true,
) {
  const tid = threadId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.chatThreadRouteSheets(tid),
    queryFn: () => fetchThreadRouteSheets(tid),
    enabled: enabled && tid.startsWith('cth_'),
    staleTime: 15_000,
    retry: 1,
  })
}

export function useChatThreadRouteTramoSubsQuery(
  threadId: string | undefined,
  enabled = true,
) {
  const tid = threadId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.chatThreadRouteTramoSubs(tid),
    queryFn: () => fetchThreadRouteTramoSubscriptions(tid),
    enabled: enabled && tid.startsWith('cth_'),
    staleTime: 15_000,
    retry: 1,
  })
}

export function useRouteSheetPreselPreviewQuery(
  threadId: string,
  routeSheetId: string,
  enabled = true,
) {
  const tid = threadId.trim()
  const rsid = routeSheetId.trim()
  return useQuery({
    queryKey: queryKeys.routeSheetPreselPreview(tid, rsid),
    queryFn: () => fetchRouteSheetPreselPreview(tid, rsid),
    enabled: enabled && tid.length > 0 && rsid.length > 0,
    staleTime: 30_000,
  })
}
