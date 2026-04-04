import { create } from 'zustand'

const SESSION_STORAGE_KEY = 'vt_session_active'

function readSessionActive(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Rol operativo en perfil: vendedor o transportista. Todos son compradores por defecto (no se elige en el select).
 */
export type UserRole = 'seller' | 'carrier'

export type SocialNetworkId = 'instagram' | 'telegram' | 'x'

/** Usuario / enlace tal como lo guardó el usuario (demo). */
export type ProfileSocialLinks = Partial<Record<SocialNetworkId, string>>

export type User = {
  id: string
  name: string
  email: string
  phone: string
  avatarUrl?: string
  role: UserRole
  trustScore: number
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
  me: User
  /** @handles u otra cadena guardada desde el perfil (demo). */
  profileSocialLinks: ProfileSocialLinks
  trustThreshold: number
  lastThresholdState: 'above' | 'below'
  notifications: NotificationItem[]
  savedReels: Record<string, boolean>

  setSessionActive: (active: boolean) => void
  setTrustScore: (score: number) => void
  setRole: (role: UserRole) => void
  setMeAvatarUrl: (url: string | undefined) => void
  setMeName: (name: string) => void
  setMeEmail: (email: string) => void
  setProfileSocialLink: (network: SocialNetworkId, value: string) => void
  pushNotification: (n: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  toggleSavedReel: (reelId: string) => void
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
  me: {
    id: 'me',
    name: 'Jhosef',
    email: 'demo@vibetrade.app',
    phone: '+54 11 5555-5555',
    role: 'seller',
    trustScore: 72,
  },
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

  setRole: (role) => set((s) => ({ me: { ...s.me, role } })),

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
}))

