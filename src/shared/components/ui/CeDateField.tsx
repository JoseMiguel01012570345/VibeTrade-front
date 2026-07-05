import { Datepicker } from 'flowbite-react'
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
}

/** Datepicker Flowbite con valor string ISO fecha (para filtros y APIs). */
export function CeDateField({ id, label, value, onChange, minDate, maxDate }: Props) {
  const dateVal = value ? new Date(`${value}T12:00:00`) : null
  // Etiqueta externa vía `CeField` para alinear con `CeTextField`/`CeNativeSelect` en la misma fila.
  const fieldId = id ?? 'ce-date-field'

  return (
    <CeField label={label} htmlFor={fieldId} className="min-w-[140px] flex-1">
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
      />
    </CeField>
  )
}
