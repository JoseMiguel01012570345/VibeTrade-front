import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { UploadBlockingOverlay } from "../../../components/UploadBlockingOverlay";
import { assertEntityPayloadUnderLimit } from "../../../utils/media/payloadLimits";
import { HelpCircle } from "lucide-react";
import type { StoreService } from "../../chat/domain/storeCatalogTypes";
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
import { DEFAULT_CATALOG_CATEGORIES } from "../../../utils/market/fetchCatalogCategories";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { fixSplitLines } from "./helpers";

type Props = Readonly<{
  open: boolean;
  title: string;
  initial: Omit<StoreService, "id" | "storeId">;
  /** Categorías del backend (GET /api/v1/market/catalog-categories). */
  categoryOptions?: string[];
  onClose: () => void;
  onSave: (v: Omit<StoreService, "id" | "storeId">) => void;
}>;

export function ServiceEditorModal({
  open,
  title,
  initial,
  categoryOptions = [],
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState(() => ({
    ...initial,
    published: initial.published !== false,
  }));
  const [riesgosText, setRiesgosText] = useState(
    initial.riesgos.items.join("\n"),
  );
  const [depText, setDepText] = useState(initial.dependencias.items.join("\n"));
  const [showVal, setShowVal] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const categorySelectOptions = useMemo(() => {
    const base =
      categoryOptions.length > 0 ? categoryOptions : [...DEFAULT_CATALOG_CATEGORIES];
    const merged = new Set(
      base.map((c) => c.trim()).filter(Boolean),
    );
    if (form.category.trim()) merged.add(form.category.trim());
    return [...merged].sort((a, b) => a.localeCompare(b, "es"));
  }, [categoryOptions, form.category]);

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
            <CustomFieldsEditor
              fields={form.customFields}
              onUploadingChange={setUploadBusy}
              onChange={(cf) => {
                const next = { ...form, customFields: cf };
                const limitErr = assertEntityPayloadUnderLimit(
                  next,
                  "Este servicio",
                );
                if (limitErr) {
                  toast.error(limitErr);
                  return;
                }
                setForm(next);
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
                const snapshot: Omit<StoreService, "id" | "storeId"> = {
                  ...form,
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
