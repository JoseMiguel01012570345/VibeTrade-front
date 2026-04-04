import { type ChangeEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useMarketStore } from "../../app/store/useMarketStore";
import type { StoreBadge } from "../../app/store/marketStoreTypes";
import {
  emptyStoreProductInput,
  emptyStoreServiceInput,
} from "../chat/domain/storeCatalogTypes";
import { SUGGESTED_CATEGORIES } from "./stores/constants";
import { OwnerStoreCard } from "./stores/OwnerStoreCard";
import { ProductEditorModal } from "./stores/ProductEditorModal";
import { ServiceEditorModal } from "./stores/ServiceEditorModal";
import { StoreFormModal } from "./stores/StoreFormModal";
import { ownerStoreToFormValues, revokeIfBlob } from "./stores/helpers";

export function ProfileStoresSection({ ownerUserId }: { ownerUserId: string }) {
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const createOwnerStore = useMarketStore((s) => s.createOwnerStore);
  const updateOwnerStore = useMarketStore((s) => s.updateOwnerStore);
  const deleteOwnerStore = useMarketStore((s) => s.deleteOwnerStore);
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

  const myStores = useMemo(
    () => Object.values(stores).filter((b) => b.ownerUserId === ownerUserId),
    [stores, ownerUserId],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editStoreId, setEditStoreId] = useState<string | null>(null);
  const [productCtx, setProductCtx] = useState<{
    storeId: string;
    productId?: string;
  } | null>(null);
  const [serviceCtx, setServiceCtx] = useState<{
    storeId: string;
    serviceId?: string;
  } | null>(null);

  const editingBadge = editStoreId ? stores[editStoreId] : undefined;
  const editingCat = editStoreId ? storeCatalogs[editStoreId] : undefined;

  const productStoreId = productCtx?.storeId;
  const productEditing =
    productStoreId && productCtx?.productId
      ? storeCatalogs[productStoreId]?.products.find(
          (p) => p.id === productCtx.productId,
        )
      : undefined;

  const serviceStoreId = serviceCtx?.storeId;
  const serviceEditing =
    serviceStoreId && serviceCtx?.serviceId
      ? storeCatalogs[serviceStoreId]?.services.find(
          (x) => x.id === serviceCtx.serviceId,
        )
      : undefined;

  function makeAvatarHandler(b: StoreBadge) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const picked = input.files ? Array.from(input.files) : [];
      input.value = "";
      const file = picked[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Elegí un archivo de imagen.");
        return;
      }
      const url = URL.createObjectURL(file);
      const prev = b.avatarUrl;
      if (updateOwnerStore(b.id, ownerUserId, { avatarUrl: url })) {
        if (prev) revokeIfBlob(prev);
        toast.success("Imagen de tienda actualizada");
      } else {
        revokeIfBlob(url);
        toast.error("No se pudo guardar la imagen");
      }
    };
  }

  return (
    <div className="vt-card vt-card-pad">
      <datalist id="store-cat-hints">
        {SUGGESTED_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="vt-h2">Mis tiendas</div>
          <p className="vt-muted mt-1.5 max-w-[640px] text-[13px] leading-snug">
            Podés configurar una o más tiendas: nombre, categorías, descripción
            del catálogo, estado de verificación (solo puede validarlo soporte),
            fecha de alta en la plataforma y transporte. En cada tienda añadí
            productos y servicios con el detalle del perfil de negocio.
          </p>
        </div>
        <button
          type="button"
          className="vt-btn vt-btn-primary inline-flex items-center gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={18} /> Nueva tienda
        </button>
      </div>
      <div className="vt-divider my-3" />

      {myStores.length === 0 ? (
        <p className="vt-muted text-[13px]">
          Todavía no creaste tiendas. Usá «Nueva tienda» para empezar.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {myStores.map((b) => {
            const cat = storeCatalogs[b.id];
            const joined = cat
              ? new Intl.DateTimeFormat("es", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(cat.joinedAt)
              : "—";
            return (
              <OwnerStoreCard
                key={b.id}
                store={b}
                catalog={cat}
                joinedLabel={joined}
                onEditDetails={() => setEditStoreId(b.id)}
                onRequestDeleteStore={() => {
                  if (
                    globalThis.confirm(
                      "¿Eliminar esta tienda y su catálogo? No se puede deshacer.",
                    )
                  ) {
                    if (deleteOwnerStore(b.id, ownerUserId))
                      toast.success("Tienda eliminada");
                    else toast.error("No se pudo eliminar");
                  }
                }}
                onAvatarFileChange={makeAvatarHandler(b)}
                onAddProduct={() => setProductCtx({ storeId: b.id })}
                onEditProduct={(productId) =>
                  setProductCtx({ storeId: b.id, productId })
                }
                onRemoveProduct={(productId) => {
                  if (removeOwnerStoreProduct(b.id, ownerUserId, productId))
                    toast.success("Producto quitado");
                  else toast.error("No se pudo quitar");
                }}
                onToggleProductPublished={(productId, published) => {
                  if (
                    setOwnerStoreProductPublished(
                      b.id,
                      ownerUserId,
                      productId,
                      published,
                    )
                  ) {
                    toast.success(
                      published
                        ? "Producto publicado en la tienda"
                        : "Producto oculto de la tienda",
                    );
                  } else {
                    toast.error("No se pudo actualizar");
                  }
                }}
                onAddService={() => setServiceCtx({ storeId: b.id })}
                onEditService={(serviceId) =>
                  setServiceCtx({ storeId: b.id, serviceId })
                }
                onRemoveService={(serviceId) => {
                  if (removeOwnerStoreService(b.id, ownerUserId, serviceId))
                    toast.success("Servicio quitado");
                  else toast.error("No se pudo quitar");
                }}
              />
            );
          })}
        </div>
      )}

      {createOpen ? (
        <StoreFormModal
          key="create-store"
          open
          title="Nueva tienda"
          initial={{
            name: "",
            categories: [],
            categoryPitch: "",
            transportIncluded: false,
          }}
          onClose={() => setCreateOpen(false)}
          onSave={(v) => {
            const id = createOwnerStore(ownerUserId, v);
            if (id) toast.success("Tienda creada");
            else toast.error("No se pudo crear");
          }}
        />
      ) : null}

      {editingBadge && editingCat && editStoreId ? (
        <StoreFormModal
          key={`edit-store-${editStoreId}`}
          open
          title="Editar tienda"
          initial={ownerStoreToFormValues(editingBadge, editingCat.pitch)}
          onClose={() => setEditStoreId(null)}
          onSave={(v) => {
            if (updateOwnerStore(editStoreId, ownerUserId, v))
              toast.success("Tienda actualizada");
            else toast.error("No se pudo guardar");
            setEditStoreId(null);
          }}
        />
      ) : null}

      {productCtx ? (
        <ProductEditorModal
          key={`${productCtx.storeId}-${productCtx.productId ?? "new"}`}
          open
          title={productEditing ? "Editar producto" : "Añadir producto"}
          initial={
            productEditing
              ? {
                  category: productEditing.category,
                  name: productEditing.name,
                  model: productEditing.model,
                  shortDescription: productEditing.shortDescription,
                  mainBenefit: productEditing.mainBenefit,
                  technicalSpecs: productEditing.technicalSpecs,
                  condition: productEditing.condition,
                  price: productEditing.price,
                  taxesShippingInstall: productEditing.taxesShippingInstall,
                  availability: productEditing.availability,
                  warrantyReturn: productEditing.warrantyReturn,
                  contentIncluded: productEditing.contentIncluded,
                  usageConditions: productEditing.usageConditions,
                  photoUrls: productEditing.photoUrls,
                  published: productEditing.published,
                  customFields: productEditing.customFields.length
                    ? productEditing.customFields
                    : [],
                }
              : emptyStoreProductInput()
          }
          onClose={() => setProductCtx(null)}
          onSave={(input) => {
            if (productCtx.productId) {
              updateOwnerStoreProduct(
                productCtx.storeId,
                ownerUserId,
                productCtx.productId,
                input,
              );
              toast.success("Producto actualizado");
            } else {
              addOwnerStoreProduct(productCtx.storeId, ownerUserId, input);
              toast.success("Producto añadido");
            }
          }}
        />
      ) : null}

      {serviceCtx ? (
        <ServiceEditorModal
          key={`${serviceCtx.storeId}-${serviceCtx.serviceId ?? "new"}`}
          open
          title={serviceEditing ? "Editar servicio" : "Añadir servicio"}
          initial={
            serviceEditing
              ? {
                  category: serviceEditing.category,
                  tipoServicio: serviceEditing.tipoServicio,
                  descripcion: serviceEditing.descripcion,
                  riesgos: { ...serviceEditing.riesgos },
                  incluye: serviceEditing.incluye,
                  noIncluye: serviceEditing.noIncluye,
                  dependencias: { ...serviceEditing.dependencias },
                  entregables: serviceEditing.entregables,
                  garantias: { ...serviceEditing.garantias },
                  propIntelectual: serviceEditing.propIntelectual,
                  customFields: serviceEditing.customFields.length
                    ? serviceEditing.customFields
                    : [],
                }
              : emptyStoreServiceInput()
          }
          onClose={() => setServiceCtx(null)}
          onSave={(input) => {
            if (serviceCtx.serviceId) {
              updateOwnerStoreService(
                serviceCtx.storeId,
                ownerUserId,
                serviceCtx.serviceId,
                input,
              );
              toast.success("Servicio actualizado");
            } else {
              addOwnerStoreService(serviceCtx.storeId, ownerUserId, input);
              toast.success("Servicio añadido");
            }
          }}
        />
      ) : null}
    </div>
  );
}
