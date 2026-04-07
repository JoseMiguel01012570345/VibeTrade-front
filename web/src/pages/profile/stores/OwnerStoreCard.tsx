import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  EyeOff,
  Globe,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Store,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import type { StoreBadge } from "../../../app/store/marketStoreTypes";
import { ProtectedMediaImg } from "../../../components/media/ProtectedMediaImg";
import type {
  StoreCatalog,
  StoreProduct,
  StoreService,
} from "../../chat/domain/storeCatalogTypes";

type Props = Readonly<{
  store: StoreBadge;
  catalog: StoreCatalog | undefined;
  joinedLabel: string;
  /** Vista previa local o imagen guardada */
  avatarDisplayUrl: string | undefined;
  storeAvatarDirty: boolean;
  onEditDetails: () => void;
  onRequestDeleteStore: () => void;
  onAvatarFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSaveStoreAvatar: () => void;
  onDiscardStoreAvatar: () => void;
  onAddProduct: () => void;
  onEditProduct: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onToggleProductPublished: (productId: string, published: boolean) => void;
  onAddService: () => void;
  onEditService: (serviceId: string) => void;
  onRemoveService: (serviceId: string) => void;
  onToggleServicePublished: (serviceId: string, published: boolean) => void;
  /** Recarga catálogo desde el servidor (vitrina + listas). */
  onReloadStoreCatalog: () => void;
  catalogReloadBusy?: boolean;
}>;

export function OwnerStoreCard({
  store: b,
  catalog: cat,
  joinedLabel: joined,
  avatarDisplayUrl,
  storeAvatarDirty,
  onEditDetails,
  onRequestDeleteStore,
  onAvatarFileChange,
  onSaveStoreAvatar,
  onDiscardStoreAvatar,
  onAddProduct,
  onEditProduct,
  onRemoveProduct,
  onToggleProductPublished,
  onAddService,
  onEditService,
  onRemoveService,
  onToggleServicePublished,
  onReloadStoreCatalog,
  catalogReloadBusy = false,
}: Props) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-3">
          <input
            id={`store-avatar-${b.id}`}
            type="file"
            className="sr-only"
            accept="image/*"
            aria-label={`Imagen de tienda ${b.name}`}
            onChange={onAvatarFileChange}
          />
          <label
            htmlFor={`store-avatar-${b.id}`}
            className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
            title="Tocar para subir foto de la tienda"
          >
            {avatarDisplayUrl ? (
              <ProtectedMediaImg
                src={avatarDisplayUrl}
                alt=""
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />
            ) : (
              <Store size={22} className="text-[var(--muted)]" aria-hidden />
            )}
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black tracking-[-0.02em]">
                {b.name}
              </span>
              {b.verified ? (
                <span className="rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900">
                  Verificado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,#d97706_16%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-950">
                  <AlertTriangle size={12} aria-hidden /> No verificado
                </span>
              )}
            </div>
            <div className="vt-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden /> Alta: {joined}
              </span>
              <span className="inline-flex items-center gap-1">
                <Truck size={12} aria-hidden /> Transporte:{" "}
                {b.transportIncluded ? "incluido" : "no incluido"}
              </span>
            </div>
            {cat?.pitch ? (
              <p className="mt-2 text-[13px] leading-snug">{cat.pitch}</p>
            ) : null}
            <div className="vt-muted mt-1 text-xs">
              {b.categories.join(" · ")}
            </div>
            <p className="vt-muted mt-2 max-w-md text-[12px] leading-snug">
              Elegí una imagen con el avatar y guardala con el botón (vista
              previa local con URL blob).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="vt-btn vt-btn-primary vt-btn-sm inline-flex items-center gap-1.5"
                disabled={!storeAvatarDirty}
                onClick={onSaveStoreAvatar}
              >
                <Save size={14} aria-hidden /> Guardar foto
              </button>
              <button
                type="button"
                className="vt-btn vt-btn-ghost vt-btn-sm"
                disabled={!storeAvatarDirty}
                onClick={onDiscardStoreAvatar}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="vt-btn vt-btn-sm no-underline" to={`/store/${b.id}`}>
            Ver tienda
          </Link>
          <button
            type="button"
            className="vt-btn vt-btn-sm inline-flex items-center gap-1"
            onClick={onEditDetails}
          >
            <Pencil size={14} /> Editar datos
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1 text-[#b91c1c]"
            onClick={onRequestDeleteStore}
          >
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </div>

      <StoreProductListSection
        cat={cat}
        catalogReloadBusy={catalogReloadBusy}
        onReload={onReloadStoreCatalog}
        onAdd={onAddProduct}
        onEdit={onEditProduct}
        onRemove={onRemoveProduct}
        onTogglePublished={onToggleProductPublished}
      />

      <StoreServiceListSection
        cat={cat}
        catalogReloadBusy={catalogReloadBusy}
        onReload={onReloadStoreCatalog}
        onAdd={onAddService}
        onEdit={onEditService}
        onRemove={onRemoveService}
        onTogglePublished={onToggleServicePublished}
      />
    </div>
  );
}

