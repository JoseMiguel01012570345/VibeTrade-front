import { Button } from "flowbite-react";
import { FlowbiteChatModal } from "../../layout/FlowbiteChatModal";

type Props = Readonly<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: "failure" | "blue" | "gray";
  onCancel: () => void;
  onConfirm: () => void;
}>;

/** Confirmación de acciones destructivas sobre hoja de ruta (eliminar / ocultar). */
export function RouteSheetActionConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmColor = "failure",
  onCancel,
  onConfirm,
}: Props) {
  return (
    <FlowbiteChatModal
      show={open}
      onDismiss={onCancel}
      title={title}
      description={message}
      size="md"
      footer={
        <>
          <Button color="light" onClick={onCancel}>
            Cancelar
          </Button>
          <Button color={confirmColor} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </FlowbiteChatModal>
  );
}
