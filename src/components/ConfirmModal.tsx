import { useId } from "react";
import { onBackdropPointerClose } from "../pages/chat/lib/modalClose";
import { modalShellWide, modalSub } from "../pages/chat/styles/formModalStyles";

type Props = Readonly<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

/** Diálogo de confirmación neutro (sin copy de borrado irreversible). */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmBusy = false,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  if (!open) return null;
  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) =>
        onBackdropPointerClose(e, confirmBusy ? () => {} : onCancel)
      }
    >
      <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
        <div className="vt-modal-title" id={titleId}>
          {title}
        </div>
        <div className={modalSub}>{message}</div>
        <div className="vt-modal-actions">
          <button
            type="button"
            className="vt-btn"
            onClick={onCancel}
            disabled={confirmBusy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={onConfirm}
            disabled={confirmBusy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
