import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  Pencil,
  Save,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import type { StoreBadge } from "../../../app/store/marketStoreTypes";
import { ProtectedMediaImg } from "../../../components/media/ProtectedMediaImg";
import type { StoreCatalog } from "../../chat/domain/storeCatalogTypes";
import { StoreTrustMini } from "../../../components/StoreTrustMini";

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
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))]">
      <Link
        to={`/store/${b.id}`}
        className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label={`Abrir tienda ${b.name}`}
      />
      <div className="relative z-[2] space-y-0 p-3.5 pointer-events-none">
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
              className="pointer-events-auto grid h-12 w-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
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
            <div className="min-w-0 flex-1 pointer-events-none">
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
              <div className="mt-2 max-w-[320px]">
                <StoreTrustMini score={b.trustScore} />
              </div>
              {cat?.pitch ? (
                <p className="mt-2 text-[13px] leading-snug">{cat.pitch}</p>
              ) : null}
              <div className="vt-muted mt-1 text-xs">
                {b.categories.join(" · ")}
              </div>
              <p className="vt-muted mt-2 max-w-md text-[12px] leading-snug">
                Gestioná productos y servicios desde el catálogo al abrir la
                tienda. Elegí una imagen con el avatar y guardala con el botón
                (vista previa local con URL blob).
              </p>
              <div className="pointer-events-auto mt-2 flex flex-wrap gap-2">
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
          <div className="flex flex-wrap gap-2 pointer-events-auto">
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
      </div>
    </div>
  );
}
