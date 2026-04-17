import { AlertCircle, Check, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "../../../../lib/cn";
import type {
  ChatDeliveryStatus,
  Message,
} from "../../../../app/store/marketStoreTypes";

export function hhmm(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Mensaje propio con estado de entrega persistido (texto, imagen, audio, doc). */
export function deliveryStateForMineMessage(
  m: Message,
): ChatDeliveryStatus | undefined {
  if (m.from !== "me") return undefined;
  switch (m.type) {
    case "text":
    case "image":
    case "audio":
    case "doc":
    case "docs":
      break;
    default:
      return undefined;
  }
  if ("chatStatus" in m && m.chatStatus) return m.chatStatus;
  if ("read" in m && m.read === true) return "read";
  if ("read" in m && m.read === false) return "sent";
  return "sent";
}

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
            <Loader2 className="size-3.5 shrink-0 animate-spin" strokeWidth={2.5} />
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
