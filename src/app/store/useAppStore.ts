import { create } from 'zustand'
import { getOpenChatThreadIdFromLocation } from '../../utils/chat/getOpenChatThreadIdFromLocation'
import { getSessionToken } from '../../utils/http/sessionToken'
import {
  postMeTrustAdjust,
  trustHistoryItemFromApi,
} from '../../utils/trust/trustLedgerApi'
import type { TrustHistoryEntry } from './trustLedgerTypes'

export type { TrustHistoryEntry } from './trustLedgerTypes'

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

export type NotificationItem = {
  id: string
  kind:
    | 'qa_reply'
    | 'payment'
    | 'system'
    | 'chat_message'
    | 'offer_comment'
    | 'offer_like'
    | 'qa_comment_like'
    | 'route_tramo_subscribe'
    | 'route_tramo_subscribe_accepted'
    | 'route_tramo_subscribe_rejected'
    | 'route_tramo_seller_expelled'
    | 'route_sheet_presel'
    | 'route_sheet_presel_decl'
    | 'store_trust_penalty'
    | 'peer_party_exited'
  title: string
  body: string
  createdAt: number
  read: boolean
  /** Chat: abrir `/chat/:threadId`. */
  threadId?: string
  /** Comentario en ficha: abrir `/offer/:offerId`. */
  offerId?: string
  trustScore?: number
  /** Panel de suscriptores: hoja de ruta. */
  routeSheetId?: string
  /** Resaltar transportista en el panel. */
  highlightCarrierUserId?: string
  stopId?: string
  /** Tramos del aviso route_sheet_presel (meta <c>stopIds</c>). */
  preselStopIds?: string[]
}

