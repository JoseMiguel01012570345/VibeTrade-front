import { createPortal } from 'react-dom'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { Calendar } from 'lucide-react'
import { Datepicker } from 'flowbite-react'
import { cn } from '@shared/lib/cn'
import { organicInputClass } from '@shared/styles/organicCardStyles'
import { organicInlineDatepickerTheme } from '@shared/styles/organicDatepickerTheme'
import { CeField } from './CeField'

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYmd(value: string): Date | null {
  if (!value.trim()) return null
  const d = new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatTriggerLabel(value: string, placeholder: string): string {
  const date = parseYmd(value)
  if (!date) return placeholder
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

type PickerProps = {
  id: string
  value: string
  onChange: (ymd: string) => void
  minDate?: Date
  maxDate?: Date
  variant: 'default' | 'organic'
}

/**
 * Flowbite `Datepicker` siempre pasa `value` y `defaultValue` al `TextInput` interno.
 * Con `inline` evitamos ese input y el warning de React en modo controlado.
 */
function CeDatePickerControl({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  variant,
}: PickerProps) {
  const popoverId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const organic = variant === 'organic'
  const dateVal = parseYmd(value)
  const placeholder = 'Selecciona una fecha…'
  const label = formatTriggerLabel(value, placeholder)

  const updateBox = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setBox({
      top: r.bottom + 8,
      left: r.left,
      width: Math.max(r.width, organic ? 300 : 280),
    })
  }, [organic])

  useLayoutEffect(() => {
    if (!open) return
    updateBox()
  }, [open, updateBox])

  useEffect(() => {
    if (!open) {
      setBox(null)
      return
    }
    const on = () => updateBox()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [open, updateBox])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (!open) return
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const handleDateChange = (d: Date | null) => {
    onChange(d ? toYmd(d) : '')
    if (d) setOpen(false)
  }

  const popover =
    open && box
      ? createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            className={cn(
              organic
                ? 'vt-organic-datepicker-popup fixed overflow-hidden rounded-xl p-1 shadow-[var(--organic-card-shadow)]'
                : 'fixed overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_18px_50px_rgba(2,6,23,0.22)]',
              'z-[300]',
            )}
            style={{
              top: box.top,
              left: box.left,
              width: box.width,
            }}
          >
            <Datepicker
              inline
              key={value || 'empty'}
              defaultValue={dateVal ?? undefined}
              language="es-ES"
              showClearButton
              labelClearButton="Limpiar"
              minDate={minDate}
              maxDate={maxDate}
              onChange={handleDateChange}
              color="gray"
              sizing="md"
              className={organic ? 'vt-organic-datepicker' : undefined}
              theme={organic ? organicInlineDatepickerTheme : undefined}
            />
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={cn('relative w-full', open && organic && 'z-[310]')}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          organic
            ? cn(
                organicInputClass,
                'flex min-h-[42px] w-full items-center justify-between gap-2 text-left font-semibold',
              )
            : cn(
                'block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900',
                'hover:border-primary-500 focus:border-primary-500 focus:ring-primary-500',
                'dark:border-gray-600 dark:bg-gray-700 dark:text-white',
              ),
          !value && 'text-[var(--muted)]',
        )}
      >
        <span className="truncate">{label}</span>
        <Calendar
          size={16}
          className={cn(
            'shrink-0',
            organic ? 'text-[var(--organic-emerald)]' : 'text-[var(--muted)]',
          )}
          aria-hidden
        />
      </button>
      {popover}
    </div>
  )
}

type Props = {
  id?: string
  label: string
  /** yyyy-mm-dd o vacío */
  value: string
  onChange: (ymd: string) => void
  minDate?: Date
  maxDate?: Date
  variant?: 'default' | 'organic'
}

const organicFieldLabelClass =
  'text-xs font-bold text-[var(--muted)]'

/** Datepicker controlado (ISO yyyy-mm-dd) sin warning de React en Flowbite. */
export function CeDateField({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  variant = 'default',
}: Props) {
  const fieldId = id ?? 'ce-date-field'
  const organic = variant === 'organic'

  return (
    <CeField
      label={label}
      htmlFor={fieldId}
      className={cn(
        'min-w-[140px] flex-1',
        organic && 'relative z-0 focus-within:z-[310]',
      )}
      labelClassName={organic ? organicFieldLabelClass : undefined}
    >
      <CeDatePickerControl
        id={fieldId}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        variant={variant}
      />
    </CeField>
  )
}
