import {
  mapBackdropLayerAboveChatRail,
  modalShellNarrow,
} from '@shared/styles/modals/formModalStyles';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

/** Aviso al editar hoja de ruta: otros riesgos de ediciÃ³n visible para contrapartes. */
export function TrustRiskEditConfirmModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      className={mapBackdropLayerAboveChatRail}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trust-risk-edit-title"
    >
      <div className={modalShellNarrow}>
        <div id="trust-risk-edit-title" className="vt-modal-title">
          Â¿Continuar con la ediciÃ³n?
        </div>
        <p className="vt-muted mb-4 text-[13px] leading-snug text-[var(--text)]">
          Al modificar esta{" "}
          <strong className="text-[var(--text)]">hoja de ruta</strong>, la
          plataforma puede{" "}
          <strong className="text-[var(--text)]">
            reducir tu barra de confianza
          </strong>{" "}
          como vendedor, porque los cambios afectan compromisos ya visibles para
          transportistas u otras contrapartes.
        </p>
        <p className="vt-muted mb-0 text-[12px] leading-snug">
          PodÃ©s cancelar y no se aplicarÃ¡ ningÃºn cambio ni penalizaciÃ³n.
        </p>
        <div className="vt-modal-actions mt-5">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => {
              onConfirm();
            }}
          >
            Continuar y editar
          </button>
        </div>
      </div>
    </div>
  );
}

export {
  CARRIER_ROUTE_EXIT_TRUST_PENALTY,
  CHAT_PARTY_EXIT_TRUST_PER_MEMBER,
  SELLER_TRUST_PENALTY_ON_EDIT,
} from "@features/chat/logic/trust/trustPenaltyConstants";
