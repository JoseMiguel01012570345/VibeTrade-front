import type { SessionUserJson } from '../Dtos/sessionUserTypes'
import { patchProfile } from '../api/patchProfile'

export async function patchProfileAvatar(
  avatarUrl: string,
): Promise<SessionUserJson> {
  return patchProfile({ avatarUrl })
}
