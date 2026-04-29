import { type ChangeEvent, useId, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HelpCircle, Loader2, Upload, X } from "lucide-react";
import { UploadBlockingOverlay } from "../../../components/UploadBlockingOverlay";
import { ProtectedMediaImg } from "../../../components/media/ProtectedMediaImg";
import { assertEntityPayloadUnderLimit } from "../../../utils/media/payloadLimits";
import {
  uploadMedia,
  mediaApiUrl,
  isProtectedMediaUrl,
  releaseMediaObjectUrl,
} from "../../../utils/media/mediaClient";
import {
  catalogMonedasList,
  type StoreService,
} from "../../chat/domain/storeCatalogTypes";
import {
  PROFILE_DESC_MIN,
  PROFILE_TITLE_MIN,
  validateServiceForm,
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
import { VtMultiSelect } from "../../../components/VtMultiSelect";
import { formServiceQualifiesAsTransport } from "../../../utils/user/transportEligibility";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import {
  fixSplitLines,
  newAttachmentId,
  productPhotoSlotsFromUrls,
  revokeIfBlob,
  serviceCatalogImagePhotoUrlsFromSlots,
  type ProductPhotoSlot,
} from "./helpers";

type Props = Readonly<{
  open: boolean;
  title: string;
  initial: Omit<StoreService, "id" | "storeId">;
  /** Categorías del backend (GET /api/v1/market/catalog-categories). */
  categoryOptions?: string[];
  /** Monedas del backend (GET /api/v1/market/currencies). */
  currencyOptions?: string[];
  onClose: () => void;
  onSave: (v: Omit<StoreService, "id" | "storeId">) => void;
}>;

export function ServiceEditorModal({
  open,
  title,
  initial,
  categoryOptions = [],
  currencyOptions = [],
  onClose,
  onSave,
}: Props) {
  const photoInputId = useId();
  const [form, setForm] = useState(() => ({
    ...initial,
    published: initial.published !== false,
  }));
  const [riesgosText, setRiesgosText] = useState(
    initial.riesgos.items.join("\n"),
  );
  const [depText, setDepText] = useState(initial.dependencias.items.join("\n"));
  const [photoSlots, setPhotoSlots] = useState<ProductPhotoSlot[]>(() =>
    productPhotoSlotsFromUrls(initial.photoUrls ?? []),
  );
  const [photoPendingCount, setPhotoPendingCount] = useState(0);
  const [showVal, setShowVal] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  function onPickServicePhoto(e: ChangeEvent<HTMLInputElement>) {
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
          } catch (err) {
            const msg =
              err instanceof Error && err.message
                ? err.message
                : `No se pudo subir: ${file.name}`;
            toast.error(msg);
          } finally {
            setPhotoPendingCount((c) => Math.max(0, c - 1));
          }
        }
        if (!added.length) return;
        const candidateUrls = [
          ...serviceCatalogImagePhotoUrlsFromSlots(photoSlots),
          ...added.map((a) => a.url),
        ];
        const candidateSnapshot = { ...form, photoUrls: candidateUrls };
        const limitErr = assertEntityPayloadUnderLimit(
          candidateSnapshot,
          "Este servicio",
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

  function removeServicePhoto(slotId: string) {
    setPhotoSlots((prev) => {
      const slot = prev.find((p) => p.id === slotId);
      if (slot) {
        if (isProtectedMediaUrl(slot.url)) releaseMediaObjectUrl(slot.url);
        revokeIfBlob(slot.url);
      }
      return prev.filter((p) => p.id !== slotId);
    });
  }

  function clearAllServicePhotos() {
    setPhotoSlots((prev) => {
      prev.forEach((p) => {
        if (isProtectedMediaUrl(p.url)) releaseMediaObjectUrl(p.url);
        revokeIfBlob(p.url);
      });
      return [];
    });
  }

  const categorySelectOptions = useMemo(() => {
    const base = categoryOptions.length > 0 ? categoryOptions : [];
    const merged = new Set(base.map((c) => c.trim()).filter(Boolean));
    if (form.category.trim()) merged.add(form.category.trim());
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [categoryOptions, form.category]);

  const currencySelectOptions = useMemo(() => {
    const merged = new Set<string>(
      currencyOptions.map((c) => c.trim()).filter(Boolean),
    );
    for (const c of form.monedas ?? []) {
      const t = c.trim();
      if (t) merged.add(t);
    }
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [currencyOptions, form.monedas]);

  const qualifiesTransport = useMemo(
    () =>
      formServiceQualifiesAsTransport({
        category: form.category,
        tipoServicio: form.tipoServicio,
      }),
    [form.category, form.tipoServicio],
  );

  const servicePhotoUrls = useMemo(
    () => serviceCatalogImagePhotoUrlsFromSlots(photoSlots),
    [photoSlots],
  );

  if (!open) return null;

  const riesgosLines = fixSplitLines(riesgosText);
  const depLines = fixSplitLines(depText);

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
            Ficha de servicio (flow-ui). Si desmarcás riesgos o dependencias,
            esas listas no aplican.
          </div>
          <div className={modalFormBody}>
            <div className="grid gap-3 min-[560px]:grid-cols-2">
              <label
                className={fieldRootWithInvalid(
                  showVal && form.category.trim().length < PROFILE_TITLE_MIN,
                )}
              >
                <span className={fieldLabel}>Categoría</span>
                <VtSelect
                  value={form.category}
                  onChange={(v) => setForm({ ...form, category: v })}
                  ariaLabel="Categoría del servicio"
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
                  showVal &&
                    form.tipoServicio.trim().length < PROFILE_TITLE_MIN,
                )}
              >
                <span className={fieldLabel}>Tipo de servicio</span>
                <input
                  className="vt-input"
                  value={form.tipoServicio}
                  onChange={(e) =>
                    setForm({ ...form, tipoServicio: e.target.value })
                  }
                />
              </label>
              <label
                className={fieldRootWithInvalid(
                  showVal &&
                    catalogMonedasList({
                      monedas: form.monedas,
                      moneda: form.moneda,
                    }).length < 1,
                )}
              >
                <span className={fieldLabel}>Monedas aceptadas</span>
                <VtMultiSelect
                  value={form.monedas ?? []}
                  onChange={(monedas) => setForm({ ...form, monedas })}
                  ariaLabel="Monedas aceptadas para el pago (obligatorio)"
                  placeholder="Elige una o más…"
                  options={currencySelectOptions.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              </label>
            </div>
            <label
              className={fieldRootWithInvalid(
                showVal && form.descripcion.trim().length < PROFILE_DESC_MIN,
              )}
            >
              <span className={fieldLabel}>Descripción del servicio</span>
              <textarea
                className={cn("vt-input", textareaMin)}
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                rows={4}
              />
            </label>
            <label className={checkRow}>
              <input
                type="checkbox"
                checked={form.riesgos.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    riesgos: { ...form.riesgos, enabled: e.target.checked },
                  })
                }
              />
              <span>Configurar riesgos del servicio</span>
            </label>
            {form.riesgos.enabled ? (
              <label
                className={fieldRootWithInvalid(
                  showVal && form.riesgos.enabled && riesgosLines.length < 1,
                )}
              >
                <span className={fieldLabel}>
                  Riesgos (una descripción por línea)
                </span>
                <textarea
                  className={cn("vt-input", textareaMin)}
                  value={riesgosText}
                  onChange={(e) => setRiesgosText(e.target.value)}
                  rows={4}
                />
              </label>
            ) : null}
            <label
              className={fieldRootWithInvalid(
                showVal && form.incluye.trim().length < PROFILE_DESC_MIN,
              )}
            >
              <span className={fieldLabel}>Qué incluye</span>
              <textarea
                className={cn("vt-input", textareaMin)}
                value={form.incluye}
                onChange={(e) => setForm({ ...form, incluye: e.target.value })}
                rows={2}
              />
            </label>
            <label
              className={fieldRootWithInvalid(
                showVal && form.noIncluye.trim().length < PROFILE_DESC_MIN,
              )}
            >
              <span className={fieldLabel}>Qué no incluye</span>
              <textarea
                className={cn("vt-input", textareaMin)}
                value={form.noIncluye}
                onChange={(e) =>
                  setForm({ ...form, noIncluye: e.target.value })
                }
                rows={2}
              />
            </label>
            <label className={checkRow}>
              <input
                type="checkbox"
                checked={form.dependencias.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dependencias: {
                      ...form.dependencias,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              <span>Configurar dependencias</span>
            </label>
            {form.dependencias.enabled ? (
              <label
                className={fieldRootWithInvalid(
                  showVal && form.dependencias.enabled && depLines.length < 1,
                )}
              >
                <span className={fieldLabel}>Dependencias (una por línea)</span>
                <textarea
                  className={cn("vt-input", textareaMin)}
                  value={depText}
                  onChange={(e) => setDepText(e.target.value)}
                  rows={4}
                />
              </label>
            ) : null}
            <label
              className={fieldRootWithInvalid(
                showVal && form.entregables.trim().length < PROFILE_DESC_MIN,
              )}
            >
              <span className={fieldLabel}>Qué se entrega</span>
              <textarea
                className={cn("vt-input", textareaMin)}
                value={form.entregables}
                onChange={(e) =>
                  setForm({ ...form, entregables: e.target.value })
                }
                rows={2}
              />
            </label>
            <label className={checkRow}>
              <input
                type="checkbox"
                checked={form.garantias.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    garantias: { ...form.garantias, enabled: e.target.checked },
                  })
                }
              />
              <span>Ofrezco garantías</span>
            </label>
            {form.garantias.enabled ? (
              <label
                className={fieldRootWithInvalid(
                  showVal &&
                    form.garantias.enabled &&
                    form.garantias.texto.trim().length < PROFILE_DESC_MIN,
                )}
              >
                <span className={fieldLabel}>Texto de garantías</span>
                <textarea
                  className={cn("vt-input", textareaMin)}
                  value={form.garantias.texto}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      garantias: { ...form.garantias, texto: e.target.value },
                    })
                  }
                  rows={2}
                />
              </label>
            ) : null}
            <label
              className={fieldRootWithInvalid(
                showVal &&
                  form.propIntelectual.trim().length < PROFILE_DESC_MIN,
              )}
            >
              <span className="inline-flex items-center gap-2">
                Propiedad intelectual
                <span
                  className="text-[var(--muted)]"
                  title="¿Quién es dueño del resultado?, ¿reutilización?, licencias — flow-ui"
                >
                  <HelpCircle size={16} aria-hidden />
                </span>
              </span>
              <textarea
                className={cn("vt-input", textareaMin)}
                value={form.propIntelectual}
                onChange={(e) =>
                  setForm({ ...form, propIntelectual: e.target.value })
                }
                rows={3}
              />
            </label>
            <div
              className={fieldRootWithInvalid(
                showVal &&
                  qualifiesTransport &&
                  servicePhotoUrls.filter((u) => u.trim()).length < 1,
              )}
            >
              <span className={fieldLabel}>
                Fotos del servicio
                {qualifiesTransport ?
                  " (obligatorio: al menos una imagen)"
                : " (opcional)"}
              </span>
              <p className="vt-muted mb-2 text-[11px] leading-snug">
                {qualifiesTransport ?
                  "Los servicios de transporte o logística deben incluir al menos una foto. Se muestran en la ficha pública y en la oferta."
                : "Puedes sumar varias imágenes; se muestran en la ficha pública y en la oferta."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={photoInputId}
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  multiple
                  onChange={onPickServicePhoto}
                />
                <label
                  htmlFor={photoInputId}
                  className="vt-btn vt-btn-sm inline-flex cursor-pointer items-center gap-2"
                >
                  <Upload size={16} aria-hidden /> Añadir fotos
                </label>
                {photoSlots.length ?
                  <button
                    type="button"
                    className="vt-btn vt-btn-ghost vt-btn-sm text-[var(--muted)]"
                    onClick={clearAllServicePhotos}
                  >
                    Quitar todas
                  </button>
                : null}
              </div>
              {photoSlots.length > 0 || photoPendingCount > 0 ?
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    Vista previa ({photoSlots.length}
                    {photoPendingCount > 0 ?
                      ` · subiendo ${photoPendingCount}`
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
                          onClick={() => removeServicePhoto(slot.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: photoPendingCount }).map((_, i) => (
                      <div
                        key={`svc-photo-pending-${i}`}
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
              : null}
            </div>
            <CustomFieldsEditor
              fields={form.customFields}
              onUploadingChange={setUploadBusy}
              onChange={(cf) => {
                const next = {
                  ...form,
                  customFields: cf,
                  photoUrls: serviceCatalogImagePhotoUrlsFromSlots(photoSlots),
                };
                const limitErr = assertEntityPayloadUnderLimit(
                  next,
                  "Este servicio",
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
                const riesgosItems = form.riesgos.enabled
                  ? fixSplitLines(riesgosText)
                  : [];
                const depItems = form.dependencias.enabled
                  ? fixSplitLines(depText)
                  : [];
                const draftForValidate: Omit<StoreService, "id" | "storeId"> = {
                  ...form,
                  photoUrls: serviceCatalogImagePhotoUrlsFromSlots(photoSlots),
                  riesgos: {
                    enabled: form.riesgos.enabled,
                    items: riesgosItems,
                  },
                  dependencias: {
                    enabled: form.dependencias.enabled,
                    items: depItems,
                  },
                  garantias: form.garantias,
                };
                const err = validateServiceForm(
                  draftForValidate,
                  riesgosText.split("\n"),
                  depText.split("\n"),
                );
                if (err) {
                  toast.error(err);
                  setShowVal(true);
                  return;
                }
                setShowVal(false);
                const monedas = catalogMonedasList({ monedas: form.monedas });
                const snapshot: Omit<StoreService, "id" | "storeId"> = {
                  ...form,
                  photoUrls: serviceCatalogImagePhotoUrlsFromSlots(photoSlots),
                  monedas: monedas.length ? monedas : undefined,
                  published: form.published !== false,
                  riesgos: {
                    enabled: form.riesgos.enabled && riesgosItems.length > 0,
                    items: riesgosItems,
                  },
                  dependencias: {
                    enabled: form.dependencias.enabled && depItems.length > 0,
                    items: depItems,
                  },
                  garantias: {
                    enabled:
                      form.garantias.enabled && !!form.garantias.texto.trim(),
                    texto: form.garantias.texto,
                  },
                };
                const limitErr = assertEntityPayloadUnderLimit(
                  snapshot,
                  "Este servicio",
                );
                if (limitErr) {
                  toast.error(limitErr);
                  return;
                }
                onSave(snapshot);
                onClose();
              }}
            >
              Guardar servicio
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
