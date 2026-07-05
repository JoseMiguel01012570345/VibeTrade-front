import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  SupplierPortalCategoryOption,
  SupplierPortalInventoryRow,
} from "../Dtos/supplierPortalTypes";
import { formatSupplierPortalError } from "../api/supplierPortalApi";
import { usePagedSlice } from "../logic/usePagedSlice";
import { exportProveedorInventoryExcel } from "../logic/proveedorInventoryUtils";
import {
  importProveedorInventoryExcel,
  parseProveedorInventoryExcel,
} from "../logic/proveedorInventoryImport";
import { formatMoney } from "@features/orders";
import {
  DEFAULT_ADMIN_PAGE_SIZE,
  PROVEEDOR_TABLE_LIST_SHELL,
} from "../logic/proveedorSectionConstants";
import {
  isProveedorProductVisibleInStore,
  ProveedorProductThumb,
  proveedorStockDotClass,
} from "../logic/proveedorSectionProductHelpers";
import { ProveedorSectionTablePagination } from "../components/ProveedorSectionTablePagination";
import { ProveedorSectionProductFilter } from "./ProveedorSectionProductFilter";

export function ProveedorSectionProductTableList({
  items,
  categories,
  onInventoryUpdated,
}: {
  items: SupplierPortalInventoryRow[];
  categories: SupplierPortalCategoryOption[];
  onInventoryUpdated: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_ADMIN_PAGE_SIZE);
  const [invSearch, setInvSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStock, setFilterStock] = useState<"" | "inStock" | "outOfStock">("");
  const [filterVisibility, setFilterVisibility] = useState<
    "" | "visible" | "hidden" | "pending"
  >("");

  const filteredItems = useMemo(() => {
    let list = items;
    const q = invSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [p.name, p.description ?? "", p.skuLabel, p.id].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (filterCategoryId) {
      list = list.filter(
        (p) =>
          p.categoryIds.includes(filterCategoryId) ||
          p.categoryId === filterCategoryId ||
          p.subcategoryId === filterCategoryId,
      );
    }
    if (filterStock === "inStock") {
      list = list.filter((p) => p.stock > 0);
    } else if (filterStock === "outOfStock") {
      list = list.filter((p) => p.stock <= 0);
    }
    if (filterVisibility === "visible") {
      list = list.filter(isProveedorProductVisibleInStore);
    } else if (filterVisibility === "hidden") {
      list = list.filter((p) => !p.pendingApproval && !p.isAvailable);
    } else if (filterVisibility === "pending") {
      list = list.filter((p) => p.pendingApproval);
    }
    return list;
  }, [items, invSearch, filterCategoryId, filterStock, filterVisibility]);

  const pg = usePagedSlice(filteredItems, pageSize, [
    filteredItems.length,
    filterCategoryId,
    invSearch,
    filterStock,
    filterVisibility,
    pageSize,
  ]);

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const parsed = await parseProveedorInventoryExcel(file);
      if (!parsed.ok) {
        toast.error(parsed.message);
        return;
      }

      const result = await importProveedorInventoryExcel(parsed.rows);
      if (result.updatedCount === 0 && result.errors.length > 0) {
        toast.error(result.errors[0]?.message ?? "No se pudo importar el inventario.");
        return;
      }

      await onInventoryUpdated();

      if (result.errors.length > 0) {
        toast.error(
          `Se actualizaron ${result.updatedCount} producto${result.updatedCount === 1 ? "" : "s"}. ${result.errors.length} fila${result.errors.length === 1 ? "" : "s"} con error.`,
        );
      } else {
        toast.success(
          `Se actualizaron ${result.updatedCount} producto${result.updatedCount === 1 ? "" : "s"}.`,
        );
      }
    } catch (err) {
      toast.error(formatSupplierPortalError(err));
    } finally {
      setImporting(false);
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        No hay productos en el inventario.
      </p>
    );
  }

  return (
    <div className={PROVEEDOR_TABLE_LIST_SHELL}>
      <ProveedorSectionProductFilter
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filteredCount={filteredItems.length}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        exportDisabled={filteredItems.length === 0}
        onExport={() => void exportProveedorInventoryExcel(filteredItems)}
        importDisabled={items.length === 0}
        importing={importing}
        fileInputRef={fileInputRef}
        onImportClick={() => fileInputRef.current?.click()}
        onImportFileChange={(e) => void handleImportFileChange(e)}
        invSearch={invSearch}
        setInvSearch={setInvSearch}
        filterCategoryId={filterCategoryId}
        setFilterCategoryId={setFilterCategoryId}
        categories={categories}
        filterStock={filterStock}
        setFilterStock={setFilterStock}
        filterVisibility={filterVisibility}
        setFilterVisibility={setFilterVisibility}
      >
        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
          {pg.slice.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              Ningún producto coincide con los filtros.
            </p>
          ) : (
            pg.slice.map((row) => (
              <div key={row.id} className="flex gap-3 px-4 py-3">
                <ProveedorProductThumb name={row.name} photoUrl={row.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {row.name}
                  </p>
                  <p className="text-xs text-gray-500">{row.skuLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {row.categoryName}
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm tabular-nums text-gray-700 dark:text-gray-300">
                      <span
                        className={`h-2 w-2 rounded-full ${proveedorStockDotClass(row.stock)}`}
                      />
                      Stock: {row.stock}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatMoney(row.price, row.currencyCode)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block data-table-wrap">
          <table className="data-table min-w-[44rem]">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Disponibilidad</th>
              </tr>
            </thead>
            <tbody>
              {pg.slice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                    Ningún producto coincide con los filtros.
                  </td>
                </tr>
              ) : (
                pg.slice.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <ProveedorProductThumb name={row.name} photoUrl={row.photoUrl} />
                    </td>
                    <td className="min-w-[12rem]">
                      <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.skuLabel}</p>
                    </td>
                    <td>
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {row.categoryName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatMoney(row.price, row.currencyCode)}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2 tabular-nums">
                        <span
                          className={`h-2 w-2 rounded-full ${proveedorStockDotClass(row.stock)}`}
                        />
                        {row.stock}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ProveedorSectionTablePagination
          page={pg.page}
          totalPages={pg.totalPages}
          total={pg.total}
          pageSize={pageSize}
          onPageChange={pg.setPage}
        />
      </ProveedorSectionProductFilter>
    </div>
  );
}
