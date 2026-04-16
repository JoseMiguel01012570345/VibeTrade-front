const DEFAULT_UNEXPECTED_ERROR = 'Ha ocurrido un error inesperado'

type ProblemDetailsLike = {
  type?: unknown
  title?: unknown
  status?: unknown
  detail?: unknown
  traceId?: unknown
  message?: unknown
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown
  } catch {
    return null
  }
}

function looksLikeProblemDetails(v: unknown): v is ProblemDetailsLike {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  // Typical ASP.NET ProblemDetails / RFC payload
  return (
    'title' in o ||
    'status' in o ||
    'type' in o ||
    'traceId' in o ||
    (typeof o.type === 'string' && o.type.includes('rfc'))
  )
}

export function defaultUnexpectedErrorMessage(): string {
  return DEFAULT_UNEXPECTED_ERROR
}

/**
 * Convert raw HTTP response text into a user-facing toast message.
 * - ProblemDetails JSON => default unexpected error
 * - message/detail fields => those (trimmed)
 * - otherwise => trimmed text or fallback
 */
export function apiErrorTextToUserMessage(
  text: string | null | undefined,
  fallback: string = DEFAULT_UNEXPECTED_ERROR,
): string {
  const t = (text ?? '').trim()
  if (!t) return fallback

  const parsed = tryParseJson(t)
  if (looksLikeProblemDetails(parsed)) {
    const p = parsed
    const msg =
      (typeof p.message === 'string' && p.message.trim()) ||
      (typeof p.detail === 'string' && p.detail.trim()) ||
      ''
    return msg || fallback
  }

  // If it's JSON but not ProblemDetails, try common message field.
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>
    const msg =
      (typeof o.message === 'string' && o.message.trim()) ||
      (typeof o.error === 'string' && o.error.trim()) ||
      ''
    if (msg) return msg
  }

  return t || fallback
}

export function errorToUserMessage(e: unknown, fallback?: string): string {
  if (e instanceof Error) return apiErrorTextToUserMessage(e.message, fallback)
  if (typeof e === 'string') return apiErrorTextToUserMessage(e, fallback)
  return fallback ?? DEFAULT_UNEXPECTED_ERROR
}

