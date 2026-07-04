import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { trackOrder } from "../api/ordersApi";
import { ordersQueryKeys } from "../hooks/useOrders";
import {
  buildTrackingSuccessModel,
  type TrackingSuccessModel,
} from "./trackShipmentModel";
import { downloadOrderTrackingPdf } from "./orderTrackingPdf";
import type { OrderTrackingDto } from "../Dtos/orders";

/**
 * Estado y acciones del buscador de rastreo. Valida el número contra el API y, si el
 * pedido existe, muestra el resultado en la misma pantalla (réplica de la app de
 * referencia, `reference/frontend-guest/src/pages/TrackShipment.tsx`): tarjeta con el
 * estado, la llegada estimada, el hilo de pasos y la descarga del comprobante. Si no
 * existe, marca el estado de error.
 */
export function useTrackShipment() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [orderQuery, setOrderQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [trackingSuccess, setTrackingSuccess] =
    useState<TrackingSuccessModel | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<OrderTrackingDto | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const canSubmit = orderQuery.trim().length > 0 && !submitting;

  function resetResult() {
    setLookupFailed(false);
    setTrackingSuccess(null);
    setTrackedOrder(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = orderQuery.trim();
    if (!q) return;
    setSubmitting(true);
    resetResult();
    try {
      const order = await qc.fetchQuery({
        queryKey: ordersQueryKeys.track(q),
        queryFn: () => trackOrder(q),
      });
      setTrackedOrder(order);
      setTrackingSuccess(buildTrackingSuccessModel(order));
    } catch {
      setLookupFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  function changeQuery(value: string) {
    setOrderQuery(value);
    resetResult();
  }

  function onRetry() {
    resetResult();
    setOrderQuery("");
    queueMicrotask(() => inputRef.current?.focus());
  }

  function downloadReceipt() {
    if (!trackedOrder) return;
    setPdfLoading(true);
    try {
      downloadOrderTrackingPdf(trackedOrder);
      toast.success("Comprobante descargado.");
    } catch {
      toast.error("No se pudo descargar el comprobante. Inténtalo más tarde.");
    } finally {
      setPdfLoading(false);
    }
  }

  return {
    inputRef,
    orderQuery,
    changeQuery,
    submitting,
    lookupFailed,
    canSubmit,
    onSubmit,
    onRetry,
    trackingSuccess,
    trackedOrder,
    pdfLoading,
    downloadReceipt,
  };
}
