const SESSION_TOKEN_KEY = 'vt_session_token'

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
