import { useMemo } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatMoney, statusLabel } from "@features/orders";
import type {
  OrderPaymentStatus,
  OrderSummaryDto,
} from "@features/orders/Dtos/orders";
import {
  useAdvanceOrder,
  useInvalidateOrder,
  useStoreOrders,
  useUploadClientEvidence,
} from "@features/finance/hooks/useWarehouse";
import { downloadCsv } from "../logic/exportCsv";
import {
  AdminCard,
  AdminEmptyState,
  AdminGhostButton,
  AdminTableFrame,
  SectionHeader,
  SummaryCard,
} from "../components/StoreAdminUi";

function paymentLabel(p: OrderPaymentStatus): string {
  if (p === "held") return "Retenido";
  if (p === "released") return "Liberado";
  return "Reembolsado";
}

function statusBadgeClass(status: string): string {
  if (status === "entregado") return "bg-emerald-100 text-emerald-800";
  if (status === "en_transito") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-800";
}

export function OrdersSection({ storeId }: { storeId: string }) {
  const { data, isLoading, isError } = useStoreOrders(storeId);
  const advance = useAdvanceOrder(storeId);
  const invalidate = useInvalidateOrder(storeId);
  const uploadEvidence = useUploadClientEvidence(storeId);

  const orders = useMemo(() => data ?? [], [data]);

  const inTransit = orders.filter((o) => o.status === "en_transito").length;
  const delivered = orders.filter((o) => o.status === "entregado").length;
  const processing = orders.filter((o) => o.status === "procesado").length;

  async function onAdvance(o: OrderSummaryDto) {
    try {
      await advance.mutateAsync({ orderId: o.id, toStatus: "en_transito" });
      toast.success(`Pedido ${o.publicNumber} en tránsito.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo avanzar el pedido.",
      );
    }
  }

  async function onUploadEvidence(o: OrderSummaryDto) {
    const url = window.prompt("URL de la evidencia de entrega al cliente:");
    if (!url) return;
    try {
      await uploadEvidence.mutateAsync({ orderId: o.id, urls: [url] });
      toast.success("Evidencia enviada al comprador.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo subir la evidencia.",
      );
    }
  }

  async function onInvalidate(o: OrderSummaryDto) {
    const reason = window.prompt("Motivo de la invalidación (opcional):") ?? undefined;
    try {
      await invalidate.mutateAsync({ orderId: o.id, reason });
      toast.success(`Pedido ${o.publicNumber} invalidado.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo invalidar el pedido.",
      );
    }
  }

  function exportCsv() {
    downloadCsv(
      "pedidos.csv",
      ["Pedido", "Fecha", "Estado", "Pago", "Total", "Moneda"],
      orders.map((o) => [
        o.publicNumber,
        new Date(o.createdAtUtc).toLocaleDateString(),
        statusLabel(o.status),
        paymentLabel(o.paymentStatus),
        o.total.toFixed(2),
        o.currencyCode,
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pedidos"
        subtitle="Pedidos recibidos por tu tienda y su estado de entrega."
        actions={
          orders.length > 0 ? (
            <AdminGhostButton onClick={exportCsv}>
              <Download size={16} aria-hidden /> Exportar
            </AdminGhostButton>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total pedidos"
          value={orders.length}
          icon={<ShoppingBag size={18} aria-hidden />}
        />
        <SummaryCard label="Procesados" value={processing} />
        <SummaryCard label="En tránsito" value={inTransit} />
        <SummaryCard label="Entregados" value={delivered} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-emerald-700" />
        </div>
      ) : isError ? (
        <AdminEmptyState title="No se pudieron cargar los pedidos." />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="Esta tienda todavía no tiene pedidos."
          hint="Cuando recibas pedidos aparecerán aquí para su gestión."
        />
      ) : (
        <AdminCard>
          <AdminTableFrame>
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/90 text-xs font-bold uppercase tracking-wider text-gray-600">
                  <th className="whitespace-nowrap px-4 py-3.5">Pedido</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Fecha</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Estado</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Pago</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Total</th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="bg-white transition-colors hover:bg-gray-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-bold text-gray-900">
                      {o.publicNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                      {new Date(o.createdAtUtc).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(o.status)}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {paymentLabel(o.paymentStatus)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-900">
                      {formatMoney(o.total, o.currencyCode)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {o.status === "procesado" ? (
                          <>
                            <button
                              type="button"
                              disabled={advance.isPending}
                              onClick={() => onAdvance(o)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                            >
                              <Truck size={14} aria-hidden /> En tránsito
                            </button>
                            <button
                              type="button"
                              disabled={invalidate.isPending}
                              onClick={() => onInvalidate(o)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              <XCircle size={14} aria-hidden /> Invalidar
                            </button>
                          </>
                        ) : null}
                        {o.status === "en_transito" ? (
                          <button
                            type="button"
                            disabled={uploadEvidence.isPending}
                            onClick={() => onUploadEvidence(o)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                          >
                            <CheckCircle2 size={14} aria-hidden /> Evidencia
                          </button>
                        ) : null}
                        {o.status === "entregado" ? (
                          <span className="text-xs font-medium text-gray-400">
                            Sin acciones
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableFrame>
        </AdminCard>
      )}
    </div>
  );
}
