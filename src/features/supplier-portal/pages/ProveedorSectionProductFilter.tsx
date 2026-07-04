import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import type { SupplierPortalCategoryOption } from "../Dtos/supplierPortalTypes";
import {
  CeButton,
  CeNativeSelect,
  CeSelect,
  CeTextField,
  IconDownload,
  IconFilterFunnel,
} from "../components/ProveedorUi";
import { PROVEEDOR_PAGE_SIZE_OPTIONS } from "../logic/proveedorSectionConstants";

export function ProveedorSectionProductFilter({
  children,
  showFilters,
  setShowFilters,
  filteredCount,
  pageSize,
  onPageSizeChange,
  exportDisabled,
  onExport,
  importDisabled,
  importing,
  fileInputRef,
  onImportClick,
  onImportFileChange,
  invSearch,
  setInvSearch,
  filterCategoryId,
  setFilterCategoryId,
  categories,
  filterStock,
  setFilterStock,
  filterVisibility,
  setFilterVisibility,
}: {
  children: ReactNode;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  filteredCount: number;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  exportDisabled: boolean;
  onExport: () => void;
  importDisabled: boolean;
  importing: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  onImportClick: () => void;
  onImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  invSearch: string;
  setInvSearch: (s: string) => void;
  filterCategoryId: string;
  setFilterCategoryId: (id: string) => void;
  categories: SupplierPortalCategoryOption[];
  filterStock: "" | "inStock" | "outOfStock";
  setFilterStock: (v: "" | "inStock" | "outOfStock") => void;
  filterVisibility: "" | "visible" | "hidden" | "pending";
  setFilterVisibility: (v: "" | "visible" | "hidden" | "pending") => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-3 py-3 dark:border-gray-800 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Listado de inventario total
          </p>
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
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <label htmlFor="proveedor-inv-page-size" className="sr-only">
              Filas por página
            </label>
            <CeSelect
              id="proveedor-inv-page-size"
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
            {filteredCount === 1 ? "producto encontrado" : "productos encontrados"}
          </p>
          <CeButton
            type="button"
            color="gray"
            outline
            className="inline-flex items-center gap-2"
            disabled={exportDisabled}
            onClick={onExport}
          >
            <IconDownload className="h-4 w-4" />
            Exportar
          </CeButton>
          <CeButton
            type="button"
            color="gray"
            outline
            className="inline-flex items-center gap-2"
            disabled={importDisabled || importing}
            onClick={onImportClick}
          >
            {importing ? "Importando…" : "Importar Excel"}
          </CeButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={onImportFileChange}
          />
        </div>
      </div>

      {showFilters ? (
        <div className="relative z-20 grid gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-4 dark:border-gray-800 dark:bg-gray-950/40 sm:grid-cols-2 lg:grid-cols-4">
          <CeTextField
            id="proveedor-inv-search"
            label="Buscar"
            placeholder="Nombre, ID…"
            value={invSearch}
            onChange={(e) => setInvSearch(e.target.value)}
          />
          <CeNativeSelect
            id="proveedor-inv-filter-cat"
            label="Categoría"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </CeNativeSelect>
          <CeNativeSelect
            id="proveedor-inv-filter-stock"
            label="Stock"
            value={filterStock}
            onChange={(e) =>
              setFilterStock(e.target.value as "" | "inStock" | "outOfStock")
            }
          >
            <option value="">Todos</option>
            <option value="inStock">Con stock</option>
            <option value="outOfStock">Sin stock</option>
          </CeNativeSelect>
          <CeNativeSelect
            id="proveedor-inv-filter-visibility"
            label="Visibilidad en tienda"
            value={filterVisibility}
            onChange={(e) =>
              setFilterVisibility(
                e.target.value as "" | "visible" | "hidden" | "pending",
              )
            }
          >
            <option value="">Todos</option>
            <option value="visible">Visibles</option>
            <option value="hidden">Ocultos (aprobados)</option>
            <option value="pending">Pendiente de aprobación</option>
          </CeNativeSelect>
        </div>
      ) : null}

      {children}
    </>
  );
}
