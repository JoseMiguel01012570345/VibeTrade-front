import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Download, Filter, ImagePlus, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import type {
  StoreCategoryDto,
  StoreProduct,
  StoreSupplierDto,
} from "@features/market/Dtos/storeCatalogTypes";
import { exportInventoryExcel } from "../../logic/inventoryUtils";
import { AdminGhostButton } from "../../components/StoreAdminUi";

const cardShell =
  "rounded-xl border border-gray-200/90 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900";

const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border-0 bg-[#0f6b4f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c5640] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b4f]/40";

export function InventorySectionFilter({
  children,
  productsCount,
  visibleInCatalog,
  supplierCount,
  showFilters,
  setShowFilters,
  filteredProducts,
  categories,
  suppliers,
  invSearch,
  setInvSearch,
  filterCategoryId,
  setFilterCategoryId,
  filterSupplierId,
  setFilterSupplierId,
  filterStock,
  setFilterStock,
  filterVisibility,
  setFilterVisibility,
  onAddProduct,
  onAddBanner,
}: {
  children: ReactNode;
  productsCount: number;
  visibleInCatalog: number;
  supplierCount: number;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  filteredProducts: StoreProduct[];
  categories: StoreCategoryDto[];
  suppliers: StoreSupplierDto[];
  invSearch: string;
  setInvSearch: (s: string) => void;
  filterCategoryId: string;
  setFilterCategoryId: (id: string) => void;
  filterSupplierId: string;
  setFilterSupplierId: (id: string) => void;
  filterStock: "" | "inStock" | "outOfStock";
  setFilterStock: (v: "" | "inStock" | "outOfStock") => void;
  filterVisibility: "" | "visible" | "hidden" | "pending";
  setFilterVisibility: (v: "" | "visible" | "hidden" | "pending") => void;
  onAddProduct: () => void;
  onAddBanner: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Gestión de Inventario
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <AdminGhostButton onClick={onAddBanner}>
            <ImagePlus size={16} aria-hidden />
            Añadir banner
          </AdminGhostButton>
          <button type="button" className={primaryBtnClass} onClick={onAddProduct}>
            <span className="text-lg leading-none">+</span>
            Agregar Producto
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={cardShell}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total productos
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {productsCount.toLocaleString("es")}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" aria-hidden />
            {visibleInCatalog} visibles en tienda
          </p>
        </div>
        <div className={cardShell}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Proveedores activos
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
            {supplierCount.toLocaleString("es")}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            Distribuidores autorizados
          </p>
        </div>
      </div>

      <section className={`${cardShell} overflow-hidden p-0`}>
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Listado de Inventario Total
          </h2>
          <div className="flex flex-wrap gap-2">
            <AdminGhostButton onClick={() => setShowFilters((v) => !v)}>
              <Filter size={16} aria-hidden />
              Filtros
            </AdminGhostButton>
            <AdminGhostButton
              onClick={() => {
                void exportInventoryExcel(
                  filteredProducts,
                  categories,
                  suppliers,
                ).catch(() => toast.error("No se pudo exportar el inventario."));
              }}
            >
              <Download size={16} aria-hidden />
              Exportar
            </AdminGhostButton>
          </div>
        </div>

        {showFilters ? (
          <div className="grid gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-gray-800 dark:bg-gray-950/40 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Buscar</span>
              <input
                id="inv-search"
                type="search"
                placeholder="Nombre, ID…"
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Categoría</span>
              <select
                id="inv-filter-cat"
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Proveedor</span>
              <select
                id="inv-filter-supplier"
                value={filterSupplierId}
                onChange={(e) => setFilterSupplierId(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Todos</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.businessName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Stock</span>
              <select
                id="inv-filter-stock"
                value={filterStock}
                onChange={(e) =>
                  setFilterStock(e.target.value as "" | "inStock" | "outOfStock")
                }
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Todos</option>
                <option value="inStock">Con stock</option>
                <option value="outOfStock">Sin stock</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">
                Visibilidad en tienda
              </span>
              <select
                id="inv-filter-visibility"
                value={filterVisibility}
                onChange={(e) =>
                  setFilterVisibility(
                    e.target.value as "" | "visible" | "hidden" | "pending",
                  )
                }
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Todos</option>
                <option value="visible">Visibles</option>
                <option value="hidden">Ocultos (aprobados)</option>
                <option value="pending">Pendiente de aprobación</option>
              </select>
            </label>
          </div>
        ) : null}

        {children}
      </section>
    </>
  );
}
