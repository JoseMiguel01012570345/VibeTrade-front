import { Label } from 'flowbite-react'
import { cn } from '@shared/lib/cn'
import type { CeFieldProps } from '@shared/types/ceUi'

export type { CeFieldProps } from '@shared/types/ceUi'

/** Clase estándar para `<Label>` en formularios del admin. */
export const ceAdminFieldLabelClass = 'text-sm font-medium text-gray-900 dark:text-white'

/**
 * Agrupa etiqueta + error opcional + control + ayuda.
 * Usar para mantener el mismo espaciado que `CeTextField`/`CeNativeSelect`.
 */
export function CeField({ label, htmlFor, error, helperText, className, labelClassName, children }: CeFieldProps) {
  const errId = `${htmlFor}-error`
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className={cn(ceAdminFieldLabelClass, labelClassName)}>
        {label}
      </Label>
      {error ? (
        <p id={errId} role="alert" className="-mt-0.5 text-sm font-medium text-black dark:text-gray-100">
          {error}
        </p>
      ) : null}
      {children}
      {helperText != null && helperText !== '' ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      ) : null}
    </div>
  )
}
