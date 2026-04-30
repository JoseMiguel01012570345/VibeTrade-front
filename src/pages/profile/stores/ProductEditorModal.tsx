import { type ChangeEvent, useId, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Upload, X } from "lucide-react";
import type { MerchandiseCondition } from "../../chat/domain/tradeAgreementTypes";
import {
  catalogMonedasList,
  mergeMonedaPrecioIntoMonedas,
  stripMonedaPrecioFromSelection,
  type StoreProduct,
} from "../../chat/domain/storeCatalogTypes";
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
import { VtSelect } from "../../../components/VtSelect";
import { VtMultiSelect } from "../../../components/VtMultiSelect";
import { UploadBlockingOverlay } from "../../../components/UploadBlockingOverlay";
import { ProtectedMediaImg } from "../../../components/media/ProtectedMediaImg";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { assertEntityPayloadUnderLimit } from "../../../utils/media/payloadLimits";
import {
  uploadMedia,
  mediaApiUrl,
  isProtectedMediaUrl,
  releaseMediaObjectUrl,
} from "../../../utils/media/mediaClient";
import {
  newAttachmentId,
  productPhotoSlotsFromUrls,
  revokeIfBlob,
  type ProductPhotoSlot,
} from "./helpers";

function initialMonedasExtras(
  init: Omit<StoreProduct, "id" | "storeId">,
): string[] {
  return stripMonedaPrecioFromSelection(
    catalogMonedasList(init),
    init.monedaPrecio,
  );
}

type Props = Readonly<{
  open: boolean;
  title: string;
  initial: Omit<StoreProduct, "id" | "storeId">;
  /** Categorías del backend (GET /api/v1/market/catalog-categories). */
  categoryOptions?: string[];
  /** Monedas del backend (GET /api/v1/market/currencies). */
  currencyOptions?: string[];
  onClose: () => void;
  onSave: (v: Omit<StoreProduct, "id" | "storeId">) => void;
}>;

