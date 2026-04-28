import { apiFetch } from '../../../../utils/http/apiClient'
import { isProtectedMediaUrl } from '../../../../utils/media/mediaClient'
import { getSharedAudioContext } from '../../lib/sharedAudioContext'

/** Altura uniforme antes de decodificar (evita saltos de layout; no es un “falso” dibujo único). */
export const WAVE_PEAK_UNIFORM = 0.12

export function uniformWaveformPeaks(n: number): number[] {
  return Array.from({ length: n }, () => WAVE_PEAK_UNIFORM)
}

/**
 * Picos reales del audio (envolvente por segmento), normalizados ~[0,1].
 * Misma URL → misma forma; cada clip es distinto.
 */
async function fetchAudioArrayBuffer(url: string): Promise<ArrayBuffer> {
  if (isProtectedMediaUrl(url)) {
    const res = await apiFetch(url, { method: 'GET' })
    if (!res.ok) throw new Error('fetch failed')
    return res.arrayBuffer()
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error('fetch failed')
  return res.arrayBuffer()
}

export async function computeWaveformPeaksFromUrl(
  url: string,
  n: number,
): Promise<number[]> {
  try {
    const buf = await fetchAudioArrayBuffer(url)
    const copy = buf.slice(0)
    const ctx = getSharedAudioContext()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }
    const audioBuffer = await ctx.decodeAudioData(copy)
    const ch0 = audioBuffer.getChannelData(0)
    const len = ch0.length
    if (len === 0 || n <= 0) return uniformWaveformPeaks(n)

    const peaks = new Array<number>(n)
    const block = len / n
    for (let i = 0; i < n; i++) {
      const start = Math.floor(i * block)
      const end = Math.min(len, Math.floor((i + 1) * block))
      let max = 0
      for (let j = start; j < end; j++) {
        const v = Math.abs(ch0[j] ?? 0)
        if (v > max) max = v
      }
      peaks[i] = max
    }
    const m = Math.max(...peaks, 1e-8)
    for (let i = 0; i < n; i++) peaks[i] = peaks[i] / m
    return peaks
  } catch {
    return uniformWaveformPeaks(n)
  }
}
