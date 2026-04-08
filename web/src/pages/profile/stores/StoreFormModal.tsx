import { useState } from "react";
import toast from "react-hot-toast";
import type { OwnerStoreFormValues } from "../../../app/store/marketStoreTypes";
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

type Props = Readonly<{
  open: boolean;
  title: string;
  initial: OwnerStoreFormValues;
  onClose: () => void;
  /** Devuelve true solo si se persistió en el store; si es false, el modal permanece abierto (p. ej. nombre duplicado). */
  onSave: (v: OwnerStoreFormValues) => boolean;
}>;

export function StoreFormModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initial.name);
  const [categoriesStr, setCategoriesStr] = useState(
    initial.categories.join(", "),
  );
  const [pitch, setPitch] = useState(initial.categoryPitch);
  const [transport, setTransport] = useState(initial.transportIncluded);
  const [showVal, setShowVal] = useState(false);

  if (!open) return null;

  const categoriesDraft = categoriesStr
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const catInvalid =
    showVal && !categoriesDraft.some((c) => c.length >= PROFILE_TITLE_MIN);
  const pitchInvalid = showVal && pitch.trim().length < PROFILE_DESC_MIN;

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
            <span className={fieldLabel}>Categorías (separadas por coma)</span>
            <input
              className="vt-input"
              list="store-cat-hints"
              value={categoriesStr}
              onChange={(e) => setCategoriesStr(e.target.value)}
              placeholder="Ej: Mercancías, Cosechas"
            />
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
        </div>
        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => {
              const categories = categoriesStr
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
              const payload = {
                name: name.trim(),
                categories,
                categoryPitch: pitch,
                transportIncluded: transport,
              };
              const err = validateOwnerStoreForm(payload);
              if (err) {
                toast.error(err);
                setShowVal(true);
                return;
              }
              setShowVal(false);
              if (onSave(payload)) onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
