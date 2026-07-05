import { CeButton, CeModal } from "@shared/components/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Si retorna false, el modal permanece abierto (útil para errores de servidor). */
  onConfirm: () => void | Promise<boolean | void>;
  /** Si true, el texto menciona hilo (lista) y la pérdida de acceso al salir. */
  variant?: "page" | "list";
  blockingCode?: string | null;
  blockingMessage?: string | null;
  refundSuggestion?: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
  } | null;
  refundBusy?: boolean;
  onRequestRefund?: () => void | Promise<void>;
};

export function ChatLeaveConfirmModal({
  open,
  onClose,
  onConfirm,
  variant = "page",
  blockingCode,
  blockingMessage,
  refundSuggestion,
  refundBusy,
  onRequestRefund,
}: Props) {
  const listExtra =
    variant === "list" ? (
      <span>
        {" "}
        Además, al confirmar,{" "}
        <strong className="text-gray-900 dark:text-gray-100">
          dejás de formar parte de este hilo
        </strong>
        : dejará de mostrarse en la lista y no podrás reabrir el mismo hilo.
      </span>
    ) : null;

  return (
    <CeModal
      show={open}
      onClose={onClose}
      title="¿Salir del chat?"
      size="md"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline onClick={onClose}>
            Cancelar
          </CeButton>
          <CeButton
            disabled={Boolean(blockingCode)}
            onClick={() => {
              void (async () => {
                const r = await Promise.resolve(onConfirm());
                if (r === false) return;
                onClose();
              })();
            }}
          >
            Sí, salir
          </CeButton>
        </>
      }
    >
      <p className="mb-4 text-sm leading-snug text-gray-600 dark:text-gray-400">
        Los demás participantes verán un aviso de que saliste de la conversación.
        {listExtra}
      </p>
      {blockingCode ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-snug text-gray-900 dark:border-red-800/50 dark:bg-red-950/30 dark:text-gray-100">
          <div className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Salida bloqueada
          </div>
          <div className="mt-1 font-bold">{blockingMessage ?? blockingCode}</div>
          {blockingCode === "route_delivery_active_buyer" ||
          blockingCode === "route_delivery_active_seller" ? (
            <p className="mt-2 mb-0 text-xs leading-snug text-gray-600 dark:text-gray-400">
              Mientras haya entregas activas (pagadas/en curso), tenés que esperar
              la evidencia o gestionar un reembolso elegible del tramo con la
              contraparte.
            </p>
          ) : null}
        </div>
      ) : null}

      {refundSuggestion && onRequestRefund ? (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-snug dark:border-gray-600 dark:bg-gray-800">
          <div className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Reembolso del tramo (si aplica)
          </div>
          <p className="mt-1 mb-2 text-xs leading-snug text-gray-600 dark:text-gray-400">
            Si el servidor marcó el tramo como elegible para reembolso, podés
            intentar solicitarlo aquí (comprador o vendedor).
          </p>
          <CeButton
            className="w-full justify-center"
            loading={Boolean(refundBusy)}
            onClick={() => void onRequestRefund()}
          >
            Solicitar reembolso del tramo
          </CeButton>
        </div>
      ) : null}

      <p className="mb-0 text-xs leading-snug text-gray-500 dark:text-gray-400">
        Si solo quieres volver atrás sin avisar, usa «Volver» o navega a otra
        pantalla.
      </p>
    </CeModal>
  );
}
