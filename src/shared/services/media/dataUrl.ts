/**
 * Conversión de archivos locales a data URLs (base64) para persistir en el API,
 * y utilidades para interpretar / decodificar respuestas del backend.
 */

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      if (typeof r.result === 'string') resolve(r.result)
      else reject(new Error('FileReader: resultado inesperado'))
    }
    r.onerror = () => reject(r.error ?? new Error('FileReader'))
    r.readAsDataURL(file)
  })
}

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      if (typeof r.result === 'string') resolve(r.result)
      else reject(new Error('FileReader: resultado inesperado'))
    }
    r.onerror = () => reject(r.error ?? new Error('FileReader'))
    r.readAsDataURL(blob)
  })
}

/** Valido para `src` de <img> o `href` de adjuntos (data:, https:, blob:). */
export function mediaUrlForDisplay(url: string | undefined | null): string | undefined {
  if (url == null || url === '') return undefined
  return url
}

const dataUrlRe = /^data:([^;,]+);base64,(.+)$/is

/** Extrae mime y payload base64 de un data URL. */
export function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const m = dataUrlRe.exec(dataUrl.trim())
  if (!m) return null
  return { mime: m[1], base64: m[2].replace(/\s/g, '') }
}

/** Decodifica un data URL a `Blob` (p. ej. descarga o `URL.createObjectURL` temporal). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const p = parseDataUrl(dataUrl)
  if (!p) throw new Error('data URL inválido')
  const bin = atob(p.base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: p.mime })
}

/** Crea una object URL temporal desde un data URL; recordá llamar `URL.revokeObjectURL` después. */
export function objectUrlFromDataUrl(dataUrl: string): string {
  return URL.createObjectURL(dataUrlToBlob(dataUrl))
}

/** Solo revoca URLs `blob:` creadas con `URL.createObjectURL`. Los data URL no se revocan. */
export function revokeObjectUrlIfNeeded(url: string | undefined | null): void {
  if (url?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* noop */
    }
  }
}
