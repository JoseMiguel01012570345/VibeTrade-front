import { type ChangeEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  EyeOff,
  FileText,
  Globe,
  HelpCircle,
  Package,
  Pencil,
  Plus,
  Store,
  Trash2,
  Truck,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { useMarketStore } from "../../app/store/useMarketStore";
import type {
  OwnerStoreFormValues,
  StoreBadge,
} from "../../app/store/marketStoreTypes";
import type { MerchandiseCondition } from "../chat/domain/tradeAgreementTypes";
import {
  emptyStoreProductInput,
  emptyStoreServiceInput,
  type StoreCustomAttachment,
  type StoreCustomField,
  type StoreProduct,
  type StoreService,
} from "../chat/domain/storeCatalogTypes";
import {
  PROFILE_DESC_MIN,
  PROFILE_LINE_MIN,
  PROFILE_TITLE_MIN,
  validateOwnerStoreForm,
  validateProductForm,
  validateServiceForm,
} from "./profileStoreFormValidation";
import { onBackdropPointerClose } from "../chat/lib/modalClose";
import {
  checkRow,
  fieldLabel,
  fieldRootWithInvalid,
  modalFormBody,
  modalShellWide,
  modalSub,
  textareaMin,
} from "../chat/styles/formModalStyles";

const SUGGESTED_CATEGORIES = [
  "Cosechas",
  "Insumos",
  "Mercancías",
  "Alimentos",
  "B2B",
  "Servicios",
  "Asesoría",
  "Logística",
  "Transportista",
];

function fixSplitLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

type ProductPhotoSlot = { id: string; url: string; fileName: string };

function productPhotoSlotsFromUrls(urls: string[]): ProductPhotoSlot[] {
  return urls
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url, i) => ({
      id: `product-photo-existing-${i}`,
      url,
      fileName: `Foto ${i + 1}`,
    }));
}

