import { CeButton, CeModal } from "@shared/components/ui";

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
  return (
    <CeModal
      show={open}
      onClose={onAcknowledge}
      title="Salida del chat"
      size="md"
      bodyClassName="pt-2"
      footer={
        <CeButton onClick={onAcknowledge}>Entendido</CeButton>
      }
    >
      <p className="mb-3 text-sm leading-snug text-gray-600 dark:text-gray-400">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {roleLabel}
        </span>{" "}
        salió de este chat con un acuerdo ya aceptado.
      </p>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Motivo indicado
      </p>
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-snug text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
        {reason}
      </p>
      <p className="mt-4 mb-0 text-xs leading-snug text-gray-500 dark:text-gray-400">
        El hilo sigue disponible para vos; la otra parte ya fue dada de baja de
        este hilo (no lo verá en la lista y no tendrá acceso a este mismo hilo).
      </p>
    </CeModal>
  );
}
