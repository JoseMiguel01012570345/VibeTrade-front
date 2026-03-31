import { create } from 'zustand'

export type UserRole = 'buyer' | 'seller' | 'carrier'

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
  me: User
  trustThreshold: number
  lastThresholdState: 'above' | 'below'
  notifications: NotificationItem[]
  savedReels: Record<string, boolean>

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
  me: {
    id: 'me',
    name: 'Jhosef',
    phone: '+54 11 5555-5555',
    role: 'buyer',
    trustScore: 72,
  },
  trustThreshold: 0,
  lastThresholdState: 'above',
  notifications: [],
  savedReels: {},

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