export function ProductEditorModal({
  open,
  title,
  initial,
  categoryOptions = [],
  currencyOptions = [],
  onClose,
  onSave,
}: Props) {
  const photoInputId = useId();
  const [form, setForm] = useState(initial);
  /** Monedas elegidas solo en el multiselect (sin la moneda del precio del select). */
  const [monedasExtras, setMonedasExtras] = useState(() =>
    initialMonedasExtras(initial),
  );
  const [photoSlots, setPhotoSlots] = useState<ProductPhotoSlot[]>(() =>
    productPhotoSlotsFromUrls(initial.photoUrls),
  );
  const [showVal, setShowVal] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [photoPendingCount, setPhotoPendingCount] = useState(0);

  const photoOk = photoSlots.length >= 1;

  const acceptedMonedasMerged = useMemo(
    () => mergeMonedaPrecioIntoMonedas(monedasExtras, form.monedaPrecio),
    [monedasExtras, form.monedaPrecio],
  );

  const categorySelectOptions = useMemo(() => {
    const base = categoryOptions.length > 0 ? categoryOptions : [];
    const merged = new Set(base.map((c) => c.trim()).filter(Boolean));
    if (form.category.trim()) merged.add(form.category.trim());
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [categoryOptions, form.category]);

  /** Lista para el precio (única) y para monedas aceptadas (múltiple); incluye CUP. */
  const allCurrencyCodes = useMemo(() => {
    const merged = new Set<string>(
      currencyOptions.map((c) => c.trim()).filter(Boolean),
    );
    merged.add("CUP");
    const mp = (form.monedaPrecio ?? "").trim();
    if (mp) merged.add(mp);
    for (const c of acceptedMonedasMerged) {
      const t = c.trim();
      if (t) merged.add(t);
    }
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [currencyOptions, form.monedaPrecio, acceptedMonedasMerged]);

  if (!open) return null;

  function onPickProductPhoto(e: ChangeEvent<HTMLInputElement>) {
    void (async () => {
      const input = e.currentTarget;
      const picked = input.files ? Array.from(input.files) : [];
      input.value = "";
      if (!picked.length) return;
      const imageFiles = picked.filter((f) => f.type.startsWith("image/"));
      for (const file of picked) {
        if (!file.type.startsWith("image/")) {
          toast.error(`No es imagen: ${file.name}`);
        }
      }
      if (!imageFiles.length) return;
      setPhotoPendingCount(imageFiles.length);
      setUploadBusy(true);
      try {
        const added: ProductPhotoSlot[] = [];
        for (const file of imageFiles) {
          try {
            const uploaded = await uploadMedia(file);
            const url = mediaApiUrl(uploaded.id);
            added.push({
              id: newAttachmentId(),
              url,
              fileName: file.name,
              contentKind: "image",
            });
          } catch (e) {
            const msg =
              e instanceof Error && e.message
                ? e.message
                : `No se pudo subir: ${file.name}`;
            toast.error(msg);
          } finally {
            setPhotoPendingCount((c) => Math.max(0, c - 1));
          }
        }
        if (!added.length) return;
        const candidateUrls = [
          ...photoSlots.map((p) => p.url),
          ...added.map((a) => a.url),
        ];
        const candidateSnapshot = {
          ...form,
          photoUrls: candidateUrls,
          monedas: acceptedMonedasMerged,
        };
        const limitErr = assertEntityPayloadUnderLimit(
          candidateSnapshot,
          "Este producto",
        );
        if (limitErr) {
          toast.error(limitErr);
          return;
        }
        setPhotoSlots((prev) => [...prev, ...added]);
      } finally {
        setUploadBusy(false);
        setPhotoPendingCount(0);
      }
    })();
  }

  function removeProductPhoto(slotId: string) {
    setPhotoSlots((prev) => {
      const slot = prev.find((p) => p.id === slotId);
      if (slot) {
        if (isProtectedMediaUrl(slot.url)) releaseMediaObjectUrl(slot.url);
        revokeIfBlob(slot.url);
      }
      return prev.filter((p) => p.id !== slotId);
    });
  }

  function clearAllProductPhotos() {
    setPhotoSlots((prev) => {
      prev.forEach((p) => {
        if (isProtectedMediaUrl(p.url)) releaseMediaObjectUrl(p.url);
        revokeIfBlob(p.url);
      });
      return [];
    });
  }

  return (
    <>
      <UploadBlockingOverlay active={uploadBusy} />
      <div
        className="vt-modal-backdrop"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
      >
        <div
          className={modalShellWide}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="vt-modal-title">{title}</div>
          <div className={modalSub}>
            Campos de ficha de producto según el perfil de negocio (flow-ui).
          </div>
          <div className={modalFormBody}>
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              <label
                className={fieldRootWithInvalid(
                  showVal && form.transportIncluded === undefined,
                )}
              >
                <span className={fieldLabel}>
                  Transporte incluido <span className="vt-muted font-black">(obligatorio)</span>
                </span>
                <VtSelect
                  value={
                    form.transportIncluded === undefined
                      ? ""
                      : form.transportIncluded
                        ? "yes"
                        : "no"
                  }
                  onChange={(v) => {
                    if (v === "yes") setForm({ ...form, transportIncluded: true });
                    else if (v === "no")
                      setForm({ ...form, transportIncluded: false });
                    else setForm({ ...form, transportIncluded: undefined });
                  }}
                  ariaLabel="Transporte incluido en este producto"
                  placeholder="Seleccionar"
                  options={[
                    { value: "", label: "Seleccionar" },
                    { value: "yes", label: "Sí, transporte incluido" },
                    { value: "no", label: "No, transporte no incluido" },
                  ]}
                />
              </label>
              <label
                className={fieldRootWithInvalid(
                  showVal && form.category.trim().length < PROFILE_TITLE_MIN,
                )}
              >
                <span className={fieldLabel}>Categoría</span>
                <VtSelect
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                  ariaLabel="Categoría del producto"
                  placeholder="Seleccionar categoría"
                  options={[
                    { value: "", label: "Seleccionar categoría" },
                    ...categorySelectOptions.map((c) => ({
                      value: c,
                      label: c,
                    })),
                  ]}
                />
              </label>
              <label
                className={fieldRootWithInvalid(
                  showVal && form.name.trim().length < PROFILE_TITLE_MIN,
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
                <VtSelect
                  value={form.condition}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      condition: v as MerchandiseCondition,
                    })
                  }
                  ariaLabel="Estado del producto"
                  placeholder="Estado"
                  options={[
                    { value: "nuevo", label: "Nuevo" },
                    { value: "usado", label: "Usado" },
                    { value: "reacondicionado", label: "Reacondicionado" },
                  ]}
                />
              </label>
              <label
                className={fieldRootWithInvalid(showVal && !form.price.trim())}
              >
                <span className={fieldLabel}>Precio</span>
                <input
                  className="vt-input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
              <label
                className={fieldRootWithInvalid(
                  showVal && !(form.monedaPrecio ?? "").trim(),
                )}
              >
                <span className={fieldLabel}>Tipo de moneda (precio)</span>
                <VtSelect
                  value={form.monedaPrecio ?? ""}
                  onChange={(v) => setForm((prev) => ({ ...prev, monedaPrecio: v }))}
                  ariaLabel="Tipo de moneda del precio (obligatorio)"
                  placeholder="Seleccionar…"
                  options={[
                    { value: "", label: "Seleccionar moneda del precio…" },
                    ...allCurrencyCodes.map((c) => ({
                      value: c,
                      label: c,
                    })),
                  ]}
                />
              </label>
              <label
                className={cn(
                  fieldRootWithInvalid(
                    showVal &&
                      catalogMonedasList({
                        monedas: acceptedMonedasMerged,
                        moneda: form.moneda,
                      }).length < 1,
                  ),
                  "min-[560px]:col-span-2",
                )}
              >
                <span className={fieldLabel}>Monedas aceptadas</span>
                <VtMultiSelect
                  value={acceptedMonedasMerged}
                  onChange={(selected) =>
                    setMonedasExtras(
                      stripMonedaPrecioFromSelection(
                        selected,
                        form.monedaPrecio,
                      ),
                    )
                  }
                  ariaLabel="Monedas aceptadas para el pago (obligatorio)"
                  placeholder="Elige una o más…"
                  options={allCurrencyCodes.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              </label>
            </div>
            <label
              className={fieldRootWithInvalid(
                showVal &&
                  form.shortDescription.trim().length < PROFILE_DESC_MIN,
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
                showVal && form.mainBenefit.trim().length < PROFILE_DESC_MIN,
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
                showVal && form.technicalSpecs.trim().length < PROFILE_DESC_MIN,
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
                  (form.taxesShippingInstall ?? "").trim().length <
                    PROFILE_LINE_MIN,
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
                showVal && form.availability.trim().length < PROFILE_DESC_MIN,
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
                showVal && form.warrantyReturn.trim().length < PROFILE_DESC_MIN,
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
                showVal &&
                  form.contentIncluded.trim().length < PROFILE_DESC_MIN,
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
                showVal &&
                  form.usageConditions.trim().length < PROFILE_DESC_MIN,
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
                Sube una o varias imágenes desde tu dispositivo (puedes elegir
                varias a la vez). Quita archivos individuales o vacía toda la
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
              {photoSlots.length > 0 || photoPendingCount > 0 ? (
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    Vista previa ({photoSlots.length}
                    {photoPendingCount > 0
                      ? ` · subiendo ${photoPendingCount}`
                      : ""}
                    )
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {photoSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="relative w-[calc(50%-4px)] min-[480px]:w-[140px] shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)]"
                      >
                        <ProtectedMediaImg
                          src={slot.url}
                          alt=""
                          wrapperClassName="w-full"
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
                    {Array.from({ length: photoPendingCount }).map((_, i) => (
                      <div
                        key={`photo-pending-${i}`}
                        className="relative flex aspect-square w-[calc(50%-4px)] min-[480px]:w-[140px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]"
                      >
                        <Loader2
                          className="h-7 w-7 animate-spin text-[var(--muted)]"
                          aria-hidden
                        />
                        <span className="px-1 text-[9px] font-semibold text-[var(--muted)]">
                          Subiendo…
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <CustomFieldsEditor
              fields={form.customFields}
              onUploadingChange={setUploadBusy}
              onChange={(cf) => {
                const candidate = {
                  ...form,
                  customFields: cf,
                  monedas: acceptedMonedasMerged,
                };
                const payload = {
                  ...candidate,
                  photoUrls: photoSlots.map((p) => p.url),
                };
                const limitErr = assertEntityPayloadUnderLimit(
                  payload,
                  "Este producto",
                );
                if (limitErr) {
                  toast.error(limitErr);
                  return;
                }
                setForm({ ...form, customFields: cf });
              }}
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
                const monedas = catalogMonedasList({
                  monedas: acceptedMonedasMerged,
                  moneda: form.moneda,
                });
                const snapshot = {
                  ...form,
                  photoUrls: photoSlots.map((p) => p.url),
                  monedaPrecio: (form.monedaPrecio ?? "").trim() || undefined,
                  monedas: monedas.length ? monedas : undefined,
                };
                const err = validateProductForm(snapshot);
                if (err) {
                  toast.error(err);
                  setShowVal(true);
                  return;
                }
                const limitErr = assertEntityPayloadUnderLimit(
                  snapshot,
                  "Este producto",
                );
                if (limitErr) {
                  toast.error(limitErr);
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
    </>
  );
}
