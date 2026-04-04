/**
 * Colores del tema (`index.css` :root) resueltos a valores que entienden
 * canvas 2D y wavesurfer.js (sin `var()` en el runtime del canvas).
 */

function rootStyle(): CSSStyleDeclaration {
  return getComputedStyle(document.documentElement)
}

export function cssVar(name: string, fallback: string): string {
  const v = rootStyle().getPropertyValue(name).trim()
  return v || fallback
}

/** Resuelve un `<color>` CSS (incl. `color-mix` y `var()`) a `rgb()` / `rgba()`. */
export function resolveCssColor(cssColor: string): string {
  const d = document.createElement('div')
  d.style.cssText = `position:fixed;left:-9999px;top:0;background-color:${cssColor}`
  document.body.appendChild(d)
  const out = getComputedStyle(d).backgroundColor
  document.body.removeChild(d)
  if (
    !out ||
    out === 'rgba(0, 0, 0, 0)' ||
    out === 'transparent'
  ) {
    return cssVar('--muted', '#64748b')
  }
  return out
}

export function readWaveSurferRecorderColors(): {
  waveColor: string
  progressColor: string
} {
  const waveColor = resolveCssColor(
    'color-mix(in oklab, var(--muted) 50%, var(--surface))',
  )
  const progressColor = cssVar('--primary', '#2563eb')
  return { waveColor, progressColor }
}

export type VoiceMicroPalette = {
  played: string
  unplayed: string
  thumb: string
  thumbStroke: string
}

export function readAudioMicroPalette(isMine: boolean): VoiceMicroPalette {
  const primary = cssVar('--primary', '#2563eb')
  const primary2 = cssVar('--primary-2', '#1d4ed8')
  if (isMine) {
    return {
      unplayed: resolveCssColor(
        'color-mix(in oklab, var(--primary) 35%, var(--surface))',
      ),
      played: resolveCssColor(
        'color-mix(in oklab, var(--primary) 65%, var(--surface))',
      ),
      thumb: primary2,
      thumbStroke: resolveCssColor(
        'color-mix(in oklab, var(--surface) 88%, var(--primary))',
      ),
    }
  }
  return {
    unplayed: resolveCssColor(
      'color-mix(in oklab, var(--muted) 45%, var(--surface))',
    ),
    played: primary,
    thumb: primary2,
    thumbStroke: resolveCssColor(
      'color-mix(in oklab, var(--surface) 88%, var(--muted))',
    ),
  }
}
