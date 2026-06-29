export const SESSION_TOKEN_KEY = 'vt_session_token'
export const SESSION_ACTIVE_KEY = 'vt_session_active'

/** Sesión válida solo si coexisten bandera y token (evita estado a medias tras F5). */
export function isSessionActiveInStorage(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false
    return (
      sessionStorage.getItem(SESSION_ACTIVE_KEY) === '1' &&
      !!sessionStorage.getItem(SESSION_TOKEN_KEY)
    )
  } catch {
    return false
  }
}

export function getSessionToken(): string | null {
  try {
    return typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(SESSION_TOKEN_KEY)
      : null
  } catch {
    return null
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token)
    else sessionStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {
    /* private mode */
  }
}
