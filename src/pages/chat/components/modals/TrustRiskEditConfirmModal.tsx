import { mapBackdropLayerAboveChatRail, modalShellNarrow } from '../../styles/formModalStyles'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  /** Etiqueta breve: «acuerdo» o «hoja de ruta». */
  subjectLabel: string
  /** Acuerdo: riesgo inmediato al perfil como vendedor. Hoja: penalización a la tienda solo si un transportista rechaza. */
  variant?: 'agreement' | 'routeSheet'
}

export function TrustRiskEditConfirmModal({
  open,
  onClose,
  onConfirm,
  subjectLabel,
  variant = 'agreement',
}: Props) {
  if (!open) return null

  return (
    <div
      className={mapBackdropLayerAboveChatRail}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trust-risk-edit-title"
    >
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

/** Puntos que resta el demo a la tienda (rechazo de edición por transportista, eliminar hoja con confirmados, etc.). */
export const SELLER_TRUST_PENALTY_ON_EDIT = 3

/** Por cada integrante del chat (comprador, vendedor, transportistas) al salir con acuerdo aceptado. */
export const CHAT_PARTY_EXIT_TRUST_PER_MEMBER = 1

/** Demo: salida del transportista con tramos confirmados antes de entregar la ruta. */
export const CARRIER_ROUTE_EXIT_TRUST_PENALTY = 3
