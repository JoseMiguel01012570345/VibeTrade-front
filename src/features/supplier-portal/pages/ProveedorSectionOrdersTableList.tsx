import { useId, useState, Fragment } from "react";
import type { SupplierPortalTransactionRow } from "../Dtos/supplierPortalTypes";
import type { OrderDateDirection } from "../Dtos/supplierPortalTypes";
import { formatMoney } from "@features/orders";
import { tcpInitials } from "../logic/proveedorTableHelpers";
import { PROVEEDOR_TABLE_LIST_SHELL } from "../logic/proveedorSectionConstants";
import {
  formatProveedorTxDate,
  ProveedorOrderStatusBadge,
} from "../logic/proveedorSectionOrdersHelpers";
import { ProveedorSectionTablePagination } from "../components/ProveedorSectionTablePagination";
import { ProveedorSectionOrdersFilter } from "./ProveedorSectionOrdersFilter";
import { ProveedorOrderLinesModal } from "../components/ProveedorOrderLinesModal";

export function ProveedorSectionOrdersTableList({
  items,
  total,
  page,
  pageSize,
  loading = false,
  exporting = false,
  showFilters,
  setShowFilters,
  from,
  to,
  status,
  invalidatedFilter,
  setInvalidatedFilter,
  orderDateDirection,
  setOrderDateDirection,
  filteredCount,
  onFromChange,
  onToChange,
  setStatus,
  onApplyFilters,
  onPageChange,
  onPageSizeChange,
  onExport,
  includeLiquidated,
  onIncludeLiquidatedChange,
}: {
  items: SupplierPortalTransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  exporting?: boolean;
  showFilters: boolean;
  setShowFilters: (v: boolean | ((prev: boolean) => boolean)) => void;
  from: string;
  to: string;
  status: string;
  invalidatedFilter: string;
  setInvalidatedFilter: (v: string) => void;
  orderDateDirection: OrderDateDirection;
  setOrderDateDirection: (v: OrderDateDirection) => void;
  filteredCount: number;
  onFromChange: (ymd: string) => void;
  onToChange: (ymd: string) => void;
  setStatus: (v: string) => void;
  onApplyFilters: () => void;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  onExport: () => void;
  includeLiquidated: boolean;
  onIncludeLiquidatedChange: (checked: boolean) => void;
}) {
  const pageSizeSelectId = useId();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [selectedOrder, setSelectedOrder] = useState<SupplierPortalTransactionRow | null>(null);

  return (
    <div className={PROVEEDOR_TABLE_LIST_SHELL}>
      <ProveedorSectionOrdersFilter
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filteredCount={filteredCount}
        pageSize={pageSize}
        pageSizeSelectId={pageSizeSelectId}
        onPageSizeChange={onPageSizeChange}
        exporting={exporting}
        exportDisabled={total === 0}
        onExport={onExport}
        from={from}
        to={to}
        status={status}
        invalidatedFilter={invalidatedFilter}
        setInvalidatedFilter={setInvalidatedFilter}
        orderDateDirection={orderDateDirection}
        setOrderDateDirection={setOrderDateDirection}
        onFromChange={onFromChange}
        onToChange={onToChange}
        setStatus={setStatus}
        onApplyFilters={onApplyFilters}
        includeLiquidated={includeLiquidated}
        onIncludeLiquidatedChange={onIncludeLiquidatedChange}
      >
        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              {loading
                ? "Cargando transacciones…"
                : total === 0
                  ? "No hay transacciones recientes."
                  : "Ningún pedido coincide con los filtros."}
            </p>
          ) : (
            items.map((row) => {
              const rowKey =
                row.kind === "platformDebt"
                  ? `debt-${row.adjustmentId}`
                  : `order-${row.orderId ?? row.publicNumber}`;
              const isPlatformDebt = row.kind === "platformDebt";

              if (isPlatformDebt) {
                return (
                  <div
                    key={rowKey}
                    className="space-y-2 bg-amber-50/90 px-4 py-3 dark:bg-amber-950/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-300">
                          Deuda plataforma
                        </p>
                        <p className="mt-1 font-semibold text-amber-900 dark:text-amber-100">
                          {row.publicNumber}
                        </p>
                        <p className="text-sm text-amber-900/90 dark:text-amber-200">
                          {row.customerName || "BanderaExpress"}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                        +{formatMoney(row.total, row.currencyCode)}
                      </p>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                      {formatProveedorTxDate(row.createdAt)} · Saldo:{" "}
                      {formatMoney(
                        row.platformDebtAmountAfter ?? 0,
                        row.currencyCode,
                      )}
                    </p>
                  </div>
                );
              }

              return (
                <button
                  key={rowKey}
                  type="button"
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20"
                  onClick={() => setSelectedOrder(row)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0f6b4f] dark:text-emerald-400">
                        {row.publicNumber}
                      </p>
                      <p className="mt-1 truncate font-medium text-gray-900 dark:text-white">
                        {row.customerName || "—"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatProveedorTxDate(row.createdAt)} · {row.itemCount}{" "}
                        ítem{row.itemCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="font-semibold tabular-nums text-gray-900 dark:text-white">
                        {formatMoney(row.total, row.currencyCode)}
                      </p>
                      <ProveedorOrderStatusBadge status={row.status} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block data-table-wrap">
          <table className="data-table min-w-[52rem]">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Número de factura</th>
                <th>Cliente</th>
                <th>Items</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                    {loading
                      ? "Cargando transacciones…"
                      : total === 0
                        ? "No hay transacciones recientes."
                        : "Ningún pedido coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const rowKey =
                    row.kind === "platformDebt"
                      ? `debt-${row.adjustmentId}`
                      : `order-${row.orderId ?? row.publicNumber}`;
                  const isPlatformDebt = row.kind === "platformDebt";

                  if (isPlatformDebt) {
                    return (
                      <Fragment key={rowKey}>
                        <tr className="bg-amber-50/90 dark:bg-amber-950/25">
                          <td className="whitespace-nowrap font-medium text-amber-900 dark:text-amber-200">
                            {formatProveedorTxDate(row.createdAt)}
                          </td>
                          <td className="whitespace-nowrap font-semibold text-amber-800 dark:text-amber-300">
                            {row.publicNumber}
                          </td>
                          <td className="min-w-[12rem] font-medium text-amber-900 dark:text-amber-100">
                            {row.customerName || "BanderaExpress"}
                          </td>
                          <td className="tabular-nums text-amber-800 dark:text-amber-300">—</td>
                          <td className="whitespace-nowrap font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                            +{formatMoney(row.total, row.currencyCode)}
                          </td>
                          <td>
                            <span className="inline-flex rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                              Deuda plataforma
                            </span>
                          </td>
                        </tr>
                        <tr className="bg-amber-50/60 dark:bg-amber-950/15">
                          <td colSpan={6} className="py-2 pl-4 text-xs text-amber-900 dark:text-amber-200">
                            Fondos BanderaExpress actualizados:{" "}
                            <span className="font-semibold tabular-nums">
                              {formatMoney(
                                row.platformDebtAmountAfter ?? 0,
                                row.currencyCode,
                              )}
                            </span>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  }

                  return (
                    <tr
                      key={rowKey}
                      className="cursor-pointer transition-colors hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20"
                      onClick={() => setSelectedOrder(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedOrder(row);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver productos del pedido ${row.publicNumber}`}
                    >
                      <td className="whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatProveedorTxDate(row.createdAt)}
                      </td>
                      <td className="whitespace-nowrap font-semibold text-[#0f6b4f] dark:text-emerald-400">
                        {row.publicNumber}
                      </td>
                      <td className="min-w-[12rem]">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-100 to-emerald-200/90 text-xs font-bold text-[#0f6b4f] shadow-inner dark:from-emerald-950/80 dark:to-emerald-900/60 dark:text-emerald-200"
                            aria-hidden
                          >
                            {tcpInitials(row.customerName)}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {row.customerName || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="tabular-nums">{row.itemCount}</td>
                      <td className="whitespace-nowrap font-semibold tabular-nums text-gray-900 dark:text-white">
                        {formatMoney(row.total, row.currencyCode)}
                      </td>
                      <td>
                        <ProveedorOrderStatusBadge status={row.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ProveedorSectionTablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </ProveedorSectionOrdersFilter>

      <ProveedorOrderLinesModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
