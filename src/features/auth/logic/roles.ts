import type { User } from '../Dtos/userTypes'

/** Ids de rol de plataforma (deben coincidir con `RoleNames` del backend). */
export const ROLE_SUPERADMIN = 'superadmin'
export const ROLE_ADMIN = 'admin'
export const ROLE_ALMACEN = 'almacen'
export const ROLE_AFILIADO = 'afiliado'

export function userRoles(me: Pick<User, 'roles'> | null | undefined): string[] {
  const roles = me?.roles
  return Array.isArray(roles) ? roles : []
}

export function hasRole(
  me: Pick<User, 'roles'> | null | undefined,
  ...roles: string[]
): boolean {
  const mine = userRoles(me)
  return roles.some((r) => mine.includes(r))
}

/** Superadmin (dueño de tienda) o administrador: acceso a paneles admin. */
export function isAdmin(me: Pick<User, 'roles'> | null | undefined): boolean {
  return hasRole(me, ROLE_SUPERADMIN, ROLE_ADMIN)
}

export function isSuperAdmin(me: Pick<User, 'roles'> | null | undefined): boolean {
  return hasRole(me, ROLE_SUPERADMIN)
}
