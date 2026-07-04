import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ymdToNoonDate } from "../logic/proveedorTableHelpers";
import type { OrderDateDirection } from "../Dtos/supplierPortalTypes";
import {
  CeButton,
  CeDateField,
  CeNativeSelect,
  CeSelect,
  IconDownload,
  IconFilterFunnel,
} from "../components/ProveedorUi";
import { PROVEEDOR_PAGE_SIZE_OPTIONS } from "../logic/proveedorSectionConstants";

export function ProveedorSectionOrdersFilter({
  children,
  showFilters,
  setShowFilters,
  filteredCount,
  pageSize,
  pageSizeSelectId,
  onPageSizeChange,
  exporting,
  exportDisabled,
  onExport,
  from,
  to,
  status,
  invalidatedFilter,
  setInvalidatedFilter,
  orderDateDirection,
  setOrderDateDirection,
  onFromChange,
  onToChange,
  setStatus,
  onApplyFilters,
  includeLiquidated,
  onIncludeLiquidatedChange,
}: {
  children: ReactNode;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  filteredCount: number;
  pageSize: number;
  pageSizeSelectId: string;
  onPageSizeChange: (n: number) => void;
  exporting: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  from: string;
  to: string;
  status: string;
  invalidatedFilter: string;
  setInvalidatedFilter: (v: string) => void;
  orderDateDirection: OrderDateDirection;
  setOrderDateDirection: (v: OrderDateDirection) => void;
  onFromChange: (ymd: string) => void;
  onToChange: (ymd: string) => void;
  setStatus: (v: string) => void;
  onApplyFilters: () => void;
  includeLiquidated: boolean;
  onIncludeLiquidatedChange: (checked: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-3 py-3 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pedidos</p>
          <CeButton
            type="button"
            color="gray"
            outline
            className="inline-flex items-center gap-2"
            onClick={() => setShowFilters((v) => !v)}
          >
            <IconFilterFunnel className="h-4 w-4" />
            Filtros
          </CeButton>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#0f6b4f] focus:ring-[#0f6b4f]"
              checked={includeLiquidated}
              onChange={(e) => onIncludeLiquidatedChange(e.target.checked)}
            />
            Mostrar pedidos liquidados
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <label htmlFor={pageSizeSelectId} className="sr-only">
              Filas por página
            </label>
            <CeSelect
              id={pageSizeSelectId}
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 min-h-[2.25rem] justify-center py-0 pe-9 ps-3 text-sm font-semibold tabular-nums [&_span]:min-w-[1.25rem] [&_span]:text-center"
              wrapperClassName="relative inline-block w-auto min-w-[4rem] shrink-0"
            >
              {PROVEEDOR_PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </CeSelect>
          </span>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {filteredCount}{" "}
            {filteredCount === 1 ? "pedido encontrado" : "pedidos encontrados"}
          </p>
          <CeButton
            type="button"
            color="gray"
            outline
            className="inline-flex items-center gap-2"
            disabled={exporting || exportDisabled}
            onClick={onExport}
          >
            <IconDownload className="h-4 w-4" />
            {exporting ? "Exportando…" : "Exportar"}
          </CeButton>
        </div>
      </div>

      {showFilters ? (
        <div className="relative z-20 grid gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-4 dark:border-gray-800 dark:bg-gray-950/40 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <CeDateField
            id="proveedor-order-filter-from"
            label="Desde"
            value={from}
            onChange={onFromChange}
            maxDate={ymdToNoonDate(to)}
          />
          <CeDateField
            id="proveedor-order-filter-to"
            label="Hasta"
            value={to}
            onChange={onToChange}
            minDate={ymdToNoonDate(from)}
          />
          <CeNativeSelect
            id="proveedor-order-status"
            label="Estado del Pedido"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="0">Recoger (TCP)</option>
            <option value="1">En mensajería</option>
            <option value="2">Entregado</option>
          </CeNativeSelect>
          <CeNativeSelect
            id="proveedor-order-validity-filter"
            label="Validez del pedido"
            value={invalidatedFilter}
            onChange={(e) => setInvalidatedFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="valid">Válidos</option>
            <option value="invalidated">Invalidados</option>
          </CeNativeSelect>
          <CeNativeSelect
            id="proveedor-order-sort-date"
            label="Orden por fecha"
            value={orderDateDirection}
            onChange={(e) =>
              setOrderDateDirection(e.target.value as OrderDateDirection)
            }
          >
            <option value="asc">Antigua → reciente</option>
            <option value="desc">Reciente → antigua</option>
          </CeNativeSelect>
          <div className="flex items-end">
            <CeButton
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 border-0 bg-[#0f6b4f] text-white hover:bg-[#0c5640] focus:ring-[#0f6b4f] dark:bg-[#0f6b4f] dark:hover:bg-[#0d5c44]"
              onClick={onApplyFilters}
            >
              <IconFilterFunnel className="h-4 w-4" />
              Filtrar
            </CeButton>
          </div>
        </div>
      ) : null}

      {children}
    </>
  );
}
