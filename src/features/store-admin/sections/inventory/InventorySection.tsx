import { useMemo, useState } from "react";
import { CeButton, CeModal, CeSpinner } from "@shared/components/ui";
import { toast } from "sonner";
import type {
  StoreCategoryDto,
  StoreProduct,
  StoreSupplierDto,
} from "@features/market/Dtos/storeCatalogTypes";
import {
  approveStoreProduct,
  removeStoreProductFromCatalog,
} from "@features/market/api/storeInventoryApi";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { ConfirmModal } from "@shared/components/ui/ConfirmModal";
import {
  DEFAULT_ADMIN_PAGE_SIZE,
  usePagedSlice,
} from "../../logic/usePagedSlice";
import {
  formatInventoryId,
  isVisibleInStore,
  productStock,
} from "../../logic/inventoryUtils";
import { InventorySectionFilter } from "./InventorySectionFilter";
import { InventorySectionTableList } from "./InventorySectionTableList";
import { StoreBannerLibraryModal } from "./StoreBannerLibraryModal";

export function InventorySection({
  storeId,
  products,
  categories,
  suppliers,
  isLoading,
  onRefresh,
  onAdd,
  onEdit,
  onRemove,
}: {
  storeId: string;
  products: StoreProduct[];
  categories: StoreCategoryDto[];
  suppliers: StoreSupplierDto[];
  isLoading?: boolean;
  onRefresh: () => Promise<void>;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [invSearch, setInvSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [filterStock, setFilterStock] = useState<"" | "inStock" | "outOfStock">(
    "",
  );
  const [filterVisibility, setFilterVisibility] = useState<
    "" | "visible" | "hidden" | "pending"
  >("");
  const [productToApprove, setProductToApprove] = useState<StoreProduct | null>(
    null,
  );
  const [productToRemoveFromCatalog, setProductToRemoveFromCatalog] =
    useState<StoreProduct | null>(null);
  const [listPhotoPreview, setListPhotoPreview] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const filteredProducts = useMemo(() => {
    let list = products;
    const q = invSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [p.name, p.model ?? "", formatInventoryId(p.id)]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (filterCategoryId) {
      list = list.filter(
        (p) =>
          p.categoryIds?.includes(filterCategoryId) ||
          p.categoryId === filterCategoryId ||
          p.subcategoryId === filterCategoryId,
      );
    }
    if (filterSupplierId) {
      list = list.filter((p) => p.supplierId === filterSupplierId);
    }
    if (filterStock === "inStock") {
      list = list.filter((p) => productStock(p) > 0);
    } else if (filterStock === "outOfStock") {
      list = list.filter((p) => productStock(p) <= 0);
    }
    if (filterVisibility === "visible") {
      list = list.filter(isVisibleInStore);
    } else if (filterVisibility === "hidden") {
      list = list.filter((p) => !p.pendingApproval && !p.published);
    } else if (filterVisibility === "pending") {
      list = list.filter((p) => p.pendingApproval);
    }
    return list;
  }, [
    products,
    invSearch,
    filterCategoryId,
    filterSupplierId,
    filterStock,
    filterVisibility,
  ]);

  const pg = usePagedSlice(filteredProducts, DEFAULT_ADMIN_PAGE_SIZE, [
    filteredProducts.length,
    filterCategoryId,
    filterSupplierId,
    invSearch,
    filterStock,
    filterVisibility,
  ]);

  const visibleInCatalog = useMemo(
    () => products.filter(isVisibleInStore).length,
    [products],
  );

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.active).length,
    [suppliers],
  );

  async function executeApproveProduct() {
    if (!productToApprove) return;
    setActionBusy(true);
    try {
      await approveStoreProduct(storeId, productToApprove.id);
      setProductToApprove(null);
      await onRefresh();
      toast.success("Producto aprobado.");
    } catch {
      toast.error("No se pudo aprobar el producto.");
    } finally {
      setActionBusy(false);
    }
  }

  async function executeRemoveFromCatalog() {
    if (!productToRemoveFromCatalog) return;
    setActionBusy(true);
    try {
      await removeStoreProductFromCatalog(
        storeId,
        productToRemoveFromCatalog.id,
      );
      setProductToRemoveFromCatalog(null);
      await onRefresh();
      toast.success("Producto quitado del catálogo.");
    } catch {
      toast.error("No se pudo quitar el producto del catálogo.");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="relative min-h-[240px] space-y-6">
      {isLoading ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[#FDFCF9]/85 backdrop-blur-sm dark:bg-gray-950/70"
          aria-busy="true"
          aria-live="polite"
        >
          <CeSpinner size="lg" className="text-[#0f6b4f]" aria-hidden />
        </div>
      ) : null}

      <InventorySectionFilter
        productsCount={products.length}
        visibleInCatalog={visibleInCatalog}
        supplierCount={activeSuppliers}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filteredProducts={filteredProducts}
        categories={categories}
        suppliers={suppliers}
        invSearch={invSearch}
        setInvSearch={setInvSearch}
        filterCategoryId={filterCategoryId}
        setFilterCategoryId={setFilterCategoryId}
        filterSupplierId={filterSupplierId}
        setFilterSupplierId={setFilterSupplierId}
        filterStock={filterStock}
        setFilterStock={setFilterStock}
        filterVisibility={filterVisibility}
        setFilterVisibility={setFilterVisibility}
        onAddProduct={onAdd}
        onAddBanner={() => setBannerModalOpen(true)}
      >
        <InventorySectionTableList
          pg={pg}
          filteredProducts={filteredProducts}
          products={products}
          suppliers={suppliers}
          categories={categories}
          setPhotoPreview={setListPhotoPreview}
          openEdit={(p) => onEdit(p.id)}
          setProductToRemove={(p) => {
            if (p) onRemove(p.id);
          }}
          setProductToApprove={setProductToApprove}
          setProductToRemoveFromCatalog={setProductToRemoveFromCatalog}
        />
      </InventorySectionFilter>

      <StoreBannerLibraryModal
        show={bannerModalOpen}
        storeId={storeId}
        onClose={() => setBannerModalOpen(false)}
      />

      <CeModal
        show={listPhotoPreview !== null}
        onClose={() => setListPhotoPreview(null)}
        title={listPhotoPreview?.title ?? "Vista previa"}
        size="4xl"
        bodyClassName="pt-2 overflow-visible max-h-none"
        footer={
          <CeButton color="gray" outline onClick={() => setListPhotoPreview(null)}>
            Cerrar
          </CeButton>
        }
      >
        {listPhotoPreview ? (
          <ProtectedMediaImg
            src={listPhotoPreview.src}
            alt=""
            wrapperClassName="mx-auto max-h-[min(80vh,880px)] w-full overflow-hidden rounded-lg"
            className="mx-auto max-h-[min(80vh,880px)] w-full object-contain"
          />
        ) : null}
      </CeModal>

      <ConfirmModal
        open={productToApprove !== null}
        title="Aprobar producto"
        message={`¿Aprobar ${productToApprove?.name ?? "este producto"}? Pasará a visible en el catálogo (según stock y disponibilidad).`}
        confirmLabel="Aprobar"
        confirmBusy={actionBusy}
        onCancel={() => {
          if (!actionBusy) setProductToApprove(null);
        }}
        onConfirm={() => void executeApproveProduct()}
      />

      <ConfirmModal
        open={productToRemoveFromCatalog !== null}
        title="Quitar del catálogo"
        message={`El producto ${productToRemoveFromCatalog?.name ?? ""} dejará de mostrarse en el catálogo público. No se elimina; puedes volver a marcarlo visible editando el producto.`}
        confirmLabel="Quitar del catálogo"
        confirmBusy={actionBusy}
        onCancel={() => {
          if (!actionBusy) setProductToRemoveFromCatalog(null);
        }}
        onConfirm={() => void executeRemoveFromCatalog()}
      />
    </div>
  );
}
