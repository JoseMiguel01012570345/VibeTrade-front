import { modalShellNarrow } from "../../styles/formModalStyles";

type Props = {
  open: boolean;
  roleLabel: string;
  reason: string;
  onAcknowledge: () => void;
};

export function PeerPartyExitedInfoModal({
  open,
  roleLabel,
  reason,
  onAcknowledge,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="peer-party-exit-title"
    >
      <div className={modalShellNarrow}>
        <div id="peer-party-exit-title" className="vt-modal-title">
          Salida del chat
        </div>
        <p className="vt-muted mb-3 text-[13px] leading-snug text-[var(--text)]">
          <span className="font-semibold text-[var(--text)]">{roleLabel}</span>{" "}
          salió de este chat con un acuerdo ya aceptado.
        </p>
        <p className="mb-1 text-[12px] font-medium uppercase tracking-wide text-[var(--muted)]">
          Motivo indicado
        </p>
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[13px] leading-snug text-[var(--text)]">
          {reason}
        </p>
        <p className="vt-muted mt-4 mb-0 text-[12px] leading-snug">
          El hilo sigue disponible para vos; la otra parte ya no lo verá en su
          lista.
        </p>
        <div className="vt-modal-actions mt-5">
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={onAcknowledge}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
