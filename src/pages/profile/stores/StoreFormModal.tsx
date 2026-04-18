import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import type {
  OwnerStoreFormValues,
  StoreLocationPoint,
} from "../../../app/store/marketStoreTypes";
import { MapPin, X } from "lucide-react";
import {
  PROFILE_DESC_MIN,
  PROFILE_TITLE_MIN,
  validateOwnerStoreForm,
} from "../profileStoreFormValidation";
import { onBackdropPointerClose } from "../../chat/lib/modalClose";
import {
  checkRow,
  fieldLabel,
  fieldRootWithInvalid,
  modalFormBody,
  modalShellWide,
  modalSub,
  textareaMin,
} from "../../chat/styles/formModalStyles";
import { cn } from "../../../lib/cn";
import { VtSelect } from "../../../components/VtSelect";
import { StoreLocationMapModal } from "./StoreLocationMapModal";

type Props = Readonly<{
  open: boolean;
  title: string;
  initial: OwnerStoreFormValues;
  categoryOptions: string[];
  onClose: () => void;
  /** Devuelve true solo si se persistió en el store; si es false, el modal permanece abierto (p. ej. nombre duplicado). */
  onSave: (v: OwnerStoreFormValues) => boolean | Promise<boolean>;
}>;

export function StoreFormModal({
  open,
  title,
  initial,
  categoryOptions,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initial.name);
  const [categories, setCategories] = useState<string[]>(initial.categories);
  const [pitch, setPitch] = useState(initial.categoryPitch);
  const [transport, setTransport] = useState(initial.transportIncluded);
  const [location, setLocation] = useState<StoreLocationPoint | undefined>(
    initial.location,
  );
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl ?? "");
  const [mapOpen, setMapOpen] = useState(false);
  const [showVal, setShowVal] = useState(false);

  const categoriesDraft = categories;
  const catInvalid =
    showVal && !categoriesDraft.some((c) => c.length >= PROFILE_TITLE_MIN);
  const pitchInvalid = showVal && pitch.trim().length < PROFILE_DESC_MIN;

  const categorySelectOptions = useMemo(() => {
    const set = new Set(categoriesDraft.map((c) => c.trim()).filter(Boolean));
    return categoryOptions
      .map((c) => c.trim())
      .filter(Boolean)
      .filter((c) => !set.has(c))
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [categoryOptions, categoriesDraft]);

  if (!open) return null;

  return (
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
        <div className="vt-modal-title">{title}</div>
        <div className={modalSub}>
          Nombre de la tienda, categorías (varias), descripción de qué productos
          y servicios ofrece, y si el transporte está incluido (etiqueta visible
          tipo advertencia si no).
        </div>
        <div className={modalFormBody}>
          <label className={fieldRootWithInvalid(showVal && !name.trim())}>
            <span className={fieldLabel}>Nombre de la tienda</span>
            <input
              className="vt-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className={fieldRootWithInvalid(catInvalid)}>
            <span className={fieldLabel}>Categorías</span>
            <div className="flex flex-col gap-2">
              <VtSelect
                value=""
                onChange={(v) => {
                  const t = v.trim();
                  if (!t) return;
                  setCategories((prev) => (prev.includes(t) ? prev : [...prev, t]));
                }}
                ariaLabel="Añadir categoría"
                placeholder="Añadir categoría…"
                options={[
                  { value: "", label: "Añadir categoría…", disabled: true },
                  ...categorySelectOptions.map((c) => ({ value: c, label: c })),
                ]}
              />
              {categoriesDraft.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {categoriesDraft.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-2.5 py-1 text-[12px] font-semibold"
                      onClick={() => {
                        setCategories((prev) => prev.filter((x) => x !== c));
                      }}
                      aria-label={`Quitar categoría ${c}`}
                      title="Quitar"
                    >
                      {c} <X size={14} className="opacity-70" aria-hidden />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="vt-muted text-[12px]">
                  Elegí una o más categorías desde el desplegable.
                </div>
              )}
            </div>
          </label>
          <label className={fieldRootWithInvalid(pitchInvalid)}>
            <span className={fieldLabel}>
              Descripción de categorías de productos y servicios
            </span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={4}
            />
          </label>
          <label className={checkRow}>
            <input
              type="checkbox"
              checked={transport}
              onChange={(e) => setTransport(e.target.checked)}
            />
            <span>Transporte incluido en las ofertas de esta tienda</span>
          </label>
          <label>
            <span className={fieldLabel}>Sitio web (opcional)</span>
            <input
              className="vt-input mt-1"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://… o solo el dominio"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <span className="mt-1 block text-[11px] text-[var(--muted)]">
              Se mostrará en la vitrina, búsquedas y ofertas del feed.
            </span>
          </label>
          <div>
            <span className={fieldLabel}>Ubicación (opcional)</span>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                className="vt-btn vt-btn-ghost inline-flex items-center gap-2 self-start"
                onClick={() => setMapOpen(true)}
              >
                <MapPin size={18} className="text-[var(--primary)]" aria-hidden />
                {location ? "Cambiar ubicación en mapa" : "Elegir en mapa"}
              </button>
              {location ? (
                <span className="vt-muted text-[12px]">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </span>
              ) : (
                <span className="vt-muted text-[12px]">
                  Sin pin: no se muestra mapa en la tienda.
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={async () => {
              const payload: OwnerStoreFormValues = {
                name: name.trim(),
                categories: categoriesDraft,
                categoryPitch: pitch,
                transportIncluded: transport,
                location,
                websiteUrl: websiteUrl.trim() || undefined,
              };
              const err = validateOwnerStoreForm(payload);
              if (err) {
                toast.error(err);
                setShowVal(true);
                return;
              }
              setShowVal(false);
              const result = onSave(payload);
              const ok = result instanceof Promise ? await result : result;
              if (ok) onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
      <StoreLocationMapModal
        open={mapOpen}
        initial={location}
        onClose={() => setMapOpen(false)}
        onSave={(p) => setLocation(p)}
      />
    </div>
  );
}
