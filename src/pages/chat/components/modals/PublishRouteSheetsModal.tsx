import { useEffect, useMemo, useState } from 'react'
import type { RouteSheet } from '../../domain/routeSheetTypes'
import {
  modalFormBody,
  modalShellNarrow,
  modalSub,
  publishRutaList,
  publishRutaRow,
  publishRutaTitle,
} from '../../styles/formModalStyles'

type Props = {
  open: boolean
  onClose: () => void
  /** Hojas elegibles: primer alta o republicación (según filtro del rail). */
  routeSheets: RouteSheet[]
  onConfirm: (routeSheetIds: string[]) => void
}

export function PublishRouteSheetsModal({ open, onClose, routeSheets, onConfirm }: Props) {
  const candidatas = useMemo(() => routeSheets, [routeSheets])
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return
    const init: Record<string, boolean> = {}
    candidatas.forEach((r) => {
      init[r.id] = true
    })
    setSelected(init)
  }, [open, candidatas])

  if (!open) return null

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }))
  }

  function submit() {
    const ids = Object.keys(selected).filter((id) => selected[id])
    if (ids.length === 0) return
    onConfirm(ids)
    onClose()
  }

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
      <div className={modalShellNarrow}>
        <div className="vt-modal-title">Publicar hoja de ruta</div>
        <div className={modalSub}>
          Incluye publicación inicial y republicación mientras la oferta tenga tramos libres o sin confirmar.
          Vinculá desde Contratos si falta alguna.
        </div>
        <div className={modalFormBody}>
          {candidatas.length === 0 ? (
            <p className="vt-muted">No hay hojas disponibles para publicar o republicar.</p>
          ) : (
            <ul className={publishRutaList}>
              {candidatas.map((r) => (
                <li key={r.id}>
                  <label className={publishRutaRow}>
                    <input
                      type="checkbox"
                      checked={!!selected[r.id]}
                      onChange={() => toggle(r.id)}
                    />
                    <span className={publishRutaTitle}>{r.titulo}</span>
                    <span className="vt-muted">
                      {r.paradas.length} tramo{r.paradas.length === 1 ? '' : 's'}
                      {r.publicadaPlataforma ? ' · Republicar' : ''}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={candidatas.length === 0 || Object.keys(selected).filter((id) => selected[id]).length === 0}
            onClick={submit}
          >
            Publicar selección
          </button>
        </div>
      </div>
    </div>
  )
}
