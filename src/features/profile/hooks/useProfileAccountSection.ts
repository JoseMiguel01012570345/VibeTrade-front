import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  type SocialNetworkId,
  useAppStore,
} from '@features/auth/store/useAppStore'
import {
  patchProfile,
  patchProfileAvatar,
} from '@features/auth/api/patchProfile'
import { userFromSessionJson } from '@features/auth/api/sessionUser'
import { logoutWebApp } from '@features/auth/api/logoutWebApp'
import { mediaApiUrl, uploadMedia } from '@shared/services/media/mediaClient'
import { isValidEmail, shouldOpenPaymentCardsModal } from '../model/profileAccountLogic'
import { revokeBlobUrlLocal } from '../model/revokeBlobUrlLocal'
import { PROFILE_SOCIAL_META } from '../components/account/profileSocialMeta'
import type { ProfileVisitorPublic } from '../Dtos/profileVisitorPublic'

type Params = {
  isMe: boolean
  safeName: string
  safeEmail: string
  safeUsername: string
  profileDisplayName: string
  resolvedProfileUserId: string
  letter: string
  visitorPublic: ProfileVisitorPublic
  visitorPublicStatus: 'idle' | 'loading' | 'ready' | 'error'
  visitorAvatarDisplay?: string
  searchParams: URLSearchParams
  setSearchParams: (
    next: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams),
    opts?: { replace?: boolean },
  ) => void
}

