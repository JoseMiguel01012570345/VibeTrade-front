import { Moon, Sun } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAppStore } from '../store/useAppStore'

export function ThemeToggle() {
  const colorScheme = useAppStore((s) => s.colorScheme)
  const setColorScheme = useAppStore((s) => s.setColorScheme)
  const isDark = colorScheme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative inline-flex h-[34px] w-[58px] shrink-0 items-center rounded-full border border-[var(--border)] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
        isDark ?
          'bg-[color-mix(in_oklab,var(--primary)_38%,var(--surface))]'
        : 'bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute top-1 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-[left,right] duration-200 ease-out',
          isDark ? 'left-auto right-1' : 'left-1 right-auto',
        )}
      >
        {isDark ? (
          <Moon size={14} className="text-[var(--muted)]" aria-hidden />
        ) : (
          <Sun size={14} className="text-amber-500" aria-hidden />
        )}
      </span>
      <span className="sr-only">{isDark ? 'Modo oscuro activo' : 'Modo claro activo'}</span>
    </button>
  )
}