function newAttachmentId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `at_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function fileToKind(file: File): StoreCustomAttachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "other";
}

function revokeIfBlob(url: string) {
  if (url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }
}

function CustomFieldsEditor({
  fields,
  onChange,
  showValidation,
}: {
  fields: StoreCustomField[];
  onChange: (next: StoreCustomField[]) => void;
  showValidation?: boolean;
}) {
  function patchField(idx: number, patch: Partial<StoreCustomField>) {
    onChange(fields.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function addAttachments(idx: number, fileList: FileList | File[] | null) {
    let files: File[] = [];
    if (fileList != null) {
      files = Array.isArray(fileList) ? fileList : Array.from(fileList);
    }
    if (!files.length) return;
    const row = fields[idx];
    const list = [...(row.attachments ?? [])];
    for (const file of files) {
      list.push({
        id: newAttachmentId(),
        url: URL.createObjectURL(file),
        fileName: file.name,
        kind: fileToKind(file),
      });
    }
    patchField(idx, { attachments: list });
  }

  function removeAttachment(idx: number, attachmentId: string) {
    const row = fields[idx];
    const hit = row.attachments?.find((a) => a.id === attachmentId);
    if (hit) revokeIfBlob(hit.url);
    const nextAtt = row.attachments?.filter((a) => a.id !== attachmentId);
    patchField(idx, { attachments: nextAtt?.length ? nextAtt : undefined });
  }

  function removeField(idx: number) {
    const row = fields[idx];
    row.attachments?.forEach((a) => revokeIfBlob(a.url));
    onChange(fields.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={fieldLabel}>
          Otros campos (título, texto embebido y archivos)
        </span>
        <button
          type="button"
          className="vt-btn vt-btn-sm"
          onClick={() => onChange([...fields, { title: "", body: "" }])}
        >
          <Plus size={14} /> Añadir campo
        </button>
      </div>
      <p className="vt-muted mb-2 text-[11px] leading-snug">
        Cada campo debe quedar completo antes de guardar. Subí imágenes o
        PDF/documentos con el botón; podés quitar o reemplazar archivos desde
        esta misma vista en modo edición.
      </p>
      <div className="flex flex-col gap-3">
        {fields.map((cf, idx) => {
          const idInput = `custom-field-upload-${idx}`;
          const titleInvalid =
            showValidation && cf.title.trim().length < PROFILE_TITLE_MIN;
          const bodyInvalid =
            showValidation && cf.body.trim().length < PROFILE_DESC_MIN;
          const hasPreview = !!(
            cf.title.trim() ||
            cf.body.trim() ||
            (cf.attachments?.length ?? 0) > 0
          );
          return (
            <div
              key={idx}
              className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3"
            >
              <label className={fieldRootWithInvalid(titleInvalid)}>
                <span className={fieldLabel}>Título del campo</span>
                <input
                  className="vt-input"
                  placeholder="Ej: Certificación orgánica"
                  value={cf.title}
                  onChange={(e) => patchField(idx, { title: e.target.value })}
                />
              </label>
              <label className={cn(fieldRootWithInvalid(bodyInvalid), "mt-2")}>
                <span className={fieldLabel}>Texto embebido</span>
                <textarea
                  className={cn("vt-input", textareaMin)}
                  placeholder={`Descripción o contexto (mín. ${PROFILE_DESC_MIN} caracteres al guardar)`}
                  value={cf.body}
                  onChange={(e) => patchField(idx, { body: e.target.value })}
                  rows={3}
                />
              </label>
              <label className={fieldRootWithInvalid(false)}>
                <span className={fieldLabel}>
                  Leyenda junto a adjuntos (opcional)
                </span>
                <input
                  className="vt-input mt-1"
                  placeholder="Ej: Vista del certificado 2024"
                  value={cf.attachmentNote ?? ""}
                  onChange={(e) =>
                    patchField(idx, { attachmentNote: e.target.value })
                  }
                />
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  id={idInput}
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={(e) => {
                    const input = e.currentTarget;
                    const picked = input.files ? Array.from(input.files) : [];
                    input.value = "";
                    addAttachments(idx, picked);
                  }}
                />
                <label
                  htmlFor={idInput}
                  className="vt-btn vt-btn-sm inline-flex cursor-pointer items-center gap-2"
                >
                  <Upload size={16} aria-hidden /> Subir fotos o documentos
                </label>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                  onClick={() => removeField(idx)}
                >
                  Eliminar este campo
                </button>
              </div>
              {hasPreview ? (
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    Vista previa
                  </div>
                  {cf.title.trim() ? (
                    <div className="mt-1 font-bold text-[var(--text)]">
                      {cf.title}
                    </div>
                  ) : null}
                  {cf.body.trim() ? (
                    <p className="vt-muted mt-1 whitespace-pre-wrap text-[13px] leading-snug">
                      {cf.body}
                    </p>
                  ) : null}
                  {cf.attachmentNote?.trim() ? (
                    <p className="mt-1 text-[12px] italic text-[var(--muted)]">
                      {cf.attachmentNote}
                    </p>
                  ) : null}
                  {(cf.attachments?.length ?? 0) > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cf.attachments!.map((att) => (
                        <div
                          key={att.id}
                          className="relative rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_85%,transparent)] p-1.5"
                        >
                          {att.kind === "image" ? (
                            <img
                              src={att.url}
                              alt=""
                              className="mx-auto max-h-28 max-w-[140px] rounded object-contain"
                            />
                          ) : (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex max-w-[180px] items-center gap-2 text-[12px] font-semibold text-[var(--primary)]"
                            >
                              <FileText size={18} aria-hidden />
                              <span className="truncate">{att.fileName}</span>
                            </a>
                          )}
                          <button
                            type="button"
                            className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[#b91c1c]"
                            title="Quitar archivo"
                            aria-label="Quitar archivo"
                            onClick={() => removeAttachment(idx, att.id)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoreFormModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: OwnerStoreFormValues;
  onClose: () => void;
  onSave: (v: OwnerStoreFormValues) => void;
}) {
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
              onSave(payload);
              onClose();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductEditorModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: Omit<StoreProduct, "id" | "storeId">;
  onClose: () => void;
  onSave: (v: Omit<StoreProduct, "id" | "storeId">) => void;
}) {
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
                showVal && form.category.trim().length < PROFILE_TITLE_MIN,
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
              showVal && form.shortDescription.trim().length < PROFILE_DESC_MIN,
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
              showVal && form.contentIncluded.trim().length < PROFILE_DESC_MIN,
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
              showVal && form.usageConditions.trim().length < PROFILE_DESC_MIN,
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
                id="product-main-photo"
                type="file"
                className="sr-only"
                accept="image/*"
                multiple
                onChange={onPickProductPhoto}
              />
              <label
                htmlFor="product-main-photo"
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

function ServiceEditorModal({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initial: Omit<StoreService, "id" | "storeId">;
  onClose: () => void;
  onSave: (v: Omit<StoreService, "id" | "storeId">) => void;
}) {
  const [form, setForm] = useState(initial);
  const [riesgosText, setRiesgosText] = useState(
    initial.riesgos.items.join("\n"),
  );
  const [depText, setDepText] = useState(initial.dependencias.items.join("\n"));
  const [showVal, setShowVal] = useState(false);

  if (!open) return null;

  const riesgosLines = fixSplitLines(riesgosText);
  const depLines = fixSplitLines(depText);

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
          Ficha de servicio (flow-ui). Si desmarcás riesgos o dependencias, esas
          listas no aplican.
        </div>
        <div className={modalFormBody}>
          <div className="grid gap-3 min-[560px]:grid-cols-2">
            <label
              className={fieldRootWithInvalid(
                showVal && form.category.trim().length < PROFILE_TITLE_MIN,
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
                showVal && form.tipoServicio.trim().length < PROFILE_TITLE_MIN,
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
              onChange={(e) => setForm({ ...form, noIncluye: e.target.value })}
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
              showVal && form.propIntelectual.trim().length < PROFILE_DESC_MIN,
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
              const riesgosItems = form.riesgos.enabled
                ? fixSplitLines(riesgosText)
                : [];
              const depItems = form.dependencias.enabled
                ? fixSplitLines(depText)
                : [];
              const draftForValidate: Omit<StoreService, "id" | "storeId"> = {
                ...form,
                riesgos: { enabled: form.riesgos.enabled, items: riesgosItems },
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
              const snapshot: Omit<StoreService, "id" | "storeId"> = {
                ...form,
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
              onSave(snapshot);
              onClose();
            }}
          >
            Guardar servicio
          </button>
        </div>
      </div>
    </div>
  );
}

function ownerStoreToFormValues(
  b: StoreBadge,
  pitch: string,
): OwnerStoreFormValues {
  return {
    name: b.name,
    categories: [...b.categories],
    categoryPitch: pitch,
    transportIncluded: b.transportIncluded,
  };
}

export function ProfileStoresSection({ ownerUserId }: { ownerUserId: string }) {
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const createOwnerStore = useMarketStore((s) => s.createOwnerStore);
  const updateOwnerStore = useMarketStore((s) => s.updateOwnerStore);
  const deleteOwnerStore = useMarketStore((s) => s.deleteOwnerStore);
  const addOwnerStoreProduct = useMarketStore((s) => s.addOwnerStoreProduct);
  const updateOwnerStoreProduct = useMarketStore(
    (s) => s.updateOwnerStoreProduct,
  );
  const removeOwnerStoreProduct = useMarketStore(
    (s) => s.removeOwnerStoreProduct,
  );
  const setOwnerStoreProductPublished = useMarketStore(
    (s) => s.setOwnerStoreProductPublished,
  );
  const addOwnerStoreService = useMarketStore((s) => s.addOwnerStoreService);
  const updateOwnerStoreService = useMarketStore(
    (s) => s.updateOwnerStoreService,
  );
  const removeOwnerStoreService = useMarketStore(
    (s) => s.removeOwnerStoreService,
  );

  const myStores = useMemo(
    () => Object.values(stores).filter((b) => b.ownerUserId === ownerUserId),
    [stores, ownerUserId],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editStoreId, setEditStoreId] = useState<string | null>(null);
  const [productCtx, setProductCtx] = useState<{
    storeId: string;
    productId?: string;
  } | null>(null);
  const [serviceCtx, setServiceCtx] = useState<{
    storeId: string;
    serviceId?: string;
  } | null>(null);

  const editingBadge = editStoreId ? stores[editStoreId] : undefined;
  const editingCat = editStoreId ? storeCatalogs[editStoreId] : undefined;

  const productStoreId = productCtx?.storeId;
  const productEditing =
    productStoreId && productCtx?.productId
      ? storeCatalogs[productStoreId]?.products.find(
          (p) => p.id === productCtx.productId,
        )
      : undefined;

  const serviceStoreId = serviceCtx?.storeId;
  const serviceEditing =
    serviceStoreId && serviceCtx?.serviceId
      ? storeCatalogs[serviceStoreId]?.services.find(
          (x) => x.id === serviceCtx.serviceId,
        )
      : undefined;

  return (
    <div className="vt-card vt-card-pad">
      <datalist id="store-cat-hints">
        {SUGGESTED_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="vt-h2">Mis tiendas</div>
          <p className="vt-muted mt-1.5 max-w-[640px] text-[13px] leading-snug">
            Podés configurar una o más tiendas: nombre, categorías, descripción
            del catálogo, estado de verificación (solo puede validarlo soporte),
            fecha de alta en la plataforma y transporte. En cada tienda añadí
            productos y servicios con el detalle del perfil de negocio.
          </p>
        </div>
        <button
          type="button"
          className="vt-btn vt-btn-primary inline-flex items-center gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={18} /> Nueva tienda
        </button>
      </div>
      <div className="vt-divider my-3" />

      {myStores.length === 0 ? (
        <p className="vt-muted text-[13px]">
          Todavía no creaste tiendas. Usá «Nueva tienda» para empezar.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {myStores.map((b) => {
            const cat = storeCatalogs[b.id];
            const joined = cat
              ? new Intl.DateTimeFormat("es", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(cat.joinedAt)
              : "—";
            return (
              <div
                key={b.id}
                className="rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <input
                      id={`store-avatar-${b.id}`}
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      aria-label={`Imagen de tienda ${b.name}`}
                      onChange={(e) => {
                        const input = e.currentTarget;
                        const picked = input.files
                          ? Array.from(input.files)
                          : [];
                        input.value = "";
                        const file = picked[0];
                        if (!file) {
                          return;
                        }
                        if (!file.type.startsWith("image/")) {
                          toast.error("Elegí un archivo de imagen.");
                          return;
                        }
                        const url = URL.createObjectURL(file);
                        const prev = b.avatarUrl;
                        if (
                          updateOwnerStore(b.id, ownerUserId, {
                            avatarUrl: url,
                          })
                        ) {
                          if (prev) {
                            revokeIfBlob(prev);
                          }
                          toast.success("Imagen de tienda actualizada");
                        } else {
                          revokeIfBlob(url);
                          toast.error("No se pudo guardar la imagen");
                        }
                      }}
                    />
                    <label
                      htmlFor={`store-avatar-${b.id}`}
                      className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
                      title="Tocar para subir foto de la tienda"
                    >
                      {b.avatarUrl ? (
                        <img
                          src={b.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store
                          size={22}
                          className="text-[var(--muted)]"
                          aria-hidden
                        />
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
                      <p className="mt-2 text-[13px] leading-snug">
                        {cat.pitch}
                      </p>
                    ) : null}
                    <div className="vt-muted mt-1 text-xs">
                      {b.categories.join(" · ")}
                    </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="vt-btn vt-btn-sm no-underline"
                      to={`/store/${b.id}`}
                    >
                      Ver tienda
                    </Link>
                    <button
                      type="button"
                      className="vt-btn vt-btn-sm inline-flex items-center gap-1"
                      onClick={() => setEditStoreId(b.id)}
                    >
                      <Pencil size={14} /> Editar datos
                    </button>
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost vt-btn-sm inline-flex items-center gap-1 text-[#b91c1c]"
                      onClick={() => {
                        if (
                          window.confirm(
                            "¿Eliminar esta tienda y su catálogo? No se puede deshacer.",
                          )
                        ) {
                          if (deleteOwnerStore(b.id, ownerUserId))
                            toast.success("Tienda eliminada");
                          else toast.error("No se pudo eliminar");
                        }
                      }}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    Productos
                  </div>
                  {cat && cat.products.length > 0 ? (
                    <ul className="mb-2 space-y-1.5 text-[13px]">
                      {cat.products.map((p) => (
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
                                if (
                                  setOwnerStoreProductPublished(
                                    b.id,
                                    ownerUserId,
                                    p.id,
                                    next,
                                  )
                                ) {
                                  toast.success(
                                    next
                                      ? "Producto publicado en la tienda"
                                      : "Producto oculto de la tienda",
                                  );
                                } else {
                                  toast.error("No se pudo actualizar");
                                }
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
                              onClick={() =>
                                setProductCtx({
                                  storeId: b.id,
                                  productId: p.id,
                                })
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                              onClick={() => {
                                if (
                                  removeOwnerStoreProduct(
                                    b.id,
                                    ownerUserId,
                                    p.id,
                                  )
                                )
                                  toast.success("Producto quitado");
                                else toast.error("No se pudo quitar");
                              }}
                            >
                              Quitar
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="vt-muted mb-2 text-xs">
                      Sin productos en catálogo.
                    </p>
                  )}
                  <button
                    type="button"
                    className="vt-btn vt-btn-sm inline-flex items-center gap-1"
                    onClick={() => setProductCtx({ storeId: b.id })}
                  >
                    <Plus size={14} /> Añadir producto
                  </button>
                </div>

                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    Servicios
                  </div>
                  {cat && cat.services.length > 0 ? (
                    <ul className="mb-2 space-y-1.5 text-[13px]">
                      {cat.services.map((sv) => (
                        <li
                          key={sv.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)] px-2 py-1.5"
                        >
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <Wrench
                              size={14}
                              className="shrink-0 opacity-70"
                              aria-hidden
                            />
                            <span className="truncate font-bold">
                              {sv.tipoServicio}
                            </span>
                          </span>
                          <span className="flex gap-1">
                            <button
                              type="button"
                              className="vt-btn vt-btn-ghost vt-btn-sm"
                              onClick={() =>
                                setServiceCtx({
                                  storeId: b.id,
                                  serviceId: sv.id,
                                })
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="vt-btn vt-btn-ghost vt-btn-sm text-[#b91c1c]"
                              onClick={() => {
                                if (
                                  removeOwnerStoreService(
                                    b.id,
                                    ownerUserId,
                                    sv.id,
                                  )
                                )
                                  toast.success("Servicio quitado");
                                else toast.error("No se pudo quitar");
                              }}
                            >
                              Quitar
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="vt-muted mb-2 text-xs">
                      Sin servicios en catálogo.
                    </p>
                  )}
                  <button
                    type="button"
                    className="vt-btn vt-btn-sm inline-flex items-center gap-1"
                    onClick={() => setServiceCtx({ storeId: b.id })}
                  >
                    <Plus size={14} /> Añadir servicio
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen ? (
        <StoreFormModal
          key="create-store"
          open
          title="Nueva tienda"
          initial={{
            name: "",
            categories: [],
            categoryPitch: "",
            transportIncluded: false,
          }}
          onClose={() => setCreateOpen(false)}
          onSave={(v) => {
            const id = createOwnerStore(ownerUserId, v);
            if (id) toast.success("Tienda creada");
            else toast.error("No se pudo crear");
          }}
        />
      ) : null}

      {editingBadge && editingCat && editStoreId ? (
        <StoreFormModal
          key={`edit-store-${editStoreId}`}
          open
          title="Editar tienda"
          initial={ownerStoreToFormValues(editingBadge, editingCat.pitch)}
          onClose={() => setEditStoreId(null)}
          onSave={(v) => {
            if (updateOwnerStore(editStoreId, ownerUserId, v))
              toast.success("Tienda actualizada");
            else toast.error("No se pudo guardar");
            setEditStoreId(null);
          }}
        />
      ) : null}

      {productCtx ? (
        <ProductEditorModal
          key={`${productCtx.storeId}-${productCtx.productId ?? "new"}`}
          open
          title={productEditing ? "Editar producto" : "Añadir producto"}
          initial={
            productEditing
              ? {
                  category: productEditing.category,
                  name: productEditing.name,
                  model: productEditing.model,
                  shortDescription: productEditing.shortDescription,
                  mainBenefit: productEditing.mainBenefit,
                  technicalSpecs: productEditing.technicalSpecs,
                  condition: productEditing.condition,
                  price: productEditing.price,
                  taxesShippingInstall: productEditing.taxesShippingInstall,
                  availability: productEditing.availability,
                  warrantyReturn: productEditing.warrantyReturn,
                  contentIncluded: productEditing.contentIncluded,
                  usageConditions: productEditing.usageConditions,
                  photoUrls: productEditing.photoUrls,
                  published: productEditing.published,
                  customFields: productEditing.customFields.length
                    ? productEditing.customFields
                    : [],
                }
              : emptyStoreProductInput()
          }
          onClose={() => setProductCtx(null)}
          onSave={(input) => {
            if (productCtx.productId) {
              updateOwnerStoreProduct(
                productCtx.storeId,
                ownerUserId,
                productCtx.productId,
                input,
              );
              toast.success("Producto actualizado");
            } else {
              addOwnerStoreProduct(productCtx.storeId, ownerUserId, input);
              toast.success("Producto añadido");
            }
          }}
        />
      ) : null}

      {serviceCtx ? (
        <ServiceEditorModal
          key={`${serviceCtx.storeId}-${serviceCtx.serviceId ?? "new"}`}
          open
          title={serviceEditing ? "Editar servicio" : "Añadir servicio"}
          initial={
            serviceEditing
              ? {
                  category: serviceEditing.category,
                  tipoServicio: serviceEditing.tipoServicio,
                  descripcion: serviceEditing.descripcion,
                  riesgos: { ...serviceEditing.riesgos },
                  incluye: serviceEditing.incluye,
                  noIncluye: serviceEditing.noIncluye,
                  dependencias: { ...serviceEditing.dependencias },
                  entregables: serviceEditing.entregables,
                  garantias: { ...serviceEditing.garantias },
                  propIntelectual: serviceEditing.propIntelectual,
                  customFields: serviceEditing.customFields.length
                    ? serviceEditing.customFields
                    : [],
                }
              : emptyStoreServiceInput()
          }
          onClose={() => setServiceCtx(null)}
          onSave={(input) => {
            if (serviceCtx.serviceId) {
              updateOwnerStoreService(
                serviceCtx.storeId,
                ownerUserId,
                serviceCtx.serviceId,
                input,
              );
              toast.success("Servicio actualizado");
            } else {
              addOwnerStoreService(serviceCtx.storeId, ownerUserId, input);
              toast.success("Servicio añadido");
            }
          }}
        />
      ) : null}
    </div>
  );
}
