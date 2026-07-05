import { CeButton } from "./CeButton";
import { CeModal } from "./CeModal";

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

/** Diálogo de confirmación neutro sobre CeModal. */
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
  return (
    <CeModal
      show={open}
      onClose={() => !confirmBusy && onCancel()}
      title={title}
      size="md"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline disabled={confirmBusy} onClick={onCancel}>
            {cancelLabel}
          </CeButton>
          <CeButton loading={confirmBusy} onClick={onConfirm}>
            {confirmLabel}
          </CeButton>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </CeModal>
  );
}
