import { useState } from "react";
import { modalShellNarrow } from "../../styles/formModalStyles";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Si retorna false, el modal permanece abierto (motivo vacío o error). */
  onConfirm: (reason: string) => void | Promise<boolean | void>;
  busy?: boolean;
  emptyReasonError?: string | null;
};

export function ChatLeaveReasonModal({
  open,
  onClose,
  onConfirm,
  busy,
  emptyReasonError,
}: Props) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-leave-reason-title"
    >
      <div className={modalShellNarrow}>
        <div id="chat-leave-reason-title" className="vt-modal-title">
          Motivo de salida
        </div>
        <p className="vt-muted mb-3 text-[13px] leading-snug text-[var(--text)]">
          Indica el motivo de tu salida. Los demás participantes podrán ver que abandonaste la
          conversación.
        </p>
        <label
          className="mb-1 block text-[11px] font-extrabold text-[var(--text)]"
          htmlFor="chat-leave-reason-ta"
        >
          Motivo (obligatorio)
        </label>
        <textarea
          id="chat-leave-reason-ta"
          className="vt-input min-h-[88px] w-full resize-y"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          placeholder="Ej.: cambio de planes, acuerdo cumplido…"
        />
        {emptyReasonError ?
          <p className="mt-2 text-[12px] font-semibold text-[var(--bad)]">{emptyReasonError}</p>
        : null}
        <div className="vt-modal-actions mt-4">
          <button type="button" className="vt-btn" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={busy}
            onClick={() => {
              void (async () => {
                const r = await Promise.resolve(onConfirm(reason.trim()));
                if (r === false) return;
                setReason("");
                onClose();
              })();
            }}
          >
            Confirmar salida
          </button>
        </div>
      </div>
    </div>
  );
}
