import { AlertCircle, Check, CheckCheck } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { cn } from "@shared/lib/cn";
import type { ChatDeliveryStatus } from "@features/market/logic/store/marketStoreTypes";
import {
  deliveryStateForMineMessage,
  hhmm,
} from "@features/chat/logic/messages/messageDeliveryMeta";

export { deliveryStateForMineMessage, hhmm };

const deliveryTitle: Record<ChatDeliveryStatus, string> = {
  pending: "Enviando",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  error: "Error al enviar",
};

export function MsgMeta({
  at,
  delivery,
}: {
  at: number;
  /** Solo mensajes propios con tipo soportado; ausente = sin icono de estado. */
  delivery?: ChatDeliveryStatus;
}) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      <span className="[font-variant-numeric:tabular-nums]">{hhmm(at)}</span>
      {delivery !== undefined && (
        <span
          className={cn(
            "inline-flex items-center",
            delivery === "read" &&
              "text-[color-mix(in_oklab,var(--good)_85%,var(--muted))]",
            (delivery === "sent" || delivery === "pending") &&
              "text-[var(--muted)]",
            delivery === "delivered" && "text-[var(--muted)]",
            delivery === "error" &&
              "text-[color-mix(in_oklab,#ef4444_78%,var(--muted))]",
          )}
          title={deliveryTitle[delivery]}
          aria-label={deliveryTitle[delivery]}
        >
          {delivery === "pending" && (
            <CeSpinner size="sm" className="size-3.5" aria-hidden />
          )}
          {delivery === "sent" && (
            <Check size={14} strokeWidth={2.5} className="shrink-0" />
          )}
          {delivery === "delivered" && (
            <CheckCheck size={14} strokeWidth={2.5} className="shrink-0 opacity-[0.92]" />
          )}
          {delivery === "read" && (
            <CheckCheck size={14} strokeWidth={2.5} className="shrink-0" />
          )}
          {delivery === "error" && (
            <AlertCircle size={14} strokeWidth={2.5} className="shrink-0" />
          )}
        </span>
      )}
    </span>
  );
}
