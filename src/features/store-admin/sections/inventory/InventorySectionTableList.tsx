import { Package, Pencil, Trash2 } from "lucide-react";
import type {
  StoreCategoryDto,
  StoreProduct,
  StoreSupplierDto,
} from "@features/market/Dtos/storeCatalogTypes";
import { catalogDisplayPriceUsd } from "@features/market/logic/storeCatalogTypes";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { AdminPagination } from "../../components/AdminPagination";
import { AdminGhostButton } from "../../components/StoreAdminUi";
import {
  categoryDisplay,
  formatInventoryId,
  formatWhen,
  isVisibleInStore,
  productStock,
} from "../../logic/inventoryUtils";

export function InventorySectionTableList({
  pg,
  filteredProducts,
  products,
  suppliers,
  categories,
  setPhotoPreview,
  openEdit,
  setProductToRemove,
  setProductToApprove,
  setProductToRemoveFromCatalog,
}: {
  pg: {
    page: number;
    setPage: (p: number) => void;
    slice: StoreProduct[];
    total: number;
    totalPages: number;
  };
  filteredProducts: StoreProduct[];
  products: StoreProduct[];
  suppliers: StoreSupplierDto[];
  categories: StoreCategoryDto[];
  setPhotoPreview: (v: { src: string; title: string } | null) => void;
  openEdit: (p: StoreProduct) => void;
  setProductToRemove: (p: StoreProduct | null) => void;
  setProductToApprove: (p: StoreProduct | null) => void;
  setProductToRemoveFromCatalog: (p: StoreProduct | null) => void;
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/90 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-gray-700 dark:bg-gray-800/90 dark:text-slate-300">
              <th className="whitespace-nowrap px-4 py-3.5">Producto</th>
              <th className="whitespace-nowrap px-4 py-3.5">Categoría</th>
              <th className="whitespace-nowrap px-4 py-3.5">Precio</th>
              <th className="whitespace-nowrap px-4 py-3.5">Disponibilidad</th>
              <th className="whitespace-nowrap px-4 py-3.5">Última modificación</th>
              <th className="whitespace-nowrap px-4 py-3.5">Proveedor</th>
              <th className="whitespace-nowrap px-4 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {pg.slice.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-14 text-center text-gray-500 dark:text-gray-400"
                >
                  {filteredProducts.length === 0 && products.length > 0
                    ? "Ningún producto coincide con los filtros."
                    : "No hay productos para mostrar."}
                </td>
              </tr>
            ) : null}
            {pg.slice.map((p) => {
              const stock = productStock(p);
              const low = stock <= 12;
              const supplierLabel =
                suppliers.find((s) => s.id === p.supplierId)?.businessName ?? "—";
              const catLabel = categoryDisplay(p, categories);
              const thumbSrc = p.photoUrls[0] ?? "";
              return (
                <tr
                  key={p.id}
                  className="bg-white transition-colors hover:bg-gray-50/90 dark:bg-gray-900/40 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {thumbSrc ? (
                        <button
                          type="button"
                          title="Ampliar foto"
                          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
                          onClick={() =>
                            setPhotoPreview({ src: thumbSrc, title: p.name })
                          }
                        >
                          <ProtectedMediaImg
                            src={thumbSrc}
                            alt=""
                            wrapperClassName="h-full w-full"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                          <Package size={18} aria-hidden />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {formatInventoryId(p.id)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {catLabel}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-gray-900 dark:text-white">
                    {catalogDisplayPriceUsd(p.price)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${low ? "bg-red-500" : "bg-emerald-500"}`}
                        aria-hidden
                      />
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {stock} unidades
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-700 dark:text-gray-300">
                    {p.updatedAt ? formatWhen(p.updatedAt) : "—"}
                  </td>
                  <td className="max-w-[10rem] truncate px-4 py-4 text-gray-700 dark:text-gray-300">
                    {supplierLabel}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Editar producto"
                        onClick={() => openEdit(p)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar producto"
                        onClick={() => setProductToRemove(p)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                      {p.pendingApproval ? (
                        <AdminGhostButton
                          onClick={() => setProductToApprove(p)}
                        >
                          <span className="text-xs">Aprobar</span>
                        </AdminGhostButton>
                      ) : null}
                      {!p.pendingApproval && isVisibleInStore(p) ? (
                        <AdminGhostButton
                          onClick={() => setProductToRemoveFromCatalog(p)}
                        >
                          <span className="text-xs">Quitar catálogo</span>
                        </AdminGhostButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
        <AdminPagination
          page={pg.page}
          totalPages={pg.totalPages}
          totalItems={pg.total}
          onPageChange={pg.setPage}
          itemLabel="productos"
        />
      </div>
    </>
  );
}
