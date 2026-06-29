import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@features/auth/store/useAppStore'
import { useMarketStore } from '@features/market/model/store/useMarketStore'
import { profileSectionPath, type ProfileSection, isProfileSection } from '@features/profile/model/profilePaths'
import { resolveIsMe, resolveProfileUserId, shouldOpenPaymentCardsModal } from '../model/profileAccountLogic'
import { useProfileVisitor } from './useProfileVisitor'
import { useState } from 'react'

export function useProfilePageRouting() {
  const { userId: routeUserId, section: sectionParam } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const isMe = resolveIsMe(routeUserId, me.id)
  const resolvedProfileUserId = resolveProfileUserId(routeUserId, me.id, isMe)
  const storesForProfile = useMarketStore((s) =>
    Object.values(s.stores).filter((st) => st.ownerUserId === resolvedProfileUserId),
  )

  const tab: ProfileSection =
    sectionParam && isProfileSection(sectionParam) ? sectionParam : 'account'

  const { visitorPublic, visitorPublicStatus } = useProfileVisitor(resolvedProfileUserId, isMe)

  const [paymentConfigOpen, setPaymentConfigOpen] = useState(false)

  useEffect(() => {
    if (!shouldOpenPaymentCardsModal(searchParams, isMe)) return
    setPaymentConfigOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('paymentCards')
    setSearchParams(next, { replace: true })
  }, [isMe, searchParams, setSearchParams])

  useEffect(() => {
    if (!routeUserId) return
    if (tab === 'stores' && storesForProfile.length === 0 && !isMe) {
      nav(profileSectionPath(routeUserId, 'account'), { replace: true })
    }
  }, [tab, storesForProfile.length, isMe, routeUserId, nav])

  useEffect(() => {
    if (!routeUserId) return
    if (tab === 'reels' && !isMe) {
      nav(profileSectionPath(routeUserId, 'account'), { replace: true })
    }
  }, [tab, isMe, routeUserId, nav])

  useEffect(() => {
    if (!routeUserId) return
    if (tab === 'saved' && !isMe) {
      nav(profileSectionPath(routeUserId, 'account'), { replace: true })
    }
  }, [tab, isMe, routeUserId, nav])

  const letter = useMemo(() => {
    const n = isMe ? me.name : visitorPublic?.name
    return (n?.trim()?.[0] ?? '?').toUpperCase()
  }, [isMe, me.name, visitorPublic?.name])

  return {
    routeUserId,
    sectionParam,
    resolvedProfileUserId,
    isMe,
    tab,
    storesForProfile,
    visitorPublic,
    visitorPublicStatus,
    paymentConfigOpen,
    setPaymentConfigOpen,
    letter,
    nav,
  }
}
