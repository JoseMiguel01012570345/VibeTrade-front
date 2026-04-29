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
    <div className="relative min-w-0 w-full overflow-hidden rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))]">
      <Link
        to={`/store/${b.id}`}
        className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label={`Abrir tienda ${b.name}`}
      />
      <div className="relative z-[2] min-w-0 w-full space-y-0 p-3.5 pointer-events-none">
        {/*
          En móvil: columna (texto a ancho completo); los botones Editar/Eliminar van abajo.
          En ≥480px: fila con botones a la derecha — evita que flex-1 comparta fila con los botones y aplaste el texto a pocos px.
        */}
        <div className="flex min-w-0 w-full flex-col gap-3 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between min-[480px]:gap-3">
          {/*
            Importante: sin `w-full` en ≥480px — `w-full` + `flex-1` en un ítem flex suele
            dejar el texto en una columna de pocos px con hueco vacío a la derecha.
          */}
          <div className="flex min-w-0 flex-1 gap-3 max-[479px]:w-full min-[480px]:min-w-0">
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
                <span className="min-w-0 break-words text-base font-black tracking-[-0.02em]">
                  {b.name}
                </span>
                {b.verified ? (
                  <span className="rounded-full bg-[color-mix(in_oklab,var(--good)_14%,transparent)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-green-900 dark:text-emerald-300">
                    Verificado
                  </span>
                ) : (
                  <span className="vt-badge-verify-warn-compact">
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
              <div className="mt-2 w-full max-w-full min-[480px]:max-w-[min(100%,360px)]">
                <StoreTrustMini score={b.trustScore} />
              </div>
              {(() => {
                const pitchText = (cat?.pitch ?? b.pitch ?? "").trim();
                if (!pitchText) return null;
                return (
                  <p className="mt-2 break-words text-[13px] leading-snug">
                    {pitchText}
                  </p>
                );
              })()}
              <div className="vt-muted mt-1 break-words text-xs leading-snug">
                {b.categories.join(" · ")}
              </div>
              <p className="vt-muted mt-2 max-w-full text-[12px] leading-snug sm:max-w-md">
                Gestioná productos y servicios desde el catálogo al abrir la
                tienda. Elige una imagen con el avatar y guárdala con el botón
                (vista previa local con URL blob).
              </p>
              <div className="pointer-events-auto mt-2 flex min-w-0 flex-col gap-2 min-[360px]:flex-row min-[360px]:flex-wrap">
                <button
                  type="button"
                  className="vt-btn vt-btn-primary vt-btn-sm inline-flex w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap min-[360px]:w-auto"
                  disabled={!storeAvatarDirty}
                  onClick={onSaveStoreAvatar}
                >
                  <Save size={14} aria-hidden /> Guardar foto
                </button>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm inline-flex w-full shrink-0 items-center justify-center min-[360px]:w-auto"
                  disabled={!storeAvatarDirty}
                  onClick={onDiscardStoreAvatar}
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-wrap gap-2 pointer-events-auto min-[480px]:w-auto min-[480px]:shrink-0 min-[480px]:justify-end">
            <button
              type="button"
              className="vt-btn vt-btn-sm inline-flex flex-1 items-center justify-center gap-1 min-[360px]:flex-initial"
              onClick={onEditDetails}
            >
              <Pencil size={14} /> Editar datos
            </button>
            <button
              type="button"
              className="vt-btn vt-btn-ghost vt-btn-sm inline-flex flex-1 items-center justify-center gap-1 text-[#b91c1c] min-[360px]:flex-initial"
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
