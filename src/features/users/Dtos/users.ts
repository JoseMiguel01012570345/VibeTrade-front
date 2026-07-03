export type AdminUserDto = {
  id: string
  displayName: string
  email: string | null
  username: string | null
  phoneDisplay: string | null
  roles: string[]
  trustScore: number
  ownsStore: boolean
  createdAt: string
}

export type CreateUserRequest = {
  email: string
  password: string
  displayName?: string | null
  phone?: string | null
}

export type UpdateUserRequest = {
  displayName?: string | null
  email?: string | null
}

export type SetUserRolesRequest = {
  roles: string[]
}

export type SetUserPasswordRequest = {
  newPassword: string
}
