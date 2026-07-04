import { useMemo } from "react";
import { Download, Loader2, Wallet } from "lucide-react";
import { formatMoney } from "@features/orders";
import { useStoreOrders } from "@features/finance/hooks/useWarehouse";
import type { OrderSummaryDto } from "@features/orders/Dtos/orders";
import { downloadCsv } from "../logic/exportCsv";
import {
  AdminCard,
  AdminEmptyState,
  AdminGhostButton,
  AdminTableFrame,
  SectionHeader,
  SummaryCard,
} from "../components/StoreAdminUi";

type CurrencyRow = {
  code: string;
  released: number;
  held: number;
  refunded: number;
  orders: number;
};

function financeByCurrency(orders: OrderSummaryDto[]): CurrencyRow[] {
  const map = new Map<string, CurrencyRow>();
  for (const o of orders) {
    const row =
      map.get(o.currencyCode) ??
      { code: o.currencyCode, released: 0, held: 0, refunded: 0, orders: 0 };
    row.orders += 1;
    if (o.paymentStatus === "released") row.released += o.total;
    else if (o.paymentStatus === "held") row.held += o.total;
    else if (o.paymentStatus === "refunded") row.refunded += o.total;
    map.set(o.currencyCode, row);
  }
  return Array.from(map.values()).sort((a, b) => b.released - a.released);
}

export function FinanceSection({ storeId }: { storeId: string }) {
  const { data, isLoading, isError } = useStoreOrders(storeId);
  const orders = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => financeByCurrency(orders), [orders]);

  const releasedTotal = rows
    .map((r) => formatMoney(r.released, r.code))
    .join("  ·  ");
  const heldTotal = rows.map((r) => formatMoney(r.held, r.code)).join("  ·  ");

  function exportCsv() {
    downloadCsv(
      "finanzas.csv",
      ["Moneda", "Liberado", "Retenido", "Reembolsado", "Pedidos"],
      rows.map((r) => [
        r.code,
        r.released.toFixed(2),
        r.held.toFixed(2),
        r.refunded.toFixed(2),
        r.orders,
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Finanzas"
        subtitle="Ingresos de tu tienda según el estado de pago de los pedidos."
        actions={
          rows.length > 0 ? (
            <AdminGhostButton onClick={exportCsv}>
              <Download size={16} aria-hidden /> Exportar
            </AdminGhostButton>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-emerald-700" />
        </div>
      ) : isError ? (
        <AdminEmptyState title="No se pudieron cargar las finanzas." />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="Todavía no hay movimientos."
          hint="Los ingresos aparecerán cuando tu tienda reciba pedidos pagados."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              label="Ingresos liberados"
              value={<span className="text-lg sm:text-xl">{releasedTotal || "—"}</span>}
              icon={<Wallet size={18} aria-hidden />}
            />
            <SummaryCard
              label="En custodia (retenido)"
              value={<span className="text-lg sm:text-xl">{heldTotal || "—"}</span>}
            />
            <SummaryCard label="Pedidos con pago" value={orders.length} />
          </div>

          <AdminCard>
            <AdminTableFrame>
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/90 text-xs font-bold uppercase tracking-wider text-gray-600">
                    <th className="whitespace-nowrap px-4 py-3.5">Moneda</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Liberado</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Retenido</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Reembolsado</th>
                    <th className="whitespace-nowrap px-4 py-3.5">Pedidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.code} className="bg-white hover:bg-gray-50/80">
                      <td className="px-4 py-4 font-bold text-gray-900">
                        {r.code}
                      </td>
                      <td className="px-4 py-4 font-semibold text-emerald-700">
                        {formatMoney(r.released, r.code)}
                      </td>
                      <td className="px-4 py-4 text-amber-700">
                        {formatMoney(r.held, r.code)}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {formatMoney(r.refunded, r.code)}
                      </td>
                      <td className="px-4 py-4 tabular-nums text-gray-700">
                        {r.orders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableFrame>
          </AdminCard>
        </>
      )}
    </div>
  );
}
