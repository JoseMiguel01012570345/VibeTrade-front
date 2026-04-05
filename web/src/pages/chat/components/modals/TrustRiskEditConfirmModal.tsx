import { modalShellNarrow } from '../../styles/formModalStyles'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  /** Etiqueta breve: «acuerdo» o «hoja de ruta». */
  subjectLabel: string
}

export function TrustRiskEditConfirmModal({ open, onClose, onConfirm, subjectLabel }: Props) {
  if (!open) return null

  return (
    <div className="vt-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="trust-risk-edit-title">
      <div className={modalShellNarrow}>
        <div id="trust-risk-edit-title" className="vt-modal-title">
          ¿Continuar con la edición?
        </div>
        <p className="vt-muted mb-4 text-[13px] leading-snug text-[var(--text)]">
          Al modificar este <strong className="text-[var(--text)]">{subjectLabel}</strong>, la plataforma puede{' '}
          <strong className="text-[var(--text)]">reducir tu barra de confianza</strong> como vendedor, porque los cambios
          afectan compromisos ya visibles para la contraparte.
        </p>
        <p className="vt-muted mb-0 text-[12px] leading-snug">
          Podés cancelar y no se aplicará ningún cambio ni penalización.
        </p>
        <div className="vt-modal-actions mt-5">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => {
              onConfirm()
            }}
          >
            Continuar y editar
          </button>
        </div>
      </div>
    </div>
  )
}

/** Puntos que resta el demo al vendedor al guardar una edición confirmada tras el aviso. */
export const SELLER_TRUST_PENALTY_ON_EDIT = 3
