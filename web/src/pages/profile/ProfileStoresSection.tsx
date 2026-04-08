import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { UploadBlockingOverlay } from "../../components/UploadBlockingOverlay";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import { mediaApiUrl, uploadMedia } from "../../utils/media/mediaClient";
import {
  DEFAULT_CATALOG_CATEGORIES,
  fetchCatalogCategories,
} from "../../utils/market/fetchCatalogCategories";
import { OwnerStoreCard } from "./stores/OwnerStoreCard";
import { VisitorStoreSummaryCard } from "./stores/VisitorStoreSummaryCard";
import { StoreFormModal } from "./stores/StoreFormModal";
import { ownerStoreToFormValues, revokeIfBlob } from "./stores/helpers";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import {
  matchesCategoryFilter,
  matchesNameQuery,
} from "../../utils/market/nameCategoryFilter";

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
  const myStores = useMemo(
    () => Object.values(stores).filter((b) => b.ownerUserId === ownerUserId),
    [stores, ownerUserId],
  );

  const [storeListNameQ, setStoreListNameQ] = useState("");
  const [storeListCategory, setStoreListCategory] = useState("");

  const storeListCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of myStores) {
      for (const c of b.categories) {
        const t = c.trim();
        if (t) set.add(t);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [myStores]);

  const filteredMyStores = useMemo(() => {
    return myStores.filter((b) => {
      if (!matchesNameQuery(b.name, storeListNameQ)) return false;
      const sel = storeListCategory.trim();
      if (!sel) return true;
      return b.categories.some((c) => matchesCategoryFilter(c, sel));
    });
  }, [myStores, storeListNameQ, storeListCategory]);

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
  const [avatarDrafts, setAvatarDrafts] = useState<Record<string, string>>({});
  const avatarDraftsRef = useRef<Record<string, string>>({});
  const [storeAvatarUploadBusy, setStoreAvatarUploadBusy] = useState(false);
  const [storesReloadBusy, setStoresReloadBusy] = useState(false);
  const [catalogReloadBusyId, setCatalogReloadBusyId] = useState<string | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<
    null | { kind: "store"; storeId: string; storeName: string }
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
          Tiendas públicas de este usuario: tocá una tarjeta para ver el
          catálogo y la vitrina.
        </p>
        <div className="vt-divider my-3" />
        {myStores.length === 0 ? (
          <p className="vt-muted text-[13px]">
            Este usuario no tiene tiendas vinculadas en la demo.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-2 min-[520px]:flex-row min-[520px]:flex-wrap min-[520px]:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-semibold text-[var(--muted)]">
                Buscar por nombre
                <input
                  type="search"
                  className="vt-input"
                  placeholder="Nombre de la tienda…"
                  value={storeListNameQ}
                  onChange={(e) => setStoreListNameQ(e.target.value)}
                  aria-label="Filtrar tiendas por nombre"
                />
              </label>
              <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-56">
                Categoría
                <select
                  className="vt-input"
                  value={storeListCategory}
                  onChange={(e) => setStoreListCategory(e.target.value)}
                  aria-label="Filtrar tiendas por categoría"
                >
                  <option value="">Todas</option>
                  {storeListCategoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {filteredMyStores.length === 0 ? (
              <p className="vt-muted text-[13px]">
                Ninguna tienda coincide con el filtro.
              </p>
            ) : null}
          <div className="flex flex-col gap-3">
            {filteredMyStores.map((b) => {
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
          </>
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
        title={deleteTarget?.kind === "store" ? "Eliminar tienda" : "Eliminar"}
        message={
          deleteTarget?.kind === "store"
            ? `¿Eliminar la tienda «${deleteTarget.storeName}» y su catálogo?`
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
              Configurá nombre, categorías, descripción del catálogo, verificación
              (soporte), transporte y foto. Para cargar o editar productos y
              servicios abrí la tienda desde la tarjeta.
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
          <>
            <div className="mb-3 flex flex-col gap-2 min-[520px]:flex-row min-[520px]:flex-wrap min-[520px]:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-semibold text-[var(--muted)]">
                Buscar por nombre
                <input
                  type="search"
                  className="vt-input"
                  placeholder="Nombre de la tienda…"
                  value={storeListNameQ}
                  onChange={(e) => setStoreListNameQ(e.target.value)}
                  aria-label="Filtrar tiendas por nombre"
                />
              </label>
              <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-56">
                Categoría
                <select
                  className="vt-input"
                  value={storeListCategory}
                  onChange={(e) => setStoreListCategory(e.target.value)}
                  aria-label="Filtrar tiendas por categoría"
                >
                  <option value="">Todas</option>
                  {storeListCategoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {filteredMyStores.length === 0 ? (
              <p className="vt-muted mb-3 text-[13px]">
                Ninguna tienda coincide con el filtro.
              </p>
            ) : null}
          <div className="flex flex-col gap-3">
            {filteredMyStores.map((b) => {
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
                    setDeleteTarget({
                      kind: "store",
                      storeId: b.id,
                      storeName: b.name,
                    });
                  }}
                  onAvatarFileChange={onStoreAvatarPick(b.id)}
                  onSaveStoreAvatar={() => saveStoreAvatar(b.id)}
                  onDiscardStoreAvatar={() => discardStoreAvatarDraft(b.id)}
                />
              );
            })}
          </div>
          </>
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

      </div>
    </>
  );
}
