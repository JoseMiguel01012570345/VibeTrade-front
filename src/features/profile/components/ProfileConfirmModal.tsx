import { ProfileButton } from "./ProfileButton";
import { ProfileModal } from "./ProfileModal";

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

export function ProfileConfirmModal({
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
    <ProfileModal
      show={open}
      onClose={() => !confirmBusy && onCancel()}
      title={title}
      size="md"
      footer={
        <>
          <ProfileButton
            variant="secondary"
            disabled={confirmBusy}
            onClick={onCancel}
          >
            {cancelLabel}
          </ProfileButton>
          <ProfileButton
            variant="danger"
            loading={confirmBusy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </ProfileButton>
        </>
      }
    >
      <p className="vt-profile-muted text-sm">{message}</p>
    </ProfileModal>
  );
}
