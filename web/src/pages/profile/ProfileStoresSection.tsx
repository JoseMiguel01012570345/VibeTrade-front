import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { UploadBlockingOverlay } from "../../components/UploadBlockingOverlay";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import { mediaApiUrl, uploadMedia } from "../../utils/media/mediaClient";
import {
  emptyStoreProductInput,
  emptyStoreServiceInput,
} from "../chat/domain/storeCatalogTypes";
import {
  DEFAULT_CATALOG_CATEGORIES,
  fetchCatalogCategories,
} from "../../utils/market/fetchCatalogCategories";
import { OwnerStoreCard } from "./stores/OwnerStoreCard";
import { VisitorStoreSummaryCard } from "./stores/VisitorStoreSummaryCard";
import { ProductEditorModal } from "./stores/ProductEditorModal";
import { ServiceEditorModal } from "./stores/ServiceEditorModal";
import { StoreFormModal } from "./stores/StoreFormModal";
import { ownerStoreToFormValues, revokeIfBlob } from "./stores/helpers";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";

export function ProfileStoresSection({
  ownerUserId,
  canEdit = true,
}: {
  ownerUserId: string;
  /** Si es false, solo enlaces a la tienda pública (perfil de otro usuario). */
  canEdit?: boolean;
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
  const setOwnerStoreServicePublished = useMarketStore(
    (s) => s.setOwnerStoreServicePublished,
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
    () =>
      myStores
        .map((b) => b.id)
        .sort((a, b) => a.localeCompare(b))
        .join(","),
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
  const [storeAvatarUploadBusy, setStoreAvatarUploadBusy] = useState(false);
  const [storesReloadBusy, setStoresReloadBusy] = useState(false);
  const [catalogReloadBusyId, setCatalogReloadBusyId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<
    | null
    | { kind: "store"; storeId: string; storeName: string }
    | { kind: "product"; storeId: string; productId: string; storeName: string }
    | { kind: "service"; storeId: string; serviceId: string; storeName: string }
  >(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<string[]>(() => [
    ...DEFAULT_CATALOG_CATEGORIES,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cats = await fetchCatalogCategories();
        if (!cancelled && cats.length > 0) setCatalogCategories(cats);
      } catch {
        /* DEFAULT_CATALOG_CATEGORIES */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        setStoreAvatarUploadBusy(true);
        try {
          const uploaded = await uploadMedia(file);
          const url = mediaApiUrl(uploaded.id);
          setAvatarDrafts((prev) => {
            const oldDraft = prev[storeId];
            if (oldDraft) revokeIfBlob(oldDraft);
            return { ...prev, [storeId]: url };
          });
          toast.success("Revisá la imagen y tocá Guardar foto para confirmar.");
        } catch (err) {
          const msg =
            err instanceof Error && err.message
              ? err.message
              : "No se pudo subir la imagen.";
          toast.error(msg);
        } finally {
          setStoreAvatarUploadBusy(false);
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

  async function reloadStoreCatalog(storeId: string) {
    if (!me.id) return;
    setCatalogReloadBusyId(storeId);
    try {
      const data = await fetchStoreDetail(storeId, { userId: me.id });
      useMarketStore.setState((s) => ({
        ...s,
        stores: { ...s.stores, [storeId]: data.store },
        storeCatalogs: { ...s.storeCatalogs, [storeId]: data.catalog },
      }));
      toast.success("Catálogo actualizado");
    } catch {
      toast.error("No se pudo actualizar el catálogo");
    } finally {
      setCatalogReloadBusyId(null);
    }
  }

  async function reloadAllMyStores() {
    if (myStores.length === 0 || !me.id) return;
    setStoresReloadBusy(true);
    try {
      const pairs = await Promise.all(
        myStores.map(async (b) => {
          const data = await fetchStoreDetail(b.id, { userId: me.id });
          return [b.id, data] as const;
        }),
      );
      useMarketStore.setState((s) => {
        const nextStores = { ...s.stores };
        const nextCats = { ...s.storeCatalogs };
        for (const [id, data] of pairs) {
          nextStores[id] = data.store;
          nextCats[id] = data.catalog;
        }
        return { ...s, stores: nextStores, storeCatalogs: nextCats };
      });
      toast.success("Tiendas actualizadas");
    } catch {
      toast.error("No se pudieron actualizar las tiendas");
    } finally {
      setStoresReloadBusy(false);
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="vt-h2">Tiendas</div>
          <button
            type="button"
            className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
            disabled={storesReloadBusy || myStores.length === 0}
            title="Recargar todas las tiendas desde el servidor"
            aria-label="Recargar todas las tiendas"
            onClick={() => void reloadAllMyStores()}
          >
            <RefreshCw
              size={14}
              className={storesReloadBusy ? "animate-spin" : ""}
              aria-hidden
            />
            Recargar
          </button>
        </div>
        <p className="vt-muted mt-1.5 max-w-[640px] text-[13px] leading-snug">
          Tiendas públicas de este usuario: podés abrir cada una para ver
          catálogo, publicaciones y reels como cualquier visitante.
        </p>
        <div className="vt-divider my-3" />
        {myStores.length === 0 ? (
          <p className="vt-muted text-[13px]">
            Este usuario no tiene tiendas vinculadas en la demo.
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
                <VisitorStoreSummaryCard
                  key={b.id}
                  store={b}
                  catalog={cat}
                  joinedLabel={joined}
                  onReloadCatalog={() => void reloadStoreCatalog(b.id)}
                  catalogReloadBusy={catalogReloadBusyId === b.id}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <UploadBlockingOverlay
        active={storeAvatarUploadBusy}
        message="Subiendo imagen de tienda…"
      />
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === "store"
            ? "Eliminar tienda"
            : deleteTarget?.kind === "product"
              ? "Eliminar producto"
              : deleteTarget?.kind === "service"
                ? "Eliminar servicio"
                : "Eliminar"
        }
        message={
          deleteTarget?.kind === "store"
            ? `¿Eliminar la tienda «${deleteTarget.storeName}» y su catálogo?`
            : deleteTarget?.kind === "product"
              ? `¿Eliminar este producto de la tienda «${deleteTarget.storeName}»?`
              : deleteTarget?.kind === "service"
                ? `¿Eliminar este servicio de la tienda «${deleteTarget.storeName}»?`
                : "¿Confirmás eliminar?"
        }
        confirmBusy={deleteBusy}
        onCancel={() => {
          if (deleteBusy) return;
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteBusy) return;
          setDeleteBusy(true);
          try {
            if (deleteTarget.kind === "store") {
              const ok = deleteOwnerStore(deleteTarget.storeId, ownerUserId);
              if (ok) {
                setAvatarDrafts((p) => {
                  const u = p[deleteTarget.storeId];
                  if (u) revokeIfBlob(u);
                  const next = { ...p };
                  delete next[deleteTarget.storeId];
                  return next;
                });
                toast.success("Tienda eliminada");
                setDeleteTarget(null);
              } else toast.error("No se pudo eliminar");
              return;
            }
            if (deleteTarget.kind === "product") {
              const ok = removeOwnerStoreProduct(
                deleteTarget.storeId,
                ownerUserId,
                deleteTarget.productId,
              );
              if (ok) {
                toast.success("Producto quitado");
                setDeleteTarget(null);
              } else toast.error("No se pudo quitar");
              return;
            }
            if (deleteTarget.kind === "service") {
              const ok = removeOwnerStoreService(
                deleteTarget.storeId,
                ownerUserId,
                deleteTarget.serviceId,
              );
              if (ok) {
                toast.success("Servicio quitado");
                setDeleteTarget(null);
              } else toast.error("No se pudo quitar");
            }
          } finally {
            setDeleteBusy(false);
          }
        }}
      />
      <div className="vt-card vt-card-pad">
        <datalist id="store-cat-hints">
          {catalogCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="vt-h2">Mis tiendas</div>
              <button
                type="button"
                className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
                disabled={storesReloadBusy || myStores.length === 0}
                title="Recargar todas las tiendas desde el servidor"
                aria-label="Recargar todas las tiendas"
                onClick={() => void reloadAllMyStores()}
              >
                <RefreshCw
                  size={14}
                  className={storesReloadBusy ? "animate-spin" : ""}
                  aria-hidden
                />
                Recargar
              </button>
            </div>
            <p className="vt-muted mt-1.5 max-w-[640px] text-[13px] leading-snug">
              Podés configurar una o más tiendas: nombre, categorías,
              descripción del catálogo, estado de verificación (solo puede
              validarlo soporte), fecha de alta en la plataforma y transporte.
              En cada tienda añadí productos y servicios con el detalle del
              perfil de negocio.
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
                  catalogReloadBusy={catalogReloadBusyId === b.id}
                  onReloadStoreCatalog={() => void reloadStoreCatalog(b.id)}
                  onEditDetails={() => setEditStoreId(b.id)}
                  onRequestDeleteStore={() => {
                    setDeleteTarget({
                      kind: "store",
                      storeId: b.id,
                      storeName: b.name,
                    });
                  }}
                  onAvatarFileChange={onStoreAvatarPick(b.id)}
                  onSaveStoreAvatar={() => saveStoreAvatar(b.id)}
                  onDiscardStoreAvatar={() => discardStoreAvatarDraft(b.id)}
                  onAddProduct={() => setProductCtx({ storeId: b.id })}
                  onEditProduct={(productId) =>
                    setProductCtx({ storeId: b.id, productId })
                  }
                  onRemoveProduct={(productId) => {
                    setDeleteTarget({
                      kind: "product",
                      storeId: b.id,
                      productId,
                      storeName: b.name,
                    });
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
                    setDeleteTarget({
                      kind: "service",
                      storeId: b.id,
                      serviceId,
                      storeName: b.name,
                    });
                  }}
                  onToggleServicePublished={(serviceId, published) => {
                    if (
                      setOwnerStoreServicePublished(
                        b.id,
                        ownerUserId,
                        serviceId,
                        published,
                      )
                    ) {
                      toast.success(
                        published
                          ? "Servicio publicado en la tienda"
                          : "Servicio oculto de la tienda",
                      );
                    } else {
                      toast.error("No se pudo actualizar");
                    }
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
              if (id) {
                toast.success("Tienda creada");
                return true;
              }
              toast.error(
                "No se pudo crear: ya existe una tienda en la plataforma con ese nombre.",
              );
              return false;
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
              if (updateOwnerStore(editStoreId, ownerUserId, v)) {
                toast.success("Tienda actualizada");
                return true;
              }
              toast.error(
                "No se pudo guardar: ese nombre ya lo usa otra tienda.",
              );
              return false;
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
                    published: serviceEditing.published !== false,
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
    </>
  );
}
