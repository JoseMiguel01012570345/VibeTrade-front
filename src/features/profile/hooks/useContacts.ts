import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addContactByPhone,
  fetchContacts,
  removeContact,
  resolvePlatformUserByPhone,
} from '../api/contactsApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useContacts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: fetchContacts,
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

export function useAddContactMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addContactByPhone,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useRemoveContactMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeContact,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts })
    },
  })
}

export function useResolveUserByPhoneMutation() {
  return useMutation({
    mutationFn: resolvePlatformUserByPhone,
  })
}
