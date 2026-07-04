import { useMemo } from "react";
import { BarChart3, Loader2, PackageCheck, ShoppingBag, Wallet } from "lucide-react";
import { formatMoney } from "@features/orders";
import { useStoreOrders } from "@features/finance/hooks/useWarehouse";
import type { OrderSummaryDto } from "@features/orders/Dtos/orders";
import {
  AdminCard,
  AdminEmptyState,
  SectionHeader,
  SummaryCard,
} from "../components/StoreAdminUi";

function revenueByCurrency(orders: OrderSummaryDto[]): { code: string; total: number }[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (o.paymentStatus === "refunded") continue;
    map.set(o.currencyCode, (map.get(o.currencyCode) ?? 0) + o.total);
  }
  return Array.from(map.entries())
    .map(([code, total]) => ({ code, total }))
    .sort((a, b) => b.total - a.total);
}

/** Últimos 14 días con conteo de pedidos por día. */
function ordersByDay(orders: OrderSummaryDto[]): { label: string; count: number }[] {
  const days: { key: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }),
      count: 0,
    });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const o of orders) {
    const key = new Date(o.createdAtUtc).toISOString().slice(0, 10);
    const bucket = byKey.get(key);
    if (bucket) bucket.count += 1;
  }
  return days.map(({ label, count }) => ({ label, count }));
}

export function StatisticsSection({ storeId }: { storeId: string }) {
  const { data, isLoading, isError } = useStoreOrders(storeId);
  const orders = useMemo(() => data ?? [], [data]);

  const delivered = orders.filter((o) => o.status === "entregado").length;
  const revenue = useMemo(() => revenueByCurrency(orders), [orders]);
  const byDay = useMemo(() => ordersByDay(orders), [orders]);
  const maxDay = Math.max(1, ...byDay.map((d) => d.count));

  const statusCounts = useMemo(
    () => ({
      procesado: orders.filter((o) => o.status === "procesado").length,
      en_transito: orders.filter((o) => o.status === "en_transito").length,
      entregado: delivered,
    }),
    [orders, delivered],
  );
  const totalForFunnel = Math.max(1, orders.length);

  const revenueValue =
    revenue.length === 0
      ? "—"
      : revenue.map((r) => formatMoney(r.total, r.code)).join("  ·  ");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Estadísticas"
        subtitle="Rendimiento de tu tienda calculado a partir de tus pedidos."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-emerald-700" />
        </div>
      ) : isError ? (
        <AdminEmptyState title="No se pudieron cargar las estadísticas." />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          title="Todavía no hay datos suficientes."
          hint="Las estadísticas aparecerán cuando tu tienda reciba pedidos."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Pedidos"
              value={orders.length}
              icon={<ShoppingBag size={18} aria-hidden />}
            />
            <SummaryCard
              label="Entregados"
              value={delivered}
              hint={`${((delivered / totalForFunnel) * 100).toFixed(0)}% de conversión`}
              icon={<PackageCheck size={18} aria-hidden />}
            />
            <SummaryCard
              label="Ingresos"
              value={<span className="text-lg sm:text-xl">{revenueValue}</span>}
              icon={<Wallet size={18} aria-hidden />}
            />
            <SummaryCard
              label="Monedas activas"
              value={revenue.length}
              icon={<BarChart3 size={18} aria-hidden />}
            />
          </div>

          <AdminCard className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Pedidos (últimos 14 días)
            </h3>
            <div className="mt-4 flex h-40 items-end gap-2">
              {byDay.map((d, i) => (
                <div
                  key={i}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] font-bold text-gray-500">
                    {d.count > 0 ? d.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-emerald-500/80 transition-all"
                    style={{
                      height: `${(d.count / maxDay) * 100}%`,
                      minHeight: d.count > 0 ? 4 : 0,
                    }}
                    title={`${d.label}: ${d.count}`}
                  />
                  <span className="truncate text-[9px] text-gray-400">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Estado de los pedidos
            </h3>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["Procesados", statusCounts.procesado, "bg-sky-500"],
                  ["En tránsito", statusCounts.en_transito, "bg-amber-500"],
                  ["Entregados", statusCounts.entregado, "bg-emerald-500"],
                ] as const
              ).map(([label, count, color]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="tabular-nums text-gray-500">{count}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${(count / totalForFunnel) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}
