import { apiFetch } from '../http/apiClient'
import { revokeObjectUrlIfNeeded } from './dataUrl'

export type MediaUploadResponse = {
  id: string
  mimeType: string
  fileName: string
  sizeBytes: number
}

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024

const objectUrlCache = new Map<string, string>()

/** Blob URL ya resuelta para esta URL de API (evita spinner al volver a montar el componente). */
export function getCachedMediaObjectUrl(srcUrl: string): string | undefined {
  return objectUrlCache.get(srcUrl)
}

/** Upload binary media and return its id (protected download via /api/v1/media/{id}). */
export async function uploadMedia(file: File): Promise<MediaUploadResponse> {
  if (file.size > MEDIA_MAX_BYTES) {
    const mb = (MEDIA_MAX_BYTES / (1024 * 1024)).toFixed(0)
    throw new Error(`Archivo demasiado grande (${(file.size / (1024 * 1024)).toFixed(1)} MB). Máximo ${mb} MB.`)
  }

  const fd = new FormData()
  fd.append('file', file, file.name)

  // NOTE: apiFetch will not force Content-Type when body is FormData.
  const res = await apiFetch('/api/v1/media', { method: 'POST', body: fd })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `upload failed: ${res.status}`)
  }
  return (await res.json()) as MediaUploadResponse
}

/** Convert a media id into a stable API URL to persist in JSON. */
export function mediaApiUrl(id: string): string {
  return `/api/v1/media/${encodeURIComponent(id)}`
}

/** True if url points to protected media endpoint. */
export function isProtectedMediaUrl(url: string): boolean {
  return url.startsWith('/api/v1/media/')
}

/**
 * Fetch a protected media URL with auth headers and return a temporary blob URL for display.
 * Caches by source URL; call `releaseMediaObjectUrl` when you know you no longer need it.
 */
export async function fetchMediaObjectUrl(srcUrl: string): Promise<string> {
  const cached = objectUrlCache.get(srcUrl)
  if (cached) return cached

  const res = await apiFetch(srcUrl, { method: 'GET' })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || `media fetch failed: ${res.status}`)
  }
  const blob = await res.blob()
  const obj = URL.createObjectURL(blob)
  objectUrlCache.set(srcUrl, obj)
  return obj
}

export function releaseMediaObjectUrl(srcUrl: string): void {
  const obj = objectUrlCache.get(srcUrl)
  if (!obj) return
  objectUrlCache.delete(srcUrl)
  revokeObjectUrlIfNeeded(obj)
}

