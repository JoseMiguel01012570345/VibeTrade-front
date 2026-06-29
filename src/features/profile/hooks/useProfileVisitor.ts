import { useEffect } from 'react'
import { usePublicProfile } from './usePublicProfile'
import { useAppStore } from '@features/auth/model/useAppStore'

/** Perfil público de un visitante (no es el usuario de sesión). */
export function useProfileVisitor(profileUserId: string | undefined, isMe: boolean) {
  const uid = profileUserId?.trim() ?? ''
  const query = usePublicProfile(uid, !isMe && uid.length > 0)

  useEffect(() => {
    const p = query.data
    if (!p || isMe) return
    useAppStore.setState((s) => ({
      profileDisplayNames: {
        ...s.profileDisplayNames,
        [p.id]: p.name,
      },
      profileTrustScores: {
        ...s.profileTrustScores,
        [p.id]: p.trustScore,
      },
      ...(p.avatarUrl?.trim()
        ? {
            profileAvatarUrls: {
              ...s.profileAvatarUrls,
              [p.id]: p.avatarUrl.trim(),
            },
          }
        : {}),
    }))
  }, [query.data, isMe])

  return {
    visitorPublic: query.data ?? null,
    visitorPublicStatus: query.isLoading
      ? ('loading' as const)
      : query.isError
        ? ('error' as const)
        : query.isSuccess
          ? ('ready' as const)
          : ('idle' as const),
    refetchVisitor: query.refetch,
  }
}
