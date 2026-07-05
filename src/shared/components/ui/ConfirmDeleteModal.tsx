import { Trash2 } from "lucide-react";
import { CeButton } from "./CeButton";
import { CeModal } from "./CeModal";

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
  return (
    <CeModal
      show={open}
      onClose={() => !confirmBusy && onCancel()}
      title={title}
      size="md"
      footer={
        <>
          <CeButton color="gray" outline disabled={confirmBusy} onClick={onCancel}>
            Cancelar
          </CeButton>
          <CeButton
            color="failure"
            loading={confirmBusy}
            onClick={onConfirm}
            className="inline-flex items-center gap-2"
          >
            <Trash2 size={16} aria-hidden /> {confirmLabel}
          </CeButton>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        Esta acción <b>no se puede deshacer</b>.
      </div>
    </CeModal>
  );
}
