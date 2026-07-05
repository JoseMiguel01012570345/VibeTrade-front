import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchSupplierPortalDashboard,
  formatSupplierPortalError,
} from "../api/supplierPortalApi";
import type { SupplierPortalDashboard, OrderDateDirection } from "../Dtos/supplierPortalTypes";
import { exportProveedorTransactionsExcel } from "../logic/proveedorTransactionsExport";
import {
  DEFAULT_ADMIN_PAGE_SIZE,
  EMPTY_ORDER_FILTERS,
} from "../logic/proveedorSectionConstants";
import type { AppliedOrderFilters } from "../Dtos/supplierPortalTypes";
import { ProveedorSectionFilter } from "./ProveedorSectionFilter";
import { ProveedorSectionOrdersTableList } from "./ProveedorSectionOrdersTableList";
import { ProveedorSectionProductTableList } from "./ProveedorSectionProductTableList";
import { ProveedorSectionSummaryCards } from "./ProveedorSectionSummaryCards";

export function ProveedorSection({ businessName }: { businessName: string }) {
  const [dashboard, setDashboard] = useState<SupplierPortalDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(DEFAULT_ADMIN_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showOrderFilters, setShowOrderFilters] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [invalidatedFilter, setInvalidatedFilter] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<AppliedOrderFilters>(EMPTY_ORDER_FILTERS);
  const [orderDateDirection, setOrderDateDirection] = useState<OrderDateDirection>(
    "desc",
  );
  const [includeLiquidated, setIncludeLiquidated] = useState(false);

  const loadDashboard = useCallback(
    async (tx: number, pageSize: number) => {
      setLoading(true);
      setErr(null);
      try {
        const dash = await fetchSupplierPortalDashboard({
          transactionsPage: tx,
          transactionsPageSize: pageSize,
          from: appliedFilters.from || undefined,
          to: appliedFilters.to || undefined,
          status:
            appliedFilters.status === ""
              ? undefined
              : Number(appliedFilters.status),
          ...(appliedFilters.invalidatedFilter === "invalidated"
            ? { invalidated: true }
            : appliedFilters.invalidatedFilter === "valid"
              ? { invalidated: false }
              : {}),
          includeLiquidated,
          transactionsSort: orderDateDirection,
        });
        setDashboard(dash);
      } catch (e) {
        setErr(formatSupplierPortalError(e));
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, orderDateDirection, includeLiquidated],
  );

  useEffect(() => {
    void loadDashboard(txPage, txPageSize);
  }, [loadDashboard, txPage, txPageSize]);

  function onFromChange(ymd: string) {
    if (!ymd) {
      setFrom("");
      return;
    }
    if (to && ymd > to) setTo(ymd);
    setFrom(ymd);
  }

  function onToChange(ymd: string) {
    if (!ymd) {
      setTo("");
      return;
    }
    if (from && ymd < from) setFrom(ymd);
    setTo(ymd);
  }

  function applyFilters() {
    setAppliedFilters({ from, to, status, invalidatedFilter });
    if (txPage !== 1) setTxPage(1);
  }

  function onOrdersPageSizeChange(next: number) {
    setTxPageSize(next);
    if (txPage !== 1) setTxPage(1);
  }

  function onIncludeLiquidatedChange(checked: boolean) {
    setIncludeLiquidated(checked);
    if (txPage !== 1) setTxPage(1);
  }

  const exportTransactions = useCallback(async () => {
    if (!dashboard || dashboard.transactions.total === 0) return;
    setExporting(true);
    try {
      const dash = await fetchSupplierPortalDashboard({
        transactionsPage: 1,
        transactionsPageSize: dashboard.transactions.total,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
        status:
          appliedFilters.status === ""
            ? undefined
            : Number(appliedFilters.status),
        ...(appliedFilters.invalidatedFilter === "invalidated"
          ? { invalidated: true }
          : appliedFilters.invalidatedFilter === "valid"
            ? { invalidated: false }
            : {}),
        includeLiquidated,
        transactionsSort: orderDateDirection,
      });
      await exportProveedorTransactionsExcel(dash.transactions.items);
    } catch (e) {
      toast.error(formatSupplierPortalError(e));
    } finally {
      setExporting(false);
    }
  }, [dashboard, appliedFilters, orderDateDirection, includeLiquidated]);

  if (err) {
    return (
      <p className="font-medium text-red-600 dark:text-red-400">{err}</p>
    );
  }

  if (loading && !dashboard) {
    return <p className="text-gray-600 dark:text-gray-400">Cargando…</p>;
  }

  if (!dashboard) {
    return (
      <p className="text-gray-600 dark:text-gray-400">
        No se pudo cargar el panel.
      </p>
    );
  }

  return (
    <div>
      <ProveedorSectionFilter businessName={businessName} />

      <ProveedorSectionSummaryCards kpis={dashboard.kpis} />

      <div className="mb-5 space-y-5">
        <ProveedorSectionOrdersTableList
          items={dashboard.transactions.items}
          total={dashboard.transactions.total}
          page={dashboard.transactions.page}
          pageSize={txPageSize}
          loading={loading}
          exporting={exporting}
          showFilters={showOrderFilters}
          setShowFilters={setShowOrderFilters}
          from={from}
          to={to}
          status={status}
          invalidatedFilter={invalidatedFilter}
          setInvalidatedFilter={setInvalidatedFilter}
          orderDateDirection={orderDateDirection}
          setOrderDateDirection={setOrderDateDirection}
          filteredCount={dashboard.transactions.total}
          onFromChange={onFromChange}
          onToChange={onToChange}
          setStatus={setStatus}
          onApplyFilters={applyFilters}
          onPageChange={setTxPage}
          onPageSizeChange={onOrdersPageSizeChange}
          onExport={() => void exportTransactions()}
          includeLiquidated={includeLiquidated}
          onIncludeLiquidatedChange={onIncludeLiquidatedChange}
        />

        <ProveedorSectionProductTableList
          items={dashboard.inventory.items}
          categories={dashboard.inventory.categories}
          onInventoryUpdated={() => loadDashboard(txPage, txPageSize)}
        />
      </div>
    </div>
  );
}
