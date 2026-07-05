import { Button, type ButtonProps } from 'flowbite-react'
import { CeSpinner } from './CeSpinner'
import { cn } from '@shared/lib/cn'

/** Flowbite usa `default`/`red`; el sitio expone `primary`/`failure` como alias. */
function resolveFlowbiteColor(color: ButtonProps['color']): ButtonProps['color'] {
  if (color === 'primary') return 'default'
  if (color === 'failure') return 'red'
  return color
}

/** Borde visible en modo oscuro para botones rellenos (primario, peligro, etc.). */
function darkVisibleBorder(color: ButtonProps['color']): string {
  switch (color) {
    case 'primary':
    case 'default':
      return 'border border-primary-800/35 shadow-sm dark:border-primary-400/45 dark:shadow-md'
    case 'failure':
    case 'red':
      return 'border border-red-800/40 shadow-sm dark:border-red-400/50 dark:shadow-md'
    case 'gray':
      return 'border border-gray-400/50 shadow-sm dark:border-gray-500'
    default:
      return 'border border-transparent shadow-sm dark:border-gray-600'
  }
}

export type CeButtonProps = ButtonProps & {
  /** Muestra un spinner dentro del botón y lo deshabilita mientras está activo. */
  loading?: boolean
}

/** Botón con estilo primario (teal) por defecto — Flowbite + Tailwind. */
export function CeButton({
  color = 'primary',
  className,
  outline,
  loading = false,
  disabled,
  children,
  ...props
}: CeButtonProps) {
  const edge =
    outline === true
      ? 'shadow-sm ring-1 ring-gray-900/[0.07] dark:ring-gray-400/35'
      : darkVisibleBorder(color)
  const flowbiteColor = resolveFlowbiteColor(color)
  return (
    <Button
      color={flowbiteColor}
      outline={outline}
      disabled={disabled || loading}
      className={cn(edge, className)}
      {...props}
    >
      {loading ? (
        <CeSpinner
          size="sm"
          aria-label="Procesando"
          className="me-2 -ml-1"
        />
      ) : null}
      {children}
    </Button>
  )
}
