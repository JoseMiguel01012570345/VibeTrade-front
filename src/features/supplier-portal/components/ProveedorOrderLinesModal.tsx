import { CeButton, CeModal } from "./ProveedorUi";
import type { SupplierPortalTransactionRow } from "../Dtos/supplierPortalTypes";
import { formatMoney } from "@features/orders";
import { formatProveedorTxDate, ProveedorOrderStatusBadge } from "../logic/proveedorSectionOrdersHelpers";

export function ProveedorOrderLinesModal({
  order,
  onClose,
}: {
  order: SupplierPortalTransactionRow | null;
  onClose: () => void;
}) {
  const currencyCode = order?.currencyCode ?? "USD";

  return (
    <CeModal
      show={order != null && order.kind === "order"}
      onClose={onClose}
      title={
        order ? (
          <span>
            Detalle del pedido{" "}
            <span className="font-semibold text-[#0f6b4f] dark:text-emerald-400">
              {order.publicNumber}
            </span>
          </span>
        ) : (
          "Detalle del pedido"
        )
      }
      size="2xl"
      footer={
        <CeButton className="w-full sm:w-auto" onClick={onClose}>
          Cerrar
        </CeButton>
      }
    >
      {order ? (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Cliente</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {order.customerName || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Fecha</p>
              <p className="mt-1 text-gray-700 dark:text-gray-300">
                {formatProveedorTxDate(order.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Total</p>
              <p className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">
                {formatMoney(order.total, currencyCode)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Estado</p>
              <div className="mt-1">
                <ProveedorOrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            El desglose por producto estará disponible cuando el API lo exponga.
          </p>
        </div>
      ) : null}
    </CeModal>
  );
}
