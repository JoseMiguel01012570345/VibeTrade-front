import { useParams } from "react-router-dom";
import { Package, Truck, CheckCircle2, XCircle } from "lucide-react";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { toast } from "sonner";
import { formatMoney, statusLabel } from "@features/orders";
import type { OrderSummaryDto } from "@features/orders/Dtos/orders";
import {
  useAdvanceOrder,
  useInvalidateOrder,
  useStoreOrders,
  useUploadClientEvidence,
} from "../hooks/useWarehouse";

export function WarehousePortalPage() {
  const { storeId = "" } = useParams();
  const { data, isLoading, isError } = useStoreOrders(storeId);
  const advance = useAdvanceOrder(storeId);
  const invalidate = useInvalidateOrder(storeId);
  const uploadEvidence = useUploadClientEvidence(storeId);

  async function onAdvance(o: OrderSummaryDto) {
    try {
      await advance.mutateAsync({ orderId: o.id, toStatus: "en_transito" });
      toast.success(`Pedido ${o.publicNumber} en tránsito.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo avanzar el pedido.");
    }
  }

  async function onUploadEvidence(o: OrderSummaryDto) {
    const url = window.prompt("URL de la evidencia de entrega al cliente:");
    if (!url) return;
    try {
      await uploadEvidence.mutateAsync({ orderId: o.id, urls: [url] });
      toast.success("Evidencia enviada al comprador.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la evidencia.");
    }
  }

  async function onInvalidate(o: OrderSummaryDto) {
    const reason = window.prompt("Motivo de la invalidación (opcional):") ?? undefined;
    try {
      await invalidate.mutateAsync({ orderId: o.id, reason });
      toast.success(`Pedido ${o.publicNumber} invalidado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo invalidar el pedido.");
    }
  }

  return (
    <div className="container vt-page">
      <div className="flex items-center gap-2">
        <Package />
        <h1 className="vt-h1">Almacén · Pedidos</h1>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <CeSpinner />
        </div>
      )}
      {isError && (
        <div className="vt-card vt-card-pad mt-4 text-center">No se pudieron cargar los pedidos.</div>
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <div className="vt-card vt-card-pad mt-4 text-center vt-muted">
          Este almacén no tiene pedidos.
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {(data ?? []).map((o) => (
          <div key={o.id} className="vt-card vt-card-pad flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-black tracking-[-0.02em]">{o.publicNumber}</div>
              <div className="vt-muted text-sm">
                {new Date(o.createdAtUtc).toLocaleDateString()} · {statusLabel(o.status)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{formatMoney(o.total, o.currencyCode)}</span>
              {o.status === "procesado" && (
                <>
                  <button
                    className="vt-btn vt-btn-primary vt-btn-sm"
                    disabled={advance.isPending}
                    onClick={() => onAdvance(o)}
                  >
                    <Truck size={16} /> En tránsito
                  </button>
                  <button
                    className="vt-btn vt-btn-sm"
                    disabled={invalidate.isPending}
                    onClick={() => onInvalidate(o)}
                  >
                    <XCircle size={16} /> Invalidar
                  </button>
                </>
              )}
              {o.status === "en_transito" && (
                <button
                  className="vt-btn vt-btn-primary vt-btn-sm"
                  disabled={uploadEvidence.isPending}
                  onClick={() => onUploadEvidence(o)}
                >
                  <CheckCircle2 size={16} /> Subir evidencia
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
