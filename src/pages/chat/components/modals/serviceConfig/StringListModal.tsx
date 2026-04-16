import { useEffect, useRef, useState } from 'react'
import { onBackdropPointerClose } from '../../../lib/modalClose'
import { modalShellNarrow } from '../../../styles/formModalStyles'

type Props = {
  open: boolean
  title: string
  items: string[]
  onSave: (items: string[]) => void
  onClose: () => void
  placeholder?: string
}

export function StringListModal({
  open,
  title,
  items: initial,
  onSave,
  onClose,
  placeholder = 'Una línea por ítem',
}: Props) {
  const [text, setText] = useState('')
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (!wasOpenRef.current) setText(initial.join('\n'))
    wasOpenRef.current = true
  }, [open, initial])

  if (!open) return null

  function save() {
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    onSave(lines)
    onClose()
  }

  return (
    <div
      className="vt-modal-backdrop z-[90]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellNarrow}>
        <div className="vt-modal-title">{title}</div>
        <textarea
          className="vt-input mt-2 min-h-[160px] resize-y"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          rows={8}
        />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="vt-btn vt-btn-primary" onClick={save}>
            Guardar lista
          </button>
        </div>
      </div>
    </div>
  )
}
