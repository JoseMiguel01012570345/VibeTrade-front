import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Thread } from '@features/market/model/store/useMarketStore'
import { useMarketStore } from '@features/market/model/store/useMarketStore'
import { normalizeThreadMessages } from '@features/chat/model/chatMerge'
import {
  formatFileSize,
  inferDocKind,
} from '@features/chat/model/chatAttachments'
import {
  type PendingDoc,
  type PendingImg,
} from '../components/composer/ChatComposerSection'
import { useChatVoiceRecorder } from './useChatVoiceRecorder'

function revokeBlob(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

function newPendingId() {
  return `p_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

type Params = {
  threadId: string | undefined
  thread: Thread | undefined
  chatActionsLocked: boolean
}

export function useChatPageComposer({
  threadId,
  thread,
  chatActionsLocked,
}: Params) {
  const sendText = useMarketStore((s) => s.sendText)
  const sendAudio = useMarketStore((s) => s.sendAudio)
  const sendDocsBundle = useMarketStore((s) => s.sendDocsBundle)
  const sendImages = useMarketStore((s) => s.sendImages)

  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const draftInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingImages, setPendingImages] = useState<PendingImg[]>([])
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([])
  const [pendingAudio, setPendingAudio] = useState<{
    url: string
    seconds: number
  } | null>(null)

  const draftRef = useRef(draft)
  draftRef.current = draft
  const pendingDocsRef = useRef(pendingDocs)
  pendingDocsRef.current = pendingDocs
  const pendingImagesRef = useRef(pendingImages)
  pendingImagesRef.current = pendingImages
  const pendingAudioRef = useRef(pendingAudio)
  pendingAudioRef.current = pendingAudio

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  )
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds

  const {
    recording,
    recordSecs,
    voiceRecorderContainerRef,
    toggleVoiceRecording,
  } = useChatVoiceRecorder({
    threadId,
    chatActionsLocked,
    sendAudio,
    setSelected,
    selectedIdsRef,
    pendingDocsRef,
    pendingImagesRef,
    draftRef,
    pendingAudioRef,
    setPendingAudio,
  })

  const selectedOrdered = useMemo(() => {
    if (!thread) return []
    const order = new Map(
      normalizeThreadMessages(thread.messages).map((m, i) => [m.id, i]),
    )
    return [...selectedIds].sort(
      (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
    )
  }, [selectedIds, thread])

  useEffect(() => {
    if (selectedIds.length > 0) draftInputRef.current?.focus()
  }, [selectedIds.length])

  const blockTextWithVoiceAndFiles =
    pendingAudio !== null &&
    (pendingDocs.length > 0 || pendingImages.length > 0)

  useEffect(() => {
    if (blockTextWithVoiceAndFiles) setDraft('')
  }, [blockTextWithVoiceAndFiles])

  const onPickDocument = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.currentTarget.value = ''
    if (!files.length) return
    const added: PendingDoc[] = files.map((file) => ({
      id: newPendingId(),
      url: URL.createObjectURL(file),
      name: file.name,
      size: formatFileSize(file.size),
      kind: inferDocKind(file.name),
    }))
    setPendingDocs((prev) => [...prev, ...added])
    queueMicrotask(() => draftInputRef.current?.focus())
  }, [])

  const onPickImages = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.currentTarget.value = ''
    if (!files.length) return
    const added: PendingImg[] = files.map((file) => ({
      id: newPendingId(),
      url: URL.createObjectURL(file),
    }))
    setPendingImages((prev) => [...prev, ...added])
    queueMicrotask(() => draftInputRef.current?.focus())
  }, [])

  const removePendingImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const img = prev.find((x) => x.id === id)
      if (img) revokeBlob(img.url)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const removePendingDoc = useCallback((id: string) => {
    setPendingDocs((prev) => {
      const row = prev.find((x) => x.id === id)
      if (row) revokeBlob(row.url)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const removePendingAudio = useCallback(() => {
    setPendingAudio((prev) => {
      if (prev) revokeBlob(prev.url)
      return null
    })
  }, [])

  function toggleSelectRow(e: MouseEvent, id: string) {
    if (chatActionsLocked) return
    if ((e.target as HTMLElement).closest('[data-chat-interactive]')) return
    setSelected((s) => ({ ...s, [id]: !s[id] }))
  }

  function submitComposer() {
    if (!threadId || !thread || recording || thread.chatActionsLocked) return
    const replyIds = selectedIds
    const hasDocsOrImages = pendingDocs.length > 0 || pendingImages.length > 0
    const hasVoice = pendingAudio !== null
    const noTextWithVoiceAndFiles = hasVoice && hasDocsOrImages
    const caption = noTextWithVoiceAndFiles ? '' : draft.trim()
    const cap = caption || undefined
    if (!hasDocsOrImages && !caption && !hasVoice) return

    let first = true
    let voiceEmbeddedInDocs = false
    let voiceEmbeddedInImages = false

    if (pendingDocs.length > 0) {
      sendDocsBundle(
        thread.id,
        {
          documents: pendingDocs.map((d) => ({
            name: d.name,
            size: d.size,
            kind: d.kind,
            url: d.url,
          })),
          embeddedAudio: pendingAudio ?? undefined,
        },
        { replyToIds: replyIds, caption: first ? cap : undefined },
      )
      voiceEmbeddedInDocs = pendingAudio !== null
      first = false
    }

    if (pendingImages.length > 0) {
      sendImages(
        thread.id,
        pendingImages.map((p) => ({ url: p.url })),
        {
          replyToIds: replyIds,
          caption: first ? cap : undefined,
          embeddedAudio:
            pendingAudio && !voiceEmbeddedInDocs ? pendingAudio : undefined,
        },
      )
      voiceEmbeddedInImages = pendingAudio !== null && !voiceEmbeddedInDocs
      first = false
    }

    if (!pendingDocs.length && !pendingImages.length && caption) {
      sendText(thread.id, caption, replyIds)
    }

    if (hasVoice && !voiceEmbeddedInDocs && !voiceEmbeddedInImages) {
      sendAudio(
        thread.id,
        {
          url: pendingAudio!.url,
          seconds: pendingAudio!.seconds,
        },
        replyIds.length ? { replyToIds: replyIds } : undefined,
      )
    }

    setPendingDocs([])
    setPendingImages([])
    setPendingAudio(null)
    setDraft('')
    setSelected({})
  }

  const hasComposeToSend =
    pendingDocs.length > 0 ||
    pendingImages.length > 0 ||
    draft.trim().length > 0 ||
    pendingAudio !== null

  const canSend = !recording && hasComposeToSend && !chatActionsLocked

  return {
    draft,
    setDraft,
    selected,
    setSelected,
    draftInputRef,
    pendingImages,
    pendingDocs,
    pendingAudio,
    selectedIds,
    selectedOrdered,
    recording,
    recordSecs,
    voiceRecorderContainerRef,
    toggleVoiceRecording,
    onPickDocument,
    onPickImages,
    removePendingImage,
    removePendingDoc,
    removePendingAudio,
    toggleSelectRow,
    submitComposer,
    blockTextWithVoiceAndFiles,
    hasComposeToSend,
    canSend,
  }
}
