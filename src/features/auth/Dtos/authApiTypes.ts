import type { SessionUserJson } from './sessionUserTypes'

export type AuthErrorPayload = {
  error?: string
  message?: string
}

export type PatchProfileBody = {
  name?: string
  username?: string
  email?: string
  instagram?: string
  telegram?: string
  xAccount?: string
  avatarUrl?: string
}

export type PatchProfileResponseJson = {
  user: SessionUserJson
}

export type RegisterResponseJson = {
  registrationId: string
  codeLength: number
  expiresInSeconds: number
  devMockCode?: string | null
}

export type OtpChallengeResponseJson = {
  codeLength: number
  expiresInSeconds: number
  devMockCode?: string | null
}
