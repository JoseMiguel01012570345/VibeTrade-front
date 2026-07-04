export type SessionUserJson = {
  id: string
  name: string
  username?: string
  email: string
  phone: string
  /** Ignorado: los roles operativos solo existen en el contexto del chat. */
  role?: string
  /** Roles efectivos de plataforma (superadmin/admin/almacen/afiliado). */
  roles?: string[]
  trustScore?: number
  avatarUrl?: string
  instagram?: string | null
  telegram?: string | null
  xAccount?: string | null
  /** Si viene, la sesión es de personal (staff) atado a esa tienda. */
  staffStoreId?: string | null
}

export type AuthSessionJson = {
  sessionToken: string
  user: SessionUserJson
}
