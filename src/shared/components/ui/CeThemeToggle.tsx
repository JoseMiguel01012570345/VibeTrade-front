import type { CeThemeToggleProps } from '@shared/types/ceUi'
import { IconMoon, IconSun } from './ThemeToggleIcons'

export type { CeThemeToggleProps } from '@shared/types/ceUi'

/** Toggle presentacional: la app enlaza `theme` y `onToggle` con su ThemeContext. */
export function CeThemeToggle({ theme, onToggle, className = '', ...rest }: CeThemeToggleProps) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className={`rounded-lg border border-gray-300 bg-white p-2 text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 ${className}`.trim()}
      {...rest}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  )
}