export function useProfileAccountSection({
  isMe,
  safeName,
  safeEmail,
  searchParams,
  setSearchParams,
}: Pick<
  Params,
  'isMe' | 'safeName' | 'safeEmail' | 'searchParams' | 'setSearchParams'
>) {
  const nav = useNavigate()
  const me = useAppStore((s) => s.me)
  const profileSocialLinks = useAppStore((s) => s.profileSocialLinks)
  const applySessionUser = useAppStore((s) => s.applySessionUser)

  const [socialModal, setSocialModal] = useState<SocialNetworkId | null>(null)
  const [socialDraft, setSocialDraft] = useState('')
  const [nameDraft, setNameDraft] = useState(safeName)
  const [emailDraft, setEmailDraft] = useState(safeEmail)
  const [avatarDraftUrl, setAvatarDraftUrl] = useState<string | null>(null)
  const avatarDraftRef = useRef<string | null>(null)
  const profileAvatarInputRef = useRef<HTMLInputElement>(null)
  const [profileUploadBusy, setProfileUploadBusy] = useState(false)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [contactsModalOpen, setContactsModalOpen] = useState(false)
  const [paymentConfigOpen, setPaymentConfigOpen] = useState(false)

  useEffect(() => {
    if (!shouldOpenPaymentCardsModal(searchParams, isMe)) return
    setPaymentConfigOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('paymentCards')
    setSearchParams(next, { replace: true })
  }, [isMe, searchParams, setSearchParams])

  useEffect(() => {
    avatarDraftRef.current = avatarDraftUrl
  }, [avatarDraftUrl])

  useEffect(
    () => () => {
      revokeBlobUrlLocal(avatarDraftRef.current)
    },
    [],
  )

  useEffect(() => {
    setNameDraft(safeName)
  }, [safeName])

  useEffect(() => {
    setEmailDraft(safeEmail)
  }, [safeEmail])

  const nameDirty = isMe && nameDraft.trim() !== safeName.trim()
  const emailDirty =
    isMe && emailDraft.trim().toLowerCase() !== safeEmail.trim().toLowerCase()
  const profileAvatarDirty = isMe && avatarDraftUrl !== null
  const profileAvatarDisplayUrl = avatarDraftUrl ?? me.avatarUrl
  const socialModalMeta = socialModal ? PROFILE_SOCIAL_META[socialModal] : null

  function openSocialModal(net: SocialNetworkId) {
    setSocialDraft(profileSocialLinks[net] ?? '')
    setSocialModal(net)
  }

  async function onProfileAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const picked = input.files ? Array.from(input.files) : []
    input.value = ''
    const file = picked[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Elige un archivo de imagen.')
      return
    }
    setProfileUploadBusy(true)
    try {
      const uploaded = await uploadMedia(file)
      const url = mediaApiUrl(uploaded.id)
      setAvatarDraftUrl((prev) => {
        revokeBlobUrlLocal(prev)
        return url
      })
      toast.success('Revisa la imagen y toca Guardar para confirmar.')
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo subir la imagen.'
      toast.error(msg)
    } finally {
      setProfileUploadBusy(false)
    }
  }

  async function saveProfileAvatar() {
    if (!avatarDraftUrl) return
    if (!avatarDraftUrl.startsWith('/api/v1/media/')) {
      toast.error('Guarda de nuevo: la foto debe subirse al servidor.')
      return
    }
    setProfileUploadBusy(true)
    try {
      const userJson = await patchProfileAvatar(avatarDraftUrl)
      applySessionUser(userFromSessionJson(userJson))
      avatarDraftRef.current = null
      setAvatarDraftUrl(null)
      toast.success('Foto de perfil guardada')
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo guardar la foto de perfil.'
      toast.error(msg)
    } finally {
      setProfileUploadBusy(false)
    }
  }

  function discardProfileAvatarDraft() {
    setAvatarDraftUrl((prev) => {
      revokeBlobUrlLocal(prev)
      return null
    })
  }

  async function saveDisplayName() {
    const t = nameDraft.trim()
    if (t.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres.')
      return
    }
    try {
      const userJson = await patchProfile({ name: t })
      applySessionUser(userFromSessionJson(userJson))
      toast.success('Nombre guardado')
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo guardar el nombre.'
      toast.error(msg)
    }
  }

  async function saveEmailField() {
    const t = emailDraft.trim()
    if (!isValidEmail(t)) {
      toast.error('Ingresá un email válido.')
      return
    }
    try {
      const userJson = await patchProfile({ email: t })
      applySessionUser(userFromSessionJson(userJson))
      toast.success('Email guardado')
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo guardar el email.'
      toast.error(msg)
    }
  }

  async function saveSocialFromModal() {
    if (!socialModal) return
    const t = socialDraft.trim()
    try {
      const userJson = await patchProfile(
        socialModal === 'instagram'
          ? { instagram: t }
          : socialModal === 'telegram'
            ? { telegram: t }
            : { xAccount: t },
      )
      applySessionUser(userFromSessionJson(userJson))
      setSocialModal(null)
      toast.success('Enlace guardado')
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo guardar el enlace.'
      toast.error(msg)
    }
  }

  async function confirmLogout() {
    setLogoutBusy(true)
    try {
      await logoutWebApp()
      setLogoutConfirmOpen(false)
      nav('/onboarding', { replace: true })
      toast.success('Sesión cerrada')
    } finally {
      setLogoutBusy(false)
    }
  }

  return {
    me,
    profileSocialLinks,
    profileAvatarInputRef,
    profileUploadBusy,
    nameDraft,
    setNameDraft,
    emailDraft,
    setEmailDraft,
    nameDirty,
    emailDirty,
    profileAvatarDirty,
    profileAvatarDisplayUrl,
    onProfileAvatarChange,
    saveProfileAvatar,
    discardProfileAvatarDraft,
    saveDisplayName,
    saveEmailField,
    openSocialModal,
    socialModal,
    setSocialModal,
    socialDraft,
    setSocialDraft,
    socialModalMeta,
    saveSocialFromModal,
    contactsModalOpen,
    setContactsModalOpen,
    paymentConfigOpen,
    setPaymentConfigOpen,
    logoutConfirmOpen,
    setLogoutConfirmOpen,
    logoutBusy,
    confirmLogout,
    avatarPreviewUrl,
    setAvatarPreviewUrl,
  }
}
