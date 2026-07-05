import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import {
  emptyStoreServiceInput,
} from "@features/market/logic/storeCatalogTypes";
import type {
  StoreCategoryDto,
  StoreSupplierDto,
} from "@features/market/Dtos/storeCatalogTypes";
import {
  deleteStoreProductApi,
  deleteStoreServiceApi,
  putStoreProduct,
  putStoreService,
} from "@features/market/api/marketPersistence";
import { ProductModalDetail } from "../components/ProductModalDetail";
import { ServiceEditorModal } from "@features/profile/components/stores/ServiceEditorModal";
import { ConfirmDeleteModal } from "@shared/components/ui/ConfirmDeleteModal";
import { useStoreCatalogMeta } from "@features/market/hooks/useStorePageDetail";

export type OwnerInventoryMeta = {
  categories: StoreCategoryDto[];
  suppliers: StoreSupplierDto[];
  onRefreshCategories: () => Promise<void>;
};

/**
 * Encapsula la gestión de catálogo del dueño (alta/edición/baja/publicación de
 * productos y servicios) + los modales de edición y confirmación. Extraído del
 * flujo de `StorePage` para reutilizarlo en las secciones del panel de la tienda.
 */
export function useOwnerStoreCatalog(
  storeId: string,
  ownerId: string,
  inventoryMeta?: OwnerInventoryMeta,
) {
  const catalog = useMarketStore((s) => s.storeCatalogs[storeId]);

  const addOwnerStoreProduct = useMarketStore((s) => s.addOwnerStoreProduct);
  const updateOwnerStoreProduct = useMarketStore(
    (s) => s.updateOwnerStoreProduct,
  );
  const removeOwnerStoreProduct = useMarketStore(
    (s) => s.removeOwnerStoreProduct,
  );
  const setOwnerStoreProductPublished = useMarketStore(
    (s) => s.setOwnerStoreProductPublished,
  );
  const addOwnerStoreService = useMarketStore((s) => s.addOwnerStoreService);
  const updateOwnerStoreService = useMarketStore(
    (s) => s.updateOwnerStoreService,
  );
  const removeOwnerStoreService = useMarketStore(
    (s) => s.removeOwnerStoreService,
  );
  const setOwnerStoreServicePublished = useMarketStore(
    (s) => s.setOwnerStoreServicePublished,
  );

  const { catalogCategories } = useStoreCatalogMeta();
  const catHints = catalogCategories;

  const [productCtx, setProductCtx] = useState<{ productId?: string } | null>(
    null,
  );
  const [serviceCtx, setServiceCtx] = useState<{ serviceId?: string } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<
    | null
    | { kind: "product"; productId: string }
    | { kind: "service"; serviceId: string }
  >(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const products = useMemo(() => catalog?.products ?? [], [catalog]);
  const services = useMemo(() => catalog?.services ?? [], [catalog]);

  const productEditing =
    productCtx?.productId && catalog
      ? catalog.products.find((p) => p.id === productCtx.productId)
      : undefined;
  const serviceEditing =
    serviceCtx?.serviceId && catalog
      ? catalog.services.find((s) => s.id === serviceCtx.serviceId)
      : undefined;

  function togglePublishProduct(productId: string, published: boolean) {
    if (!setOwnerStoreProductPublished(storeId, ownerId, productId, published))
      return;
    const p = useMarketStore
      .getState()
      .storeCatalogs[storeId]?.products.find((x) => x.id === productId);
    if (p) void putStoreProduct(storeId, p);
    toast.success(published ? "Producto publicado" : "Producto oculto");
  }

  function togglePublishService(serviceId: string, published: boolean) {
    if (!setOwnerStoreServicePublished(storeId, ownerId, serviceId, published))
      return;
    const s = useMarketStore
      .getState()
      .storeCatalogs[storeId]?.services.find((x) => x.id === serviceId);
    if (s) void putStoreService(storeId, s);
    toast.success(published ? "Servicio publicado" : "Servicio oculto");
  }

  const modals = (
    <>
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === "product"
            ? "Eliminar producto"
            : "Eliminar servicio"
        }
        message={
          deleteTarget?.kind === "product"
            ? "¿Quitar este producto del catálogo de la tienda?"
            : "¿Quitar este servicio del catálogo de la tienda?"
        }
        confirmBusy={deleteBusy}
        onCancel={() => {
          if (deleteBusy) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget || deleteBusy) return;
          const target = deleteTarget;
          setDeleteBusy(true);
          void (async () => {
            try {
              if (target.kind === "product") {
                try {
                  await deleteStoreProductApi(storeId, target.productId);
                } catch {
                  toast.error("No se pudo eliminar en el servidor. Reintenta.");
                  return;
                }
                if (!removeOwnerStoreProduct(storeId, ownerId, target.productId))
                  return;
                toast.success("Producto quitado");
                setDeleteTarget(null);
              } else {
                try {
                  await deleteStoreServiceApi(storeId, target.serviceId);
                } catch {
                  toast.error("No se pudo eliminar en el servidor. Reintenta.");
                  return;
                }
                if (!removeOwnerStoreService(storeId, ownerId, target.serviceId))
                  return;
                toast.success("Servicio quitado");
                setDeleteTarget(null);
              }
            } finally {
              setDeleteBusy(false);
            }
          })();
        }}
      />

      {productCtx !== null && inventoryMeta ? (
        <ProductModalDetail
          key={`${storeId}-product-${productCtx.productId ?? "new"}`}
          show
          storeId={storeId}
          editProduct={productEditing}
          products={products}
          categories={inventoryMeta.categories}
          suppliers={inventoryMeta.suppliers}
          onRefreshCategories={inventoryMeta.onRefreshCategories}
          onClose={() => setProductCtx(null)}
          onSave={async (input) => {
            try {
              if (productCtx.productId) {
                const ok = updateOwnerStoreProduct(
                  storeId,
                  ownerId,
                  productCtx.productId,
                  input,
                );
                if (!ok) {
                  toast.error("No se pudo actualizar el producto.");
                  return false;
                }
                const p = useMarketStore
                  .getState()
                  .storeCatalogs[storeId]?.products.find(
                    (x) => x.id === productCtx.productId,
                  );
                if (p) await putStoreProduct(storeId, p);
                toast.success("Producto actualizado");
                return true;
              }
              const pid = addOwnerStoreProduct(storeId, ownerId, input);
              if (pid) {
                const p = useMarketStore
                  .getState()
                  .storeCatalogs[storeId]?.products.find((x) => x.id === pid);
                if (p) await putStoreProduct(storeId, p);
                toast.success("Producto añadido");
                return true;
              }
              toast.error(
                "No se pudo añadir el producto. Revisa que seas el dueño o recarga la tienda.",
              );
              return false;
            } catch {
              toast.error(
                "No se pudo guardar el producto en el servidor. Reintenta.",
              );
              return false;
            }
          }}
        />
      ) : null}

      {serviceCtx !== null ? (
        <ServiceEditorModal
          key={`${storeId}-service-${serviceCtx.serviceId ?? "new"}`}
          open
          title={serviceEditing ? "Editar servicio" : "Añadir servicio"}
          categoryOptions={catHints}
          initial={
            serviceEditing
              ? {
                  published: serviceEditing.published !== false,
                  category: serviceEditing.category,
                  nombreServicio: serviceEditing.nombreServicio,
                  
                  descripcion: serviceEditing.descripcion,
                  riesgos: { ...serviceEditing.riesgos },
                  incluye: serviceEditing.incluye,
                  noIncluye: serviceEditing.noIncluye,
                  dependencias: { ...serviceEditing.dependencias },
                  entregables: serviceEditing.entregables,
                  garantias: { ...serviceEditing.garantias },
                  propIntelectual: serviceEditing.propIntelectual,
                  photoUrls: [...(serviceEditing.photoUrls ?? [])],
                  customFields: serviceEditing.customFields.length
                    ? serviceEditing.customFields
                    : [],
                }
              : emptyStoreServiceInput()
          }
          onClose={() => setServiceCtx(null)}
          onSave={(input) => {
            void (async () => {
              try {
                if (serviceCtx.serviceId) {
                  const ok = updateOwnerStoreService(
                    storeId,
                    ownerId,
                    serviceCtx.serviceId,
                    input,
                  );
                  if (!ok) {
                    toast.error("No se pudo actualizar el servicio.");
                    return;
                  }
                  const svc = useMarketStore
                    .getState()
                    .storeCatalogs[storeId]?.services.find(
                      (x) => x.id === serviceCtx.serviceId,
                    );
                  if (svc) await putStoreService(storeId, svc);
                  toast.success("Servicio actualizado");
                  setServiceCtx(null);
                } else {
                  const newId = addOwnerStoreService(storeId, ownerId, input);
                  if (newId) {
                    const svc = useMarketStore
                      .getState()
                      .storeCatalogs[storeId]?.services.find(
                        (x) => x.id === newId,
                      );
                    if (svc) await putStoreService(storeId, svc);
                    toast.success("Servicio añadido");
                    setServiceCtx(null);
                  } else {
                    toast.error(
                      "No se pudo añadir el servicio. Revisa que seas el dueño o recarga la tienda.",
                    );
                  }
                }
              } catch {
                toast.error(
                  "No se pudo guardar el servicio en el servidor. Reintenta.",
                );
              }
            })();
          }}
        />
      ) : null}
    </>
  );

  return {
    catalog,
    products,
    services,
    openAddProduct: () => setProductCtx({}),
    openEditProduct: (productId: string) => setProductCtx({ productId }),
    requestDeleteProduct: (productId: string) =>
      setDeleteTarget({ kind: "product", productId }),
    togglePublishProduct,
    openAddService: () => setServiceCtx({}),
    openEditService: (serviceId: string) => setServiceCtx({ serviceId }),
    requestDeleteService: (serviceId: string) =>
      setDeleteTarget({ kind: "service", serviceId }),
    togglePublishService,
    modals,
  };
}
