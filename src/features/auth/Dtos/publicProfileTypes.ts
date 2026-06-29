/** Perfil mínimo expuesto para visitantes (vitrina / enlaces). */
export type PublicUserProfile = {
  id: string
  name: string
  avatarUrl?: string
  trustScore: number
}
