import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '@features/auth/logic/useAppStore'
import {
  getReelsInitialComments,
  getReelsInitialLikeCounts,
  getReelsItems,
} from '../api/reelsBootstrap'
import { reelLikeReducer } from '../logic/reelLikes'
import type { ReelComment } from '../Dtos/reelComment'

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export const reelBtnClass =
  'grid h-[46px] w-[46px] shrink-0 cursor-pointer place-items-center rounded-2xl border border-white/25 bg-[rgba(2,6,23,0.4)] text-white [&_svg]:h-5 [&_svg]:w-5'

export function useReelsPage() {
  const [searchParams] = useSearchParams()
  const storeFilter = searchParams.get('store')
  const reelFocusId = searchParams.get('reel')

  const me = useAppStore((s) => s.me)
  const isSessionActive = useAppStore((s) => s.isSessionActive)
  const savedReels = useAppStore((s) => s.savedReels)
  const toggleSavedReel = useAppStore((s) => s.toggleSavedReel)
  const [idx, setIdx] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [reelLikes, dispatchReelLike] = useReducer(reelLikeReducer, {
    liked: {},
    counts: { ...getReelsInitialLikeCounts() },
  })
  const [commentsByReel, setCommentsByReel] = useState<Record<string, ReelComment[]>>(() => ({
    ...getReelsInitialComments(),
  }))
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const isAnimatingRef = useRef(false)

  const reels = useMemo(() => {
    const all = getReelsItems()
    if (storeFilter) return all.filter((r) => r.storeId === storeFilter)
    return all
  }, [storeFilter])

  useEffect(() => {
    if (!reels.length) {
      setIdx(0)
      return
    }
    if (reelFocusId) {
      const i = reels.findIndex((r) => r.id === reelFocusId)
      if (i >= 0) {
        setIdx(i)
        return
      }
    }
    setIdx(0)
  }, [storeFilter, reelFocusId, reels])

  const canPublish = isSessionActive && me.id !== 'guest'
  const currentReel = reels.length ? reels[Math.min(idx, reels.length - 1)] : undefined

  function addComment(text: string, parentId: string | null) {
    if (!currentReel) return
    const reelId = currentReel.id
    const next: ReelComment = {
      id: uid('cmt'),
      parentId,
      authorName: me.name,
      text,
      at: Date.now(),
      ratingsByUser: {},
    }
    setCommentsByReel((prev) => ({
      ...prev,
      [reelId]: [...(prev[reelId] ?? []), next],
    }))
    toast.success(parentId ? 'Respuesta enviada' : 'Comentario enviado')
  }

  function setCommentRating(commentId: string, value: number) {
    if (!currentReel) return
    const reelId = currentReel.id
    const viewerId = me.id
    setCommentsByReel((prev) => {
      const list = prev[reelId] ?? []
      return {
        ...prev,
        [reelId]: list.map((c) => {
          if (c.id !== commentId) return c
          const next = { ...c.ratingsByUser }
          if (value === 0) delete next[viewerId]
          else next[viewerId] = value
          return { ...c, ratingsByUser: next }
        }),
      }
    })
  }

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    let touchStartY: number | null = null

    function goByDelta(deltaY: number) {
      if (shareOpen || commentsOpen) return
      if (isAnimatingRef.current) return
      if (!reels.length) return

      const dir = deltaY > 0 ? 1 : -1
      const jump = Math.max(1, Math.min(3, Math.round(Math.abs(deltaY) / 140)))

      isAnimatingRef.current = true
      setIdx((prev) => {
        const next = (prev + dir * jump) % reels.length
        return next < 0 ? next + reels.length : next
      })

      globalThis.setTimeout(() => {
        isAnimatingRef.current = false
      }, 520)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      goByDelta(e.deltaY)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      touchStartY = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY === null) return
      const dy = touchStartY - e.changedTouches[0].clientY
      touchStartY = null
      if (Math.abs(dy) < 28) return
      goByDelta(dy)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [reels.length, shareOpen, commentsOpen])

  return {
    reels,
    idx,
    shareOpen,
    setShareOpen,
    commentsOpen,
    setCommentsOpen,
    reelLikes,
    dispatchReelLike,
    commentsByReel,
    viewportRef,
    canPublish,
    currentReel,
    me,
    savedReels,
    toggleSavedReel,
    addComment,
    setCommentRating,
    reelBtn: reelBtnClass,
  }
}
