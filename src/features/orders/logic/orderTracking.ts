import { useState } from "react";
import toast from "react-hot-toast";
import { useDecideEvidence } from "../hooks/useOrders";
import type { OrderStatus } from "../Dtos/orders";
import { errorToUserMessage } from "@shared/services/http/apiErrorMessage";

export const ORDER_TRACKING_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "procesado", label: "Procesado" },
  { key: "en_transito", label: "En tránsito" },
  { key: "entregado", label: "Entregado" },
];

export function orderStepIndex(status: OrderStatus): number {
  return ORDER_TRACKING_STEPS.findIndex((s) => s.key === status);
}

/** Estado y acción para aceptar/rechazar la evidencia de entrega de un pedido. */
export function useEvidenceDecision(publicNumber: string) {
  const decide = useDecideEvidence(publicNumber);
  const [rejectReason, setRejectReason] = useState("");

  async function submit(orderId: string, accept: boolean) {
    try {
      await decide.mutateAsync({
        orderId,
        accept,
        rejectReason: accept ? undefined : rejectReason.trim() || undefined,
      });
      toast.success(accept ? "Entrega confirmada." : "Evidencia rechazada.");
    } catch (e) {
      toast.error(errorToUserMessage(e, "No se pudo registrar tu decisión."));
    }
  }

  return {
    rejectReason,
    setRejectReason,
    submit,
    isPending: decide.isPending,
  };
}
