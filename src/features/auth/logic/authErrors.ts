import type { AuthErrorPayload } from '../Dtos/authApiTypes'

export async function parseAuthError(
  res: Response,
): Promise<AuthErrorPayload | null> {
  try {
    return (await res.json()) as AuthErrorPayload
  } catch {
    return null
  }
}
