import { Trash2 } from "lucide-react";
import { onBackdropPointerClose } from "../pages/chat/lib/modalClose";
import { modalFormBody, modalShellWide, modalSub } from "../pages/chat/styles/formModalStyles";

type Props = Readonly<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function ConfirmDeleteModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  confirmBusy = false,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => onBackdropPointerClose(e, onCancel)}
    >
      <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
        <div className="vt-modal-title">{title}</div>
        <div className={modalSub}>{message}</div>
        <div className={modalFormBody}>
          <div className="rounded-xl border border-[color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_8%,transparent)] p-3 text-[12px] text-[color-mix(in_oklab,var(--bad)_85%,black)]">
            Esta acción <b>no se puede deshacer</b>.
          </div>
        </div>
        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onCancel} disabled={confirmBusy}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary inline-flex items-center gap-2 bg-[var(--bad)] hover:bg-[color-mix(in_oklab,var(--bad)_85%,black)]"
            onClick={onConfirm}
            disabled={confirmBusy}
          >
            <Trash2 size={16} aria-hidden /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

