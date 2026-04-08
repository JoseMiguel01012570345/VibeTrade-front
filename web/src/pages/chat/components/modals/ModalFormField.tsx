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
  readOnly?: boolean
  /** id de &lt;datalist&gt; con sugerencias (p. ej. categorías del API). */
  list?: string
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
  readOnly = false,
  list,
}: Props) {
  const errId = inputId ? `${inputId}-err` : undefined
  const readOnlyCls = readOnly ? 'cursor-default bg-black/[0.04] dark:bg-white/[0.06]' : ''
  return (
    <label className={fieldRootWithInvalid(!!error)}>
      <span className={fieldLabel}>{label}</span>
      {multiline ? (
        <textarea
          id={inputId}
          className={cn('vt-input', textareaMin, readOnlyCls)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 2}
          placeholder={placeholder}
          readOnly={readOnly}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
      ) : (
        <input
          id={inputId}
          className={cn('vt-input', readOnlyCls)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          readOnly={readOnly}
          list={list}
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