type AppState = {
  /** Sesión iniciada (p. ej. tras verificar OTP). La barra de confianza solo aplica al usuario autenticado. */
  isSessionActive: boolean
  /** Usuario de prueba local; el resto del catálogo viene del API. */
  me: User
  /** Nombres mostrados para otros ids (bootstrap / Mocks del backend). */
  profileDisplayNames: Record<string, string>
  /** Avatares de otros usuarios (`/api/v1/media/…`) indexados por user id (p. ej. comprador en chat). */
  profileAvatarUrls: Record<string, string>
  /** Confianza de usuario por id (API público / sesión); p. ej. integrantes del chat. */
  profileTrustScores: Record<string, number>
  /** Historial de cambios de confianza por usuario (esta sesión / dispositivo). */
  userTrustLedger: Record<string, TrustHistoryEntry[]>
  /** Historial de cambios de confianza por tienda. */
  storeTrustLedger: Record<string, TrustHistoryEntry[]>
  profileSocialLinks: ProfileSocialLinks
  trustThreshold: number
  lastThresholdState: 'above' | 'below'
  notifications: NotificationItem[]
  savedReels: Record<string, boolean>
  /** IDs de ofertas guardadas (bootstrap + POST/DELETE `/api/v1/me/saved-offers`). */
  savedOffers: Record<string, boolean>

  /** Modal global de autenticación (login/registro). */
  authModalOpen: boolean
  /**
   * Scroll vertical guardado al navegar fuera de Home (restaurar con POP).
   * No se escribe en localhost (ver HomePage).
   */
  homeFeedScrollY: number | null
  setHomeFeedScrollY: (y: number | null) => void

  setSessionActive: (active: boolean) => void
  openAuthModal: () => void
  closeAuthModal: () => void
  setTrustScore: (score: number) => void
  /** Resta puntos a un usuario por id (perfil local / demo); si coincide con `me`, actualiza la barra propia. */
  applyTrustPenalty: (
    userId: string,
    penalty: number,
    reason?: string,
    opts?: { forceLocal?: boolean },
  ) => void
  appendUserTrustLedger: (
    userId: string,
    delta: number,
    balanceAfter: number,
    reason: string,
  ) => void
  appendStoreTrustLedger: (
    storeId: string,
    delta: number,
    balanceAfter: number,
    reason: string,
  ) => void
  /** Anteponer entrada ya persistida en API (id servidor). */
  prependUserTrustHistory: (userId: string, entry: TrustHistoryEntry) => void
  prependStoreTrustHistory: (storeId: string, entry: TrustHistoryEntry) => void
  setMeAvatarUrl: (url: string | undefined) => void
  setMeName: (name: string) => void
  setMeEmail: (email: string) => void
  setProfileSocialLink: (network: SocialNetworkId, value: string) => void
  pushNotification: (n: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void
  setChatNotificationsFromServer: (items: NotificationItem[]) => void
  markAllRead: () => void
  /** Vacía la lista local y debe usarse tras marcar leídas en servidor para que no reaparezcan al sincronizar. */
  clearAllNotifications: () => void
  toggleSavedReel: (reelId: string) => void
  setSavedOffersFromIds: (ids: string[]) => void
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
  profileAvatarUrls: {},
  profileTrustScores: {},
  userTrustLedger: {},
  storeTrustLedger: {},
  profileSocialLinks: {},
  trustThreshold: 0,
  lastThresholdState: 'above',
  notifications: [],
  savedReels: {},
  savedOffers: {},
  authModalOpen: false,
  homeFeedScrollY: null,

  setHomeFeedScrollY: (y) => set({ homeFeedScrollY: y }),

  setSessionActive: (active) => {
    try {
      if (active) sessionStorage.setItem(SESSION_STORAGE_KEY, '1')
      else sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* private mode / unavailable */
    }
    set({ isSessionActive: active })
  },

  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  setTrustScore: (score) => {
    const threshold = get().trustThreshold
    set((s) => {
      const id = s.me.id
      const profileTrustScores =
        id && id !== 'guest'
          ? { ...s.profileTrustScores, [id]: score }
          : s.profileTrustScores
      return {
        me: { ...s.me, trustScore: score },
        lastThresholdState: score < threshold ? 'below' : 'above',
        profileTrustScores,
      }
    })
  },

  appendUserTrustLedger: (userId, delta, balanceAfter, reason) => {
    if (!userId || userId === 'guest' || delta === 0) return
    const r = reason.trim() || '—'
    const entry: TrustHistoryEntry = {
      id: uid('tlu'),
      at: Date.now(),
      delta,
      balanceAfter,
      reason: r,
    }
    set((s) => {
      const prevList = s.userTrustLedger[userId] ?? []
      const nextList = [entry, ...prevList].slice(0, 200)
      return {
        userTrustLedger: { ...s.userTrustLedger, [userId]: nextList },
      }
    })
  },

  appendStoreTrustLedger: (storeId, delta, balanceAfter, reason) => {
    const sid = (storeId ?? '').trim()
    if (!sid || delta === 0) return
    const r = reason.trim() || '—'
    const entry: TrustHistoryEntry = {
      id: uid('tls'),
      at: Date.now(),
      delta,
      balanceAfter,
      reason: r,
    }
    set((s) => {
      const prevList = s.storeTrustLedger[sid] ?? []
      const nextList = [entry, ...prevList].slice(0, 200)
      return {
        storeTrustLedger: { ...s.storeTrustLedger, [sid]: nextList },
      }
    })
  },

  prependUserTrustHistory: (userId, entry) => {
    if (!userId || userId === 'guest') return
    set((s) => {
      const prevList = s.userTrustLedger[userId] ?? []
      const nextList = [entry, ...prevList.filter((e) => e.id !== entry.id)].slice(0, 200)
      return { userTrustLedger: { ...s.userTrustLedger, [userId]: nextList } }
    })
  },

  prependStoreTrustHistory: (storeId, entry) => {
    const sid = (storeId ?? '').trim()
    if (!sid) return
    set((s) => {
      const prevList = s.storeTrustLedger[sid] ?? []
      const nextList = [entry, ...prevList.filter((e) => e.id !== entry.id)].slice(0, 200)
      return { storeTrustLedger: { ...s.storeTrustLedger, [sid]: nextList } }
    })
  },

  applyTrustPenalty: (
    userId,
    penalty,
    reason = 'Ajuste de confianza (demo)',
    opts?: { forceLocal?: boolean },
  ) => {
    if (!userId || userId === 'guest' || penalty <= 0) return
    const clamp = (n: number) => Math.max(-10_000, n)
    const threshold = get().trustThreshold
    const s0 = get()
    const applyLocal = () => {
      const score =
        s0.me.id === userId ?
          clamp(s0.me.trustScore - penalty)
        : clamp((s0.profileTrustScores[userId] ?? 0) - penalty)
      set((s) => {
        if (s.me.id === userId) {
          return {
            me: { ...s.me, trustScore: score },
            profileTrustScores: { ...s.profileTrustScores, [userId]: score },
            lastThresholdState: score < threshold ? 'below' : 'above',
          }
        }
        return {
          profileTrustScores: { ...s.profileTrustScores, [userId]: score },
        }
      })
      get().appendUserTrustLedger(userId, -penalty, score, reason)
    }

    if (!opts?.forceLocal && getSessionToken() && s0.me.id === userId) {
      void postMeTrustAdjust(-penalty, reason)
        .then((r) => {
          set((s) => ({
            me: { ...s.me, trustScore: r.trustScore },
            profileTrustScores: { ...s.profileTrustScores, [userId]: r.trustScore },
            lastThresholdState:
              r.trustScore < threshold ? 'below' : 'above',
          }))
          get().prependUserTrustHistory(userId, trustHistoryItemFromApi(r.entry))
        })
        .catch(() => {
          applyLocal()
        })
      return
    }
    applyLocal()
  },

  setMeAvatarUrl: (url) =>
    set((s) => {
      revokeBlobUrl(s.me.avatarUrl)
      return { me: { ...s.me, avatarUrl: url } }
    }),

  setMeName: (name) =>
    set((s) => {
      const t = name.trim().slice(0, 100)
      const id = s.me.id
      const nextNames =
        id && id !== 'guest' ? { ...s.profileDisplayNames, [id]: t } : s.profileDisplayNames
      return { me: { ...s.me, name: t }, profileDisplayNames: nextNames }
    }),

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
      ...(n.threadId != null ? { threadId: n.threadId } : {}),
      ...(n.offerId != null ? { offerId: n.offerId } : {}),
      ...(n.trustScore != null ? { trustScore: n.trustScore } : {}),
      ...(n.routeSheetId != null ? { routeSheetId: n.routeSheetId } : {}),
      ...(n.highlightCarrierUserId != null ?
        { highlightCarrierUserId: n.highlightCarrierUserId }
      : {}),
      ...(n.stopId != null ? { stopId: n.stopId } : {}),
    }
    set((s) => ({ notifications: [item, ...s.notifications] }))
  },

  setChatNotificationsFromServer: (items) =>
    set((s) => {
      const openThread = getOpenChatThreadIdFromLocation()
      const serverItems = openThread
        ? items.filter((x) => {
            if (
              (x.kind === 'route_tramo_subscribe' ||
                x.kind === 'route_tramo_subscribe_accepted') &&
              x.threadId === openThread
            )
              return false
            return (
              (x.kind !== 'chat_message' && x.kind !== 'peer_party_exited') ||
              !x.threadId ||
              x.threadId !== openThread
            )
          })
        : items
      const local = s.notifications.filter(
        (x) =>
          x.kind !== 'chat_message' &&
          x.kind !== 'peer_party_exited' &&
          x.kind !== 'offer_comment' &&
          x.kind !== 'offer_like' &&
          x.kind !== 'qa_comment_like' &&
          x.kind !== 'route_tramo_subscribe' &&
          x.kind !== 'route_tramo_subscribe_accepted' &&
          x.kind !== 'route_tramo_subscribe_rejected' &&
          x.kind !== 'route_tramo_seller_expelled',
      )
      const fromServer = serverItems.filter((x) => !x.read)
      const merged = [...fromServer, ...local]
      merged.sort((a, b) => b.createdAt - a.createdAt)
      return { notifications: merged }
    }),

  markAllRead: () => set((s) => ({ notifications: s.notifications.map((x) => ({ ...x, read: true })) })),

  clearAllNotifications: () => set({ notifications: [] }),

  toggleSavedReel: (reelId) =>
    set((s) => ({ savedReels: { ...s.savedReels, [reelId]: !s.savedReels[reelId] } })),

  setSavedOffersFromIds: (ids) =>
    set({
      savedOffers: Object.fromEntries(ids.map((id) => [id, true])),
    }),

  applySessionUser: (user) =>
    set((s) => {
      revokeBlobUrl(s.me.avatarUrl)
      const nextMe: User = { ...s.me, ...user }
      const profileSocialLinks: ProfileSocialLinks = {}
      if (nextMe.instagram) profileSocialLinks.instagram = nextMe.instagram
      if (nextMe.telegram) profileSocialLinks.telegram = nextMe.telegram
      if (nextMe.xAccount) profileSocialLinks.x = nextMe.xAccount
      const nextNames =
        nextMe.id && nextMe.id !== 'guest'
          ? { ...s.profileDisplayNames, [nextMe.id]: nextMe.name?.trim() ?? '' }
          : s.profileDisplayNames
      const nextAvatars =
        nextMe.id && nextMe.id !== 'guest' && nextMe.avatarUrl?.trim()
          ? {
              ...s.profileAvatarUrls,
              [nextMe.id]: nextMe.avatarUrl.trim(),
            }
          : s.profileAvatarUrls
      const nextTrust =
        nextMe.id && nextMe.id !== 'guest'
          ? { ...s.profileTrustScores, [nextMe.id]: nextMe.trustScore }
          : s.profileTrustScores
      return {
        me: nextMe,
        profileSocialLinks,
        savedOffers: s.savedOffers,
        profileDisplayNames: nextNames,
        profileAvatarUrls: nextAvatars,
        profileTrustScores: nextTrust,
      }
    }),

  resetSessionProfile: () =>
    set((s) => {
      revokeBlobUrl(s.me.avatarUrl)
      return {
        me: { ...guestMe },
        notifications: [],
        savedReels: {},
        savedOffers: {},
        profileSocialLinks: {},
        profileTrustScores: {},
        userTrustLedger: {},
        storeTrustLedger: {},
        authModalOpen: false,
        homeFeedScrollY: null,
      }
    }),
}))

