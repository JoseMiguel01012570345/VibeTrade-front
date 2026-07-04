export type SocialNetworkId = 'instagram' | 'telegram' | 'x'

/** Enlaces de perfil guardados por el usuario. */
export type ProfileSocialLinks = Partial<Record<SocialNetworkId, string>>

/** Perfil global sin rol operativo: comprador/vendedor/transportista solo en el contexto de cada chat. */
export type User = {
  id: string
  name: string
  username?: string
  email: string
  phone: string
  avatarUrl?: string
  trustScore: number
  /** Roles efectivos de plataforma (superadmin/admin/almacen/afiliado). Vacío para invitados. */
  roles?: string[]
  /**
   * Si está definido, la sesión es de PERSONAL (staff) de una tienda: inicia sesión
   * con usuario/contraseña emitidos por el dueño y queda restringido al panel
   * `/store/:staffStoreId/panel`. No navega el resto de la app.
   */
  staffStoreId?: string
  /** Cuentas persistidas en servidor (también reflejadas en `profileSocialLinks`). */
  instagram?: string
  telegram?: string
  xAccount?: string
}
