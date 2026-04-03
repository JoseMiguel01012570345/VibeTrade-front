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

export type User = {
  id: string
  name: string
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
  trustThreshold: number
  lastThresholdState: 'above' | 'below'
  notifications: NotificationItem[]
  savedReels: Record<string, boolean>

  setSessionActive: (active: boolean) => void
  setTrustScore: (score: number) => void
  setRole: (role: UserRole) => void
  pushNotification: (n: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  toggleSavedReel: (reelId: string) => void
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export const useAppStore = create<AppState>((set, get) => ({
  isSessionActive: readSessionActive(),
  me: {
    id: 'me',
    name: 'Jhosef',
    phone: '+54 11 5555-5555',
    role: 'seller',
    trustScore: 72,
  },
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

