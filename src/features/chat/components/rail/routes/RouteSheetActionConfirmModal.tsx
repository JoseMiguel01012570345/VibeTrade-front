import { CeButton, CeModal } from "@shared/components/ui";

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
    <CeModal
      show={open}
      onClose={onCancel}
      title={title}
      size="md"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline onClick={onCancel}>
            Cancelar
          </CeButton>
          <CeButton color={confirmColor} onClick={onConfirm}>
            {confirmLabel}
          </CeButton>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </CeModal>
  );
}
