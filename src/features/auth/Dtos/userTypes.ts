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
  /** Cuentas persistidas en servidor (también reflejadas en `profileSocialLinks`). */
  instagram?: string
  telegram?: string
  xAccount?: string
}
