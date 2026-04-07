import type { User } from '../../app/store/useAppStore'

export type SessionUserJson = {
  id: string
  name: string
  email: string
  phone: string
  /** Ignorado: los roles operativos solo existen en el contexto del chat. */
  role?: string
  trustScore?: number
  avatarUrl?: string
}

export function userFromSessionJson(j: SessionUserJson): User {
  return {
    id: j.id,
    name: typeof j.name === 'string' ? j.name : '',
    email: typeof j.email === 'string' ? j.email : '',
    phone: typeof j.phone === 'string' ? j.phone : '',
    avatarUrl: j.avatarUrl,
    trustScore: typeof j.trustScore === 'number' ? j.trustScore : 50,
  }
}
