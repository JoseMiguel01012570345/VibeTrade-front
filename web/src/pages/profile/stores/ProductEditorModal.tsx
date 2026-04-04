import { type ChangeEvent, useId, useState } from "react";
import toast from "react-hot-toast";
import { Upload, X } from "lucide-react";
import type { MerchandiseCondition } from "../../chat/domain/tradeAgreementTypes";
import type { StoreProduct } from "../../chat/domain/storeCatalogTypes";
import {
  PROFILE_DESC_MIN,
  PROFILE_LINE_MIN,
  PROFILE_TITLE_MIN,
  validateProductForm,
} from "../profileStoreFormValidation";
import { onBackdropPointerClose } from "../../chat/lib/modalClose";
import {
  fieldLabel,
  fieldRootWithInvalid,
  modalFormBody,
  modalShellWide,
  modalSub,
  textareaMin,
} from "../../chat/styles/formModalStyles";
import { cn } from "../../../lib/cn";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import {
  newAttachmentId,
  productPhotoSlotsFromUrls,
  revokeIfBlob,
  type ProductPhotoSlot,
} from "./helpers";

type Props = Readonly<{
  open: boolean;
  title: string;
  initial: Omit<StoreProduct, "id" | "storeId">;
  onClose: () => void;
  onSave: (v: Omit<StoreProduct, "id" | "storeId">) => void;
}>;

