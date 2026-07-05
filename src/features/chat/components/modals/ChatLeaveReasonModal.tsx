import { useState } from "react";
import { CeButton, CeModal } from "@shared/components/ui";

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

  return (
    <CeModal
      show={open}
      onClose={() => !busy && onClose()}
      title="Motivo de salida"
      size="md"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline disabled={busy} onClick={onClose}>
            Cancelar
          </CeButton>
          <CeButton
            loading={busy}
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
          </CeButton>
        </>
      }
    >
      <p className="mb-3 text-sm leading-snug text-gray-600 dark:text-gray-400">
        Indica el motivo de tu salida. Los demás participantes podrán ver que
        abandonaste la conversación.
      </p>
      <label
        className="mb-1 block text-xs font-extrabold text-gray-900 dark:text-gray-100"
        htmlFor="chat-leave-reason-ta"
      >
        Motivo (obligatorio)
      </label>
      <textarea
        id="chat-leave-reason-ta"
        className="min-h-[88px] w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={busy}
        placeholder="Ej.: cambio de planes, acuerdo cumplido…"
      />
      {emptyReasonError ? (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {emptyReasonError}
        </p>
      ) : null}
    </CeModal>
  );
}
