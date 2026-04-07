import { create } from 'zustand'

const SESSION_STORAGE_KEY = 'vt_session_active'
const SESSION_TOKEN_KEY = 'vt_session_token'

/** Sesión válida solo si coexisten bandera y token (evita estado a medias tras F5). */
function readSessionActive(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false
    return (
      sessionStorage.getItem(SESSION_STORAGE_KEY) === '1' &&
      !!sessionStorage.getItem(SESSION_TOKEN_KEY)
    )
  } catch {
    return false
  }
}

export type SocialNetworkId = 'instagram' | 'telegram' | 'x'

/** Enlaces de perfil guardados por el usuario. */
export type ProfileSocialLinks = Partial<Record<SocialNetworkId, string>>

/** Perfil global sin rol operativo: comprador/vendedor/transportista solo en el contexto de cada chat. */
export type User = {
  id: string
  name: string
  email: string
  phone: string
  avatarUrl?: string
  trustScore: number
  /** Cuentas persistidas en servidor (también reflejadas en `profileSocialLinks`). */
  instagram?: string
  telegram?: string
  xAccount?: string
}

const guestMe: User = {
  id: 'guest',
  name: '',
  email: '',
  phone: '',
  trustScore: 0,
}

type NotificationItem = {
  id: string
  kind: 'qa_reply' | 'payment' | 'system'
  title: string
  body: string
  createdAt: number
  read: boolean
}

type AppState = {
  /** Sesión iniciada (p. ej. tras verificar OTP). La barra de confianza solo aplica al usuario autenticado. */
  isSessionActive: boolean
  /** Usuario de prueba local; el resto del catálogo viene del API. */
  me: User
  /** Nombres mostrados para otros ids (bootstrap / Mocks del backend). */
  profileDisplayNames: Record<string, string>
  profileSocialLinks: ProfileSocialLinks
  trustThreshold: number
  lastThresholdState: 'above' | 'below'
  notifications: NotificationItem[]
  savedReels: Record<string, boolean>

  setSessionActive: (active: boolean) => void
  setTrustScore: (score: number) => void
  setMeAvatarUrl: (url: string | undefined) => void
  setMeName: (name: string) => void
  setMeEmail: (email: string) => void
  setProfileSocialLink: (network: SocialNetworkId, value: string) => void
  pushNotification: (n: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  toggleSavedReel: (reelId: string) => void
  applySessionUser: (user: User) => void
  resetSessionProfile: () => void
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function revokeBlobUrl(url: string | undefined) {
  if (url?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* noop */
    }
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  isSessionActive: readSessionActive(),
  me: { ...guestMe },
  profileDisplayNames: {},
  profileSocialLinks: {},
  trustThreshold: 0,
  lastThresholdState: 'above',
  notifications: [],
  savedReels: {},

  setSessionActive: (active) => {
    try {
      if (active) sessionStorage.setItem(SESSION_STORAGE_KEY, '1')
      else sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* private mode / unavailable */
    }
    set({ isSessionActive: active })
  },

  setTrustScore: (score) => {
    const threshold = get().trustThreshold
    set((s) => ({
      me: { ...s.me, trustScore: score },
      lastThresholdState: score < threshold ? 'below' : 'above',
    }))
  },

  setMeAvatarUrl: (url) =>
    set((s) => {
      revokeBlobUrl(s.me.avatarUrl)
      return { me: { ...s.me, avatarUrl: url } }
    }),

  setMeName: (name) =>
    set((s) => ({
      me: { ...s.me, name: name.trim().slice(0, 100) },
    })),

  setMeEmail: (email) =>
    set((s) => ({
      me: { ...s.me, email: email.trim().slice(0, 120) },
    })),

  setProfileSocialLink: (network, value) =>
    set((s) => {
      const t = value.trim()
      const next = { ...s.profileSocialLinks }
      if (!t) delete next[network]
      else next[network] = t
      return { profileSocialLinks: next }
    }),

  pushNotification: (n) => {
    const item: NotificationItem = {
      id: uid('notif'),
      kind: n.kind,
      title: n.title,
      body: n.body,
      createdAt: Date.now(),
      read: false,
    }
    set((s) => ({ notifications: [item, ...s.notifications] }))
  },

  markAllRead: () => set((s) => ({ notifications: s.notifications.map((x) => ({ ...x, read: true })) })),

  toggleSavedReel: (reelId) =>
    set((s) => ({ savedReels: { ...s.savedReels, [reelId]: !s.savedReels[reelId] } })),

  applySessionUser: (user) =>
    set((s) => {
      revokeBlobUrl(s.me.avatarUrl)
      const nextMe: User = { ...s.me, ...user }
      const profileSocialLinks: ProfileSocialLinks = {}
      if (nextMe.instagram) profileSocialLinks.instagram = nextMe.instagram
      if (nextMe.telegram) profileSocialLinks.telegram = nextMe.telegram
      if (nextMe.xAccount) profileSocialLinks.x = nextMe.xAccount
      return { me: nextMe, profileSocialLinks }
    }),

  resetSessionProfile: () =>
    set((s) => {
      revokeBlobUrl(s.me.avatarUrl)
      return {
        me: { ...guestMe },
        notifications: [],
        savedReels: {},
        profileSocialLinks: {},
      }
    }),
}))

