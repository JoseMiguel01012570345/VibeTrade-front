import { useEffect, useMemo, useRef, useState } from 'react'
import { validateVigenciaRange } from '../../../domain/serviceVigenciaDates'
import { onBackdropPointerClose } from '../../../lib/modalClose'
import { modalShellNarrow } from '../../../styles/formModalStyles'

type Props = {
  open: boolean
  startDate: string
  endDate: string
  onSave: (start: string, end: string) => void
  onClose: () => void
}

function dateFieldBounds(): { min: string; max: string } {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const min = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  const maxD = new Date(t)
  maxD.setFullYear(maxD.getFullYear() + 50)
  const max = `${maxD.getFullYear()}-${String(maxD.getMonth() + 1).padStart(2, '0')}-${String(maxD.getDate()).padStart(2, '0')}`
  return { min, max }
}

export function ServiceTimeModal({ open, startDate, endDate, onSave, onClose }: Props) {
  const [s, setS] = useState(startDate)
  const [e, setE] = useState(endDate)
  const [err, setErr] = useState('')
  const wasOpenRef = useRef(false)
  const bounds = useMemo(() => dateFieldBounds(), [open])

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (!wasOpenRef.current) {
      setS(startDate)
      setE(endDate)
      setErr('')
    }
    wasOpenRef.current = true
  }, [open, startDate, endDate])

  if (!open) return null

  function save() {
    const msgs = validateVigenciaRange(s, e)
    if (msgs.length) {
      setErr(msgs[0])
      return
    }
    onSave(s, e.trim())
    onClose()
  }

  return (
    <div
      className="vt-modal-backdrop z-[90]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(ev) => onBackdropPointerClose(ev, onClose)}
    >
      <div className={modalShellNarrow}>
        <div className="vt-modal-title">Tiempo del servicio</div>
        <p className="vt-muted mb-3 text-[13px]">
          Indicá el período en que se presta el servicio. La fecha de inicio es obligatoria. Las fechas deben
          ser desde hoy y como máximo 50 años en el futuro.
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[var(--muted)]">Inicio</span>
            <input
              type="date"
              className="vt-input"
              min={bounds.min}
              max={bounds.max}
              value={s}
              onChange={(ev) => setS(ev.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[var(--muted)]">Fin (opcional)</span>
            <input
              type="date"
              className="vt-input"
              min={bounds.min}
              max={bounds.max}
              value={e}
              onChange={(ev) => setE(ev.target.value)}
            />
          </label>
        </div>
        {err ? (
          <p className="mt-2 text-xs font-semibold text-[#b91c1c]" role="alert">
            {err}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="vt-btn vt-btn-primary" onClick={save}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