function StoreProductListSection({
  cat,
  onAdd,
  onEdit,
  onRemove,
  onTogglePublished,
  onReload,
  catalogReloadBusy,
}: Readonly<{
  cat: StoreCatalog | undefined;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePublished: (id: string, published: boolean) => void;
  onReload: () => void;
  catalogReloadBusy: boolean;
}>) {
  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Productos
        </span>
        <button
          type="button"
          className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
          disabled={catalogReloadBusy}
          title="Recargar lista de productos"
          aria-label="Recargar productos"
          onClick={onReload}
        >
          <RefreshCw
            size={14}
            className={catalogReloadBusy ? "animate-spin" : ""}
            aria-hidden
          />
          Recargar
        </button>
      </div>
      {cat && cat.products.length > 0 ? (
        <ul className="mb-2 space-y-1.5 text-[13px]">
          {cat.products.map((p: StoreProduct) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)] px-2 py-1.5"
            >
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <Package
                  size={14}
                  className="shrink-0 opacity-70"
                  aria-hidden
                />
                <span className="truncate font-bold">{p.name}</span>
                <span className="vt-muted truncate">{p.price}</span>
                {p.published ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900">
                    <BadgeCheck size={12} aria-hidden /> Publicado
                  </span>
                ) : (
                  <span className="vt-muted inline-flex shrink-0 items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    Borrador
                  </span>
                )}
              </span>
              <span className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
                  onClick={() => {
                    const next = !p.published;
                    onTogglePublished(p.id, next);
                  }}
                >
                  {p.published ? (
                    <>
                      <EyeOff size={14} aria-hidden /> Ocultar
                    </>
                  ) : (
                    <>
                      <Globe size={14} aria-hidden /> Publicar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm"
                  onClick={() => onEdit(p.id)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                  onClick={() => onRemove(p.id)}
                >
                  Quitar
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="vt-muted mb-2 text-xs">Sin productos en catálogo.</p>
      )}
      <button
        type="button"
        className="vt-btn vt-btn-sm inline-flex items-center gap-1"
        onClick={onAdd}
      >
        <Plus size={14} /> Añadir producto
      </button>
    </div>
  );
}

function StoreServiceListSection({
  cat,
  onAdd,
  onEdit,
  onRemove,
  onTogglePublished,
  onReload,
  catalogReloadBusy,
}: Readonly<{
  cat: StoreCatalog | undefined;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onTogglePublished: (id: string, published: boolean) => void;
  onReload: () => void;
  catalogReloadBusy: boolean;
}>) {
  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Servicios
        </span>
        <button
          type="button"
          className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
          disabled={catalogReloadBusy}
          title="Recargar lista de servicios"
          aria-label="Recargar servicios"
          onClick={onReload}
        >
          <RefreshCw
            size={14}
            className={catalogReloadBusy ? "animate-spin" : ""}
            aria-hidden
          />
          Recargar
        </button>
      </div>
      {cat && cat.services.length > 0 ? (
        <ul className="mb-2 space-y-1.5 text-[13px]">
          {cat.services.map((sv: StoreService) => {
            const pub = sv.published !== false;
            return (
            <li
              key={sv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)] px-2 py-1.5"
            >
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <Wrench size={14} className="shrink-0 opacity-70" aria-hidden />
                <span className="truncate font-bold">{sv.tipoServicio}</span>
                {pub ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900">
                    <BadgeCheck size={12} aria-hidden /> Publicado
                  </span>
                ) : (
                  <span className="vt-muted inline-flex shrink-0 items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    Borrador
                  </span>
                )}
              </span>
              <span className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1"
                  onClick={() => {
                    onTogglePublished(sv.id, !pub);
                  }}
                >
                  {pub ? (
                    <>
                      <EyeOff size={14} aria-hidden /> Ocultar
                    </>
                  ) : (
                    <>
                      <Globe size={14} aria-hidden /> Publicar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm"
                  onClick={() => onEdit(sv.id)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                  onClick={() => onRemove(sv.id)}
                >
                  Quitar
                </button>
              </span>
            </li>
          );
          })}
        </ul>
      ) : (
        <p className="vt-muted mb-2 text-xs">Sin servicios en catálogo.</p>
      )}
      <button
        type="button"
        className="vt-btn vt-btn-sm inline-flex items-center gap-1"
        onClick={onAdd}
      >
        <Plus size={14} /> Añadir servicio
      </button>
    </div>
  );
}
