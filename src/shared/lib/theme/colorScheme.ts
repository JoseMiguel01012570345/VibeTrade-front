export const COLOR_SCHEME_STORAGE_KEY = 'vt_color_scheme'

export type ColorScheme = 'light' | 'dark'

export function readStoredColorScheme(): ColorScheme {
  try {
    const v = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {
    /* private mode / unavailable */
  }
  return 'light'
}

export function applyColorSchemeToDocument(scheme: ColorScheme) {
  document.documentElement.classList.toggle('dark', scheme === 'dark')
}
