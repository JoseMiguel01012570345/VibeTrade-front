import { Datepicker } from 'flowbite-react'
import { cn } from '@shared/lib/cn'
import { organicDatepickerTheme } from '@shared/styles/organicDatepickerTheme'
import { CeField } from './CeField'

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

/** Datepicker Flowbite con valor string ISO fecha (para filtros y APIs). */
export function CeDateField({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  variant = 'default',
}: Props) {
  const dateVal = value ? new Date(`${value}T12:00:00`) : null
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
      <Datepicker
        id={fieldId}
        label="Selecciona una fecha…"
        language="es-ES"
        showClearButton
        labelClearButton="Limpiar"
        value={dateVal}
        minDate={minDate}
        maxDate={maxDate}
        onChange={(d) => onChange(d ? toYmd(d) : '')}
        color="gray"
        sizing="md"
        className={organic ? 'vt-organic-datepicker' : undefined}
        theme={organic ? organicDatepickerTheme : undefined}
      />
    </CeField>
  )
}
