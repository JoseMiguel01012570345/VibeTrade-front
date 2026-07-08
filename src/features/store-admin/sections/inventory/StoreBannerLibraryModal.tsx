import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  createStoreBanner,
  deleteStoreBanner,
  fetchStoreBannersAdmin,
  patchStoreBanner,
} from "@features/market/api/storeInventoryApi";
import type { StoreBannerDto } from "@features/market/Dtos/storeCatalogTypes";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import {
  mediaApiUrl,
  uploadMedia,
  MEDIA_MAX_BYTES,
} from "@shared/services/media/mediaClient";
import { CeButton, CeModal, CeSpinner } from "@shared/components/ui";

type BannerKind = "main" | "secondary";

function partitionBanners(banners: StoreBannerDto[]) {
  return {
    main: banners.filter((b) => b.kind === "main"),
    secondary: banners.filter((b) => b.kind === "secondary"),
  };
}

function BannerColumn({
  kind,
  label,
  banners,
  uploading,
  busyIds,
  onUpload,
  onToggleActive,
  onDelete,
}: {
  kind: BannerKind;
  label: string;
  banners: StoreBannerDto[];
  uploading: boolean;
  busyIds: Set<string>;
  onUpload: (file: File) => void;
  onToggleActive: (banner: StoreBannerDto, next: boolean) => void;
  onDelete: (banner: StoreBannerDto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{label}</h3>
        <CeButton
          size="xs"
          color="gray"
          outline
          disabled={uploading}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5"
        >
          <Upload size={14} aria-hidden />
          Subir
        </CeButton>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload(file);
          }}
        />
      </div>
      {banners.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-3 py-8 text-center text-xs text-gray-500 dark:border-gray-600">
          Sin banners de tipo {kind}.
        </p>
      ) : (
        <ul className="space-y-3">
          {banners.map((b) => (
            <li
              key={b.id}
              className={`flex items-center gap-3 rounded-lg border bg-white p-2 dark:bg-gray-900 ${
                b.active
                  ? "border-emerald-300 dark:border-emerald-700/70"
                  : "border-gray-200 dark:border-gray-700"
              } ${busyIds.has(b.id) ? "opacity-60" : ""}`}
            >
              <span className="h-14 w-24 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-100">
                <ProtectedMediaImg
                  src={b.mediaUrl}
                  alt=""
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Orden {b.sortOrder}
                </p>
                <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={b.active}
                    disabled={busyIds.has(b.id)}
                    onChange={(e) => onToggleActive(b, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{b.active ? "Activo" : "Inactivo"}</span>
                </label>
              </div>
              <CeButton
                color="failure"
                outline
                size="xs"
                aria-label="Eliminar banner"
                disabled={busyIds.has(b.id)}
                loading={busyIds.has(b.id)}
                onClick={() => onDelete(b)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center p-0"
              >
                <Trash2 size={14} aria-hidden />
              </CeButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StoreBannerLibraryModal({
  show,
  storeId,
  onClose,
}: {
  show: boolean;
  storeId: string;
  onClose: () => void;
}) {
  const [banners, setBanners] = useState<StoreBannerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<BannerKind | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchStoreBannersAdmin(storeId);
      setBanners(list);
    } catch {
      toast.error("No se pudieron cargar los banners.");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!show) return;
    void reload();
  }, [show, reload]);

  const { main, secondary } = useMemo(
    () => partitionBanners(banners),
    [banners],
  );

  const busy = loading || uploadingKind !== null || busyIds.size > 0;

  function markBusy(id: string, busy: boolean): void {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleUpload(kind: BannerKind, file: File): Promise<void> {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se admiten imágenes.");
      return;
    }
    if (file.size > MEDIA_MAX_BYTES) {
      toast.error("La imagen supera el tamaño máximo permitido.");
      return;
    }
    setUploadingKind(kind);
    try {
      const uploaded = await uploadMedia(file);
      await createStoreBanner(storeId, {
        kind,
        mediaUrl: mediaApiUrl(uploaded.id),
        sortOrder: banners.filter((b) => b.kind === kind).length,
      });
      toast.success("Banner subido correctamente. Actívalo cuando quieras mostrarlo.");
      await reload();
    } catch {
      toast.error("No se pudo subir el banner.");
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleToggleActive(
    banner: StoreBannerDto,
    next: boolean,
  ): Promise<void> {
    markBusy(banner.id, true);
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, active: next } : b)),
    );
    try {
      await patchStoreBanner(storeId, banner.id, { active: next });
      toast.success(next ? "Banner activado." : "Banner desactivado.");
    } catch {
      toast.error("No se pudo actualizar el banner.");
      setBanners((prev) =>
        prev.map((b) =>
          b.id === banner.id ? { ...b, active: banner.active } : b,
        ),
      );
    } finally {
      markBusy(banner.id, false);
    }
  }

  async function handleDelete(banner: StoreBannerDto): Promise<void> {
    markBusy(banner.id, true);
    try {
      await deleteStoreBanner(storeId, banner.id);
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      toast.success("Banner eliminado.");
    } catch {
      toast.error("No se pudo eliminar el banner.");
    } finally {
      markBusy(banner.id, false);
    }
  }

  return (
    <CeModal
      show={show}
      onClose={() => !busy && onClose()}
      title="Biblioteca de banners"
      size="5xl"
      bodyClassName="overflow-y-auto max-h-[min(80vh,40rem)]"
      footer={
        <CeButton color="gray" outline disabled={busy} onClick={onClose}>
          Cerrar
        </CeButton>
      }
    >
      <div className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="font-bold">Políticas de banners</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed">
            <li>Formato de imagen: JPG, PNG o WebP.</li>
            <li>Tamaño máximo: {(MEDIA_MAX_BYTES / 1024 / 1024).toFixed(0)} MB.</li>
            <li>Banner principal: se recomienda 1200 × 400 px (relación 3:1).</li>
            <li>Banner secundario: se recomienda 1200 × 300 px (relación 4:1). Sus colores dominantes determinarán el color de los botones de la tienda.</li>
            <li>Usa fondos limpios para que el tono extraído sea preciso.</li>
          </ul>
        </div>
      </div>

      {loading && banners.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500">
          <CeSpinner size="md" aria-label="Cargando banners" />
          Cargando banners…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <BannerColumn
            kind="main"
            label="Banner principal"
            banners={main}
            uploading={uploadingKind === "main"}
            busyIds={busyIds}
            onUpload={(file) => void handleUpload("main", file)}
            onToggleActive={(b, next) => void handleToggleActive(b, next)}
            onDelete={(b) => void handleDelete(b)}
          />
          <BannerColumn
            kind="secondary"
            label="Banner secundario"
            banners={secondary}
            uploading={uploadingKind === "secondary"}
            busyIds={busyIds}
            onUpload={(file) => void handleUpload("secondary", file)}
            onToggleActive={(b, next) => void handleToggleActive(b, next)}
            onDelete={(b) => void handleDelete(b)}
          />
        </div>
      )}
    </CeModal>
  );
}
