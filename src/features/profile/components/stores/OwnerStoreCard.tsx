import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Calendar,
  Pencil,
  Save,
  Store,
  Trash2,
} from "lucide-react";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { storePanelHref } from "@features/market/logic/store/storePath";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import type { StoreCatalog } from "@features/market/logic/storeCatalogTypes";
import { StoreTrustMini } from "@features/profile/components/trust/StoreTrustMini";

type Props = Readonly<{
  store: StoreBadge;
  catalog: StoreCatalog | undefined;
  joinedLabel: string;
  /** Vista previa local o logo guardado (`avatarUrl`). */
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
    <div className="relative vt-profile-store-card">
      <Link
        to={storePanelHref(b)}
        className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label={`Abrir panel de ${b.name}`}
      />
      <div className="relative z-[2] min-w-0 w-full space-y-0 p-3.5 pointer-events-none">
        <div className="vt-profile-store-card__header">
          <div className="vt-profile-store-card__main">
            <input
              id={`store-logo-${b.id}`}
              type="file"
              className="sr-only"
              accept="image/*"
              aria-label={`Logo de la tienda ${b.name}`}
              onChange={onAvatarFileChange}
            />
            <label
              htmlFor={`store-logo-${b.id}`}
              className="pointer-events-auto grid h-12 w-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
              title="Tocar para subir el logo de la tienda"
            >
              {avatarDisplayUrl ? (
                <ProtectedMediaImg
                  src={avatarDisplayUrl}
                  alt={`Logo de ${b.name}`}
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-contain"
                />
              ) : (
                <Store size={22} className="text-[var(--muted)]" aria-hidden />
              )}
            </label>
            <div className="vt-profile-store-card__content pointer-events-none">
              <div className="flex flex-wrap items-center gap-2">
                <span className="vt-profile-store-card__name">{b.name}</span>
                {b.verified ? (
                  <span
                    className="inline-flex items-center text-[var(--primary)]"
                    title="Verificado"
                    aria-label="Verificado"
                  >
                    <BadgeCheck size={16} aria-hidden />
                  </span>
                ) : null}
              </div>
              <div className="vt-profile-store-card__meta vt-muted mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} aria-hidden /> Alta: {joined}
                </span>
              </div>
              <div className="mt-2 w-full max-w-full">
                <StoreTrustMini score={b.trustScore} />
              </div>
              {(() => {
                const pitchText = (cat?.pitch ?? b.pitch ?? "").trim();
                if (!pitchText) return null;
                return (
                  <p className="vt-profile-store-card__pitch">{pitchText}</p>
                );
              })()}
              <div className="vt-profile-store-card__categories vt-muted mt-1">
                {b.categories.join(" · ")}
              </div>
              <p className="vt-profile-store-card__hint vt-muted">
                Abre el panel de gestión para administrar productos, servicios,
                pedidos, estadísticas, finanzas, personal y afiliados. Toca el
                logo para subir la imagen de tu tienda y confírmala con Guardar
                logo.
              </p>
              <div className="vt-profile-store-card__logo-actions">
                <button
                  type="button"
                  className="vt-profile-store-card__logo-btn vt-profile-btn vt-profile-btn--primary vt-profile-btn--sm w-full shrink-0"
                  disabled={!storeAvatarDirty}
                  onClick={onSaveStoreAvatar}
                >
                  <Save size={14} aria-hidden /> Guardar logo
                </button>
                <button
                  type="button"
                  className="vt-profile-store-card__logo-btn vt-profile-btn vt-profile-btn--ghost vt-profile-btn--sm w-full shrink-0"
                  disabled={!storeAvatarDirty}
                  onClick={onDiscardStoreAvatar}
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
          <div className="vt-profile-store-card__actions">
            <Link
              to={storePanelHref(b)}
              className="vt-profile-store-card__action-btn vt-profile-btn vt-profile-btn--primary vt-profile-btn--sm w-full"
            >
              <Store size={14} /> Gestionar
            </Link>
            <button
              type="button"
              className="vt-profile-store-card__action-btn vt-profile-btn vt-profile-btn--secondary vt-profile-btn--sm w-full"
              onClick={onEditDetails}
            >
              <Pencil size={14} /> Editar datos
            </button>
            <button
              type="button"
              className="vt-profile-store-card__action-btn vt-profile-btn vt-profile-btn--danger vt-profile-btn--sm w-full"
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
