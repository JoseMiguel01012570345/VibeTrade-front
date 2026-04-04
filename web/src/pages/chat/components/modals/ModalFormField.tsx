import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../../../lib/cn'
import { fieldError, fieldLabel, fieldRootWithInvalid, textareaMin } from '../../styles/formModalStyles'

type Props = {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  error?: string
  inputId?: string
  placeholder?: string
  rows?: number
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
}

export function ModalFormField({
  label,
  value,
  onChange,
  multiline,
  error,
  inputId,
  placeholder,
  rows,
  inputMode,
}: Props) {
  const errId = inputId ? `${inputId}-err` : undefined
  return (
    <label className={fieldRootWithInvalid(!!error)}>
      <span className={fieldLabel}>{label}</span>
      {multiline ? (
        <textarea
          id={inputId}
          className={cn('vt-input', textareaMin)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 2}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
      ) : (
        <input
          id={inputId}
          className="vt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
      )}
      {error ? (
        <span id={errId} className={fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
