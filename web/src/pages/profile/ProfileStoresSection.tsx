import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import { readFileAsDataUrl } from "../../utils/media/dataUrl";
import {
  emptyStoreProductInput,
  emptyStoreServiceInput,
} from "../chat/domain/storeCatalogTypes";
import { SUGGESTED_CATEGORIES } from "./stores/constants";
import { OwnerStoreCard } from "./stores/OwnerStoreCard";
import { VisitorStoreSummaryCard } from "./stores/VisitorStoreSummaryCard";
import { ProductEditorModal } from "./stores/ProductEditorModal";
import { ServiceEditorModal } from "./stores/ServiceEditorModal";
import { StoreFormModal } from "./stores/StoreFormModal";
import { ownerStoreToFormValues, revokeIfBlob } from "./stores/helpers";

export function ProfileStoresSection({
  ownerUserId,
  canEdit = true,
}: {
  ownerUserId: string
  /** Si es false, solo enlaces a la tienda pública (perfil de otro usuario). */
  canEdit?: boolean
}) {
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

  const me = useAppStore((s) => s.me);
  const storeIdsKey = useMemo(
    () => myStores.map((b) => b.id).sort((a, b) => a.localeCompare(b)).join(","),
    [myStores],
  );

  /** Bootstrap deja `storeCatalogs` vacío; hidratar aquí para previews sin pasar por /store/:id. */
  useEffect(() => {
    if (myStores.length === 0 || !me.id) return;
    const missing = myStores.filter(
      (b) => useMarketStore.getState().storeCatalogs[b.id] === undefined,
    );
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      await Promise.all(
        missing.map(async (b) => {
          try {
            const data = await fetchStoreDetail(b.id, { userId: me.id });
            if (cancelled) return;
            useMarketStore.setState((s) => {
              if (s.storeCatalogs[b.id] !== undefined) return s;
              return {
                ...s,
                stores: { ...s.stores, [b.id]: data.store },
                storeCatalogs: { ...s.storeCatalogs, [b.id]: data.catalog },
              };
            });
          } catch {
            /* detalle opcional; la tarjeta sigue sin preview */
          }
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [storeIdsKey, me.id]);

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
  const [avatarDrafts, setAvatarDrafts] = useState<Record<string, string>>({});
  const avatarDraftsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    avatarDraftsRef.current = avatarDrafts;
  }, [avatarDrafts]);

  useEffect(
    () => () => {
      for (const url of Object.values(avatarDraftsRef.current)) {
        revokeIfBlob(url);
      }
    },
    [],
  );

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

  function onStoreAvatarPick(storeId: string) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      void (async () => {
        const input = e.currentTarget;
        const picked = input.files ? Array.from(input.files) : [];
        input.value = "";
        const file = picked[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          toast.error("Elegí un archivo de imagen.");
          return;
        }
        try {
          const dataUrl = await readFileAsDataUrl(file);
          setAvatarDrafts((prev) => {
            const oldDraft = prev[storeId];
            if (oldDraft) revokeIfBlob(oldDraft);
            return { ...prev, [storeId]: dataUrl };
          });
          toast.success("Revisá la imagen y tocá Guardar foto para confirmar.");
        } catch {
          toast.error("No se pudo leer la imagen.");
        }
      })();
    };
  }

  function saveStoreAvatar(storeId: string) {
    const draft = avatarDrafts[storeId];
    if (!draft) return;
    const badge = stores[storeId];
    if (!badge) return;
    const prev = badge.avatarUrl;
    if (updateOwnerStore(storeId, ownerUserId, { avatarUrl: draft })) {
      if (prev) revokeIfBlob(prev);
      setAvatarDrafts((p) => {
        const next = { ...p };
        delete next[storeId];
        return next;
      });
      toast.success("Imagen de tienda guardada");
    } else {
      revokeIfBlob(draft);
      setAvatarDrafts((p) => {
        const next = { ...p };
        delete next[storeId];
        return next;
      });
      toast.error("No se pudo guardar la imagen");
    }
  }

  function discardStoreAvatarDraft(storeId: string) {
    setAvatarDrafts((p) => {
      const url = p[storeId];
      if (url) revokeIfBlob(url);
      const next = { ...p };
      delete next[storeId];
      return next;
    });
  }

  if (!canEdit) {
    return (
      <div className="vt-card vt-card-pad">
        <div className="vt-h2">Tiendas</div>
        <p className="vt-muted mt-1.5 max-w-[640px] text-[13px] leading-snug">
          Tiendas públicas de este usuario: podés abrir cada una para ver catálogo, publicaciones y reels como cualquier
          visitante.
        </p>
        <div className="vt-divider my-3" />
        {myStores.length === 0 ?
          <p className="vt-muted text-[13px]">Este usuario no tiene tiendas vinculadas en la demo.</p>
        : <div className="flex flex-col gap-3">
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
                <VisitorStoreSummaryCard key={b.id} store={b} catalog={cat} joinedLabel={joined} />
              );
            })}
          </div>}
      </div>
    );
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
                avatarDisplayUrl={avatarDrafts[b.id] ?? b.avatarUrl}
                storeAvatarDirty={Boolean(avatarDrafts[b.id])}
                onEditDetails={() => setEditStoreId(b.id)}
                onRequestDeleteStore={() => {
                  if (
                    globalThis.confirm(
                      "¿Eliminar esta tienda y su catálogo? No se puede deshacer.",
                    )
                  ) {
                    if (deleteOwnerStore(b.id, ownerUserId)) {
                      setAvatarDrafts((p) => {
                        const u = p[b.id];
                        if (u) revokeIfBlob(u);
                        const next = { ...p };
                        delete next[b.id];
                        return next;
                      });
                      toast.success("Tienda eliminada");
                    } else toast.error("No se pudo eliminar");
                  }
                }}
                onAvatarFileChange={onStoreAvatarPick(b.id)}
                onSaveStoreAvatar={() => saveStoreAvatar(b.id)}
                onDiscardStoreAvatar={() => discardStoreAvatarDraft(b.id)}
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