export function ProductEditorModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: Props) {
  const photoInputId = useId();
  const [form, setForm] = useState(initial);
  const [photoSlots, setPhotoSlots] = useState<ProductPhotoSlot[]>(() =>
    productPhotoSlotsFromUrls(initial.photoUrls),
  );
  const [showVal, setShowVal] = useState(false);

  if (!open) return null;

  const photoOk = photoSlots.length >= 1;

  function onPickProductPhoto(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = input.files ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    const added: ProductPhotoSlot[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) {
        toast.error(`No es imagen: ${file.name}`);
        continue;
      }
      added.push({
        id: newAttachmentId(),
        url: URL.createObjectURL(file),
        fileName: file.name,
      });
    }
    if (added.length) setPhotoSlots((prev) => [...prev, ...added]);
  }

  function removeProductPhoto(slotId: string) {
    setPhotoSlots((prev) => {
      const slot = prev.find((p) => p.id === slotId);
      if (slot) revokeIfBlob(slot.url);
      return prev.filter((p) => p.id !== slotId);
    });
  }

  function clearAllProductPhotos() {
    setPhotoSlots((prev) => {
      prev.forEach((p) => revokeIfBlob(p.url));
      return [];
    });
  }

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
          Campos de ficha de producto según el perfil de negocio (flow-ui).
        </div>
        <div className={modalFormBody}>
          <div className="grid gap-3 min-[560px]:grid-cols-2">
            <label
              className={fieldRootWithInvalid(
                showVal && (form.category.trim().length < PROFILE_TITLE_MIN),
              )}
            >
              <span className={fieldLabel}>Categoría</span>
              <input
                className="vt-input"
                list="store-cat-hints"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label
              className={fieldRootWithInvalid(
                showVal && (form.name.trim().length < PROFILE_TITLE_MIN),
              )}
            >
              <span className={fieldLabel}>Nombre del producto</span>
              <input
                className="vt-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className={fieldRootWithInvalid(false)}>
              <span className={fieldLabel}>Versión / modelo</span>
              <input
                className="vt-input"
                value={form.model ?? ""}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </label>
            <label className={fieldRootWithInvalid(false)}>
              <span className={fieldLabel}>Estado</span>
              <select
                className="vt-input"
                value={form.condition}
                onChange={(e) =>
                  setForm({
                    ...form,
                    condition: e.target.value as MerchandiseCondition,
                  })
                }
              >
                <option value="nuevo">Nuevo</option>
                <option value="usado">Usado</option>
                <option value="reacondicionado">Reacondicionado</option>
              </select>
            </label>
            <label
              className={cn(
                fieldRootWithInvalid(showVal && !form.price.trim()),
                "min-[560px]:col-span-2",
              )}
            >
              <span className={fieldLabel}>Precio</span>
              <input
                className="vt-input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
          </div>
          <label
            className={fieldRootWithInvalid(
              showVal &&
                (form.shortDescription.trim().length < PROFILE_DESC_MIN),
            )}
          >
            <span className={fieldLabel}>Descripción breve</span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.shortDescription}
              onChange={(e) =>
                setForm({ ...form, shortDescription: e.target.value })
              }
              rows={2}
            />
          </label>
          <label
            className={fieldRootWithInvalid(
              showVal && (form.mainBenefit.trim().length < PROFILE_DESC_MIN),
            )}
          >
            <span className={fieldLabel}>Beneficio principal</span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.mainBenefit}
              onChange={(e) =>
                setForm({ ...form, mainBenefit: e.target.value })
              }
              rows={2}
            />
          </label>
          <label
            className={fieldRootWithInvalid(
              showVal && (form.technicalSpecs.trim().length < PROFILE_DESC_MIN),
            )}
          >
            <span className={fieldLabel}>Características técnicas</span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.technicalSpecs}
              onChange={(e) =>
                setForm({ ...form, technicalSpecs: e.target.value })
              }
              rows={3}
            />
          </label>
          <label
            className={fieldRootWithInvalid(
              showVal &&
                ((form.taxesShippingInstall ?? "").trim().length <
                  PROFILE_LINE_MIN),
            )}
          >
            <span className={fieldLabel}>
              Impuestos, envío o instalación (si aplica)
            </span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.taxesShippingInstall ?? ""}
              onChange={(e) =>
                setForm({ ...form, taxesShippingInstall: e.target.value })
              }
              rows={2}
            />
          </label>
          <label
            className={fieldRootWithInvalid(
              showVal && (form.availability.trim().length < PROFILE_DESC_MIN),
            )}
          >
            <span className={fieldLabel}>Disponibilidad / stock</span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.availability}
              onChange={(e) =>
                setForm({ ...form, availability: e.target.value })
              }
              rows={2}
            />
          </label>
          <label
            className={fieldRootWithInvalid(
              showVal && (form.warrantyReturn.trim().length < PROFILE_DESC_MIN),
            )}
          >
            <span className={fieldLabel}>Garantía y devolución</span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.warrantyReturn}
              onChange={(e) =>
                setForm({ ...form, warrantyReturn: e.target.value })
              }
              rows={2}
            />
          </label>
          <label
            className={fieldRootWithInvalid(
              showVal && (form.contentIncluded.trim().length < PROFILE_DESC_MIN),
            )}
          >
            <span className={fieldLabel}>Contenido incluido</span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.contentIncluded}
              onChange={(e) =>
                setForm({ ...form, contentIncluded: e.target.value })
              }
              rows={2}
            />
          </label>
          <label
            className={fieldRootWithInvalid(
              showVal && (form.usageConditions.trim().length < PROFILE_DESC_MIN),
            )}
          >
            <span className={fieldLabel}>Condiciones de uso</span>
            <textarea
              className={cn("vt-input", textareaMin)}
              value={form.usageConditions}
              onChange={(e) =>
                setForm({ ...form, usageConditions: e.target.value })
              }
              rows={2}
            />
          </label>
          <div className={fieldRootWithInvalid(showVal && !photoOk)}>
            <span className={fieldLabel}>
              Fotos del producto (al menos una)
            </span>
            <p className="vt-muted mb-2 text-[11px] leading-snug">
              Subí una o varias imágenes desde tu dispositivo (podés elegir
              varias a la vez). Quitá archivos individuales o vaciá toda la
              galería antes de guardar si hace falta.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={photoInputId}
                type="file"
                className="sr-only"
                accept="image/*"
                multiple
                onChange={onPickProductPhoto}
              />
              <label
                htmlFor={photoInputId}
                className="vt-btn vt-btn-sm inline-flex cursor-pointer items-center gap-2"
              >
                <Upload size={16} aria-hidden /> Añadir fotos
              </label>
              {photoSlots.length ? (
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm text-[var(--muted)]"
                  onClick={clearAllProductPhotos}
                >
                  Quitar todas
                </button>
              ) : null}
            </div>
            {photoSlots.length ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Vista previa ({photoSlots.length})
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {photoSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="relative w-[calc(50%-4px)] min-[480px]:w-[140px] shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)]"
                    >
                      <img
                        src={slot.url}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                      <div
                        className="truncate px-1.5 py-1 text-[10px] text-[var(--muted)]"
                        title={slot.fileName}
                      >
                        {slot.fileName}
                      </div>
                      <button
                        type="button"
                        className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-sm hover:text-[#b91c1c]"
                        title="Quitar esta foto"
                        aria-label="Quitar esta foto"
                        onClick={() => removeProductPhoto(slot.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <CustomFieldsEditor
            fields={form.customFields}
            onChange={(cf) => setForm((f) => ({ ...f, customFields: cf }))}
            showValidation={showVal}
          />
        </div>
        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => {
              const snapshot = {
                ...form,
                photoUrls: photoSlots.map((p) => p.url),
              };
              const err = validateProductForm(snapshot);
              if (err) {
                toast.error(err);
                setShowVal(true);
                return;
              }
              setShowVal(false);
              onSave(snapshot);
              onClose();
            }}
          >
            Guardar producto
          </button>
        </div>
      </div>
    </div>
  );
}
