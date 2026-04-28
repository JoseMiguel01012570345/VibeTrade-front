import {
  mapBackdropLayerAboveChatRail,
  modalShellNarrow,
} from "../../styles/formModalStyles";

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
};

/** Aviso al editar hoja de ruta: otros riesgos de edición visible para contrapartes. */
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
          ¿Continuar con la edición?
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

/** Puntos que restan a la tienda en algunos escenarios demo (transportistas; coherencia con backend). */
export const SELLER_TRUST_PENALTY_ON_EDIT = 3;

/** Por cada integrante del chat (comprador, vendedor, transportistas) al salir con acuerdo aceptado. */
export const CHAT_PARTY_EXIT_TRUST_PER_MEMBER = 1;

/** salida del transportista con tramos confirmados antes de entregar la ruta. */
export const CARRIER_ROUTE_EXIT_TRUST_PENALTY = 3;
