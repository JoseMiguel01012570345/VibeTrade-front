import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useCatalogCategories } from "@features/catalog/hooks/useCatalogCategories";
import { cn } from "@shared/lib/cn";
import { onBackdropPointerClose } from '@shared/lib/modals/modalClose';
import {
  detailsBlock,
  fieldError,
  mapBackdropLayerAboveChatRail,
  modalFormBody,
  modalShellWide,
  modalSub,
} from '@shared/styles/modals/formModalStyles';
import { ModalFormField as Field } from "./ModalFormField";
import type { TradeAgreementDraft, TradeAgreementExtraFieldDraft } from "@features/chat/Dtos/agreement/tradeAgreementTypes";
import {
  defaultAgreementDraft,
  emptyServiceItem,
  emptyTradeAgreementExtraField,
  legacyCombinedExtraFields,
  rebuildExtraFieldsFromSections,
  serviceScopedExtraFields,
} from "@features/chat/logic/agreement/tradeAgreementTypes";
import type { TradeAgreementFormErrors } from "@features/chat/Dtos/agreement/tradeAgreementValidationTypes";
import {
  hasValidationErrors,
  validateTradeAgreementDraft,
  validationErrorCount,
} from "@features/chat/logic/agreement/tradeAgreementValidation";
import type { StoreCatalog } from "@features/market/logic/storeCatalogTypes";
import { mergeServiceItemWithStoreService } from "@features/market/logic/storeCatalogTypes";
import { AgreementExtraFieldsEditor } from "./AgreementExtraFieldsEditor";
import { ServiceConfigWizard } from "./serviceConfig/ServiceConfigWizard";
import { ServiceItemPreview } from "./serviceConfig/ServiceItemPreview";
import { serviceItemSummaryLine } from "@features/chat/logic/agreement/serviceItemFormat";

function localExtraFieldErrors(
  slice: TradeAgreementExtraFieldDraft[],
  all: TradeAgreementExtraFieldDraft[] | undefined,
  global: Record<number, string> | undefined,
): Record<number, string> | undefined {
  if (!global || !all?.length) return undefined;
  const out: Record<number, string> = {};
  slice.forEach((row, localI) => {
    const g = all.findIndex((x) => x.id === row.id);
    if (g >= 0 && global[g]) out[localI] = global[g];
  });
  return Object.keys(out).length ? out : undefined;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Devolvé `true` si el guardado/emisión fue exitoso (se cierra el modal). */
  onSubmit: (draft: TradeAgreementDraft) => boolean | Promise<boolean>;
  storeName: string;
  /** Catálogo del vendedor (servicios de ficha) para anclar ítems del acuerdo. */
  sellerCatalog?: StoreCatalog | null;
  /** Modo edición: borrador desde acuerdo `pending_buyer` o `rejected` (al guardar, vuelve a pendiente). */
  initialDraft?: TradeAgreementDraft | null;
  editingAgreementId?: string | null;
  /**
   * `Thread.offerId`: anuncio (servicio de ficha) por el que el comprador abrió el chat; primero en el
   * desplegable y anclado por defecto al emitir un acuerdo nuevo.
   */
  contextOfferId?: string | null;
};

export function TradeAgreementFormModal({
  open,
  onClose,
  onSubmit,
  storeName,
  sellerCatalog = null,
  initialDraft = null,
  editingAgreementId = null,
  contextOfferId = null,
}: Props) {
  const [draft, setDraft] = useState<TradeAgreementDraft>(() =>
    defaultAgreementDraft(),
  );
  const [errors, setErrors] = useState<TradeAgreementFormErrors>({});
  const [configOpen, setConfigOpen] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const categoriesQuery = useCatalogCategories({ enabled: open });
  const agrCategoryHints = categoriesQuery.data ?? [];
  const isEdit = !!editingAgreementId;
  const editBaselineJsonRef = useRef<string | null>(null);
  const contextDefaultAppliedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      contextDefaultAppliedRef.current = false;
    }
  }, [open]);

  /** Nuevo acuerdo: anclar al servicio de la ficha con la que se abrió el hilo (mismo `id` que en catálogo). */
  useEffect(() => {
    if (!open || isEdit || initialDraft) return;
    if (contextDefaultAppliedRef.current) return;
    if (!contextOfferId || !sellerCatalog) return;
    const service = sellerCatalog.services.find(
      (s) => s.id === contextOfferId,
    );
    if (service) {
      contextDefaultAppliedRef.current = true;
      setDraft((d) => {
        if (d.services.length > 0) return d;
        return {
          ...d,
          services: [
            mergeServiceItemWithStoreService(emptyServiceItem(), service),
          ],
        };
      });
    }
  }, [open, isEdit, initialDraft, contextOfferId, sellerCatalog]);

  useEffect(() => {
    if (open) {
      const d = initialDraft
        ? (JSON.parse(JSON.stringify(initialDraft)) as TradeAgreementDraft)
        : defaultAgreementDraft();
      setDraft(d);
      setErrors({});
      setConfigOpen(false);
      setConfigId(null);
      editBaselineJsonRef.current =
        editingAgreementId && initialDraft ? JSON.stringify(d) : null;
    }
  }, [open, initialDraft, editingAgreementId]);

  /** Borrador nuevo sin filas extras: una fila plantilla de servicio (solo alta, no edición). */
  useEffect(() => {
    if (!open || editingAgreementId || initialDraft) return;
    setDraft((d) => {
      const prev = d.extraFields ?? [];
      if (prev.length > 0) return d;
      return {
        ...d,
        extraFields: rebuildExtraFieldsFromSections(
          [emptyTradeAgreementExtraField("service")],
          [],
        ),
      };
    });
  }, [open, editingAgreementId, initialDraft]);

  if (!open) return null;

  const configItem = configId
    ? draft.services.find((s) => s.id === configId)
    : undefined;

  function addService() {
    const item = emptyServiceItem();
    const svc =
      sellerCatalog && contextOfferId
        ? sellerCatalog.services.find((x) => x.id === contextOfferId)
        : undefined;
    const toAdd =
      svc && draft.services.length === 0
        ? mergeServiceItemWithStoreService(item, svc)
        : item;
    setDraft((d) => ({ ...d, services: [...d.services, toAdd] }));
    setConfigId(toAdd.id);
    setConfigOpen(true);
  }

  function removeService(id: string) {
    setDraft((d) => ({
      ...d,
      services: d.services.filter((s) => s.id !== id),
    }));
    if (configId === id) {
      setConfigId(null);
      setConfigOpen(false);
    }
  }

  function openConfig(id: string) {
    setConfigId(id);
    setConfigOpen(true);
  }

  async function trySubmit() {
    const e = validateTradeAgreementDraft(draft, { sellerCatalog });
    setErrors(e);
    if (hasValidationErrors(e)) {
      const n = validationErrorCount(e);
      toast.error(`Revisa el formulario (${n} error${n === 1 ? "" : "es"})`);
      return;
    }
    if (isEdit && editBaselineJsonRef.current !== null) {
      if (JSON.stringify(draft) === editBaselineJsonRef.current) {
        toast.error("No hay cambios para guardar.");
        return;
      }
    }
    const result = onSubmit(draft);
    const ok = result instanceof Promise ? await result : result;
    if (ok) onClose();
  }

  return (
    <div
      className={mapBackdropLayerAboveChatRail}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide}>
        <div className="vt-modal-title">
          {isEdit ? "Editar acuerdo enviado" : "Emitir acuerdo de servicios"}
        </div>
        <div className={modalSub}>
          {isEdit ? (
            <>
              Puedes guardar si el acuerdo está <b>pendiente</b> o fue{" "}
              <b>rechazado</b> (en ese caso volverá a quedar pendiente para el
              comprador). Si ya fue <b>aceptado</b>, no se puede modificar.
            </>
          ) : (
            <>
              Emitido por <b>{storeName}</b>. El comprador podrá aceptar o
              rechazar. Todos los campos obligatorios deben completarse según el
              tipo de dato.
            </>
          )}
        </div>

        <div className={modalFormBody}>
          <datalist id="agr-cat-hints">
            {agrCategoryHints.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Field
            label="Título del acuerdo"
            value={draft.title}
            onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
            error={errors.title}
            inputId="agr-title"
          />

          {errors.scope ? (
            <div className={cn(fieldError, "mb-2")} role="alert">
              {errors.scope}
            </div>
          ) : null}

          <details open className={detailsBlock}>
            <summary>Servicios</summary>
            <div className="flex flex-col gap-3">
              {errors.serviceItems ? (
                <div className={fieldError} role="alert">
                  {errors.serviceItems}
                </div>
              ) : null}

              {draft.services.map((sv, i) => (
                <div
                  key={sv.id}
                  className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 font-extrabold tracking-[-0.02em]">
                      Servicio {i + 1}: {serviceItemSummaryLine(sv)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="vt-btn vt-btn-sm"
                        onClick={() => openConfig(sv.id)}
                      >
                        Configurar servicio
                      </button>
                      <button
                        type="button"
                        className="vt-btn vt-btn-ghost vt-btn-sm text-[var(--muted)]"
                        onClick={() => removeService(sv.id)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  {sv.configured ? (
                    <div className="mt-2 border-t border-[var(--border)] pt-3">
                      <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                        Vista previa
                      </div>
                      <ServiceItemPreview sv={sv} />
                    </div>
                  ) : (
                    <p className="vt-muted text-xs">
                      Usa «Configurar servicio» para completar el asistente y
                      generar la vista previa.
                    </p>
                  )}
                </div>
              ))}

              <button type="button" className="vt-btn" onClick={addService}>
                + Añadir servicio
              </button>

              <div className="border-t border-[color-mix(in_oklab,var(--border)_80%,transparent)] pt-4">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Otras características o cláusulas (servicio)
                </div>
                <AgreementExtraFieldsEditor
                  newRowScope="service"
                  fields={serviceScopedExtraFields(draft.extraFields)}
                  errors={localExtraFieldErrors(
                    serviceScopedExtraFields(draft.extraFields),
                    draft.extraFields,
                    errors.extraFieldsLines,
                  )}
                  onChange={(svcRows) =>
                    setDraft((d) => ({
                      ...d,
                      extraFields: rebuildExtraFieldsFromSections(
                        svcRows,
                        legacyCombinedExtraFields(d.extraFields),
                      ),
                    }))
                  }
                />
              </div>
            </div>
          </details>

          {legacyCombinedExtraFields(draft.extraFields).length > 0 ? (
            <details className={detailsBlock} open>
              <summary>Campos adicionales (versión previa conjunta)</summary>
              <p className="vt-muted mb-3 text-[13px]">
                Párrafos o adjuntos guardados en una versión anterior del acuerdo.
                Podés editarlos o eliminarlos.
              </p>
              <AgreementExtraFieldsEditor
                newRowScope="legacy_combined"
                fields={legacyCombinedExtraFields(draft.extraFields)}
                errors={localExtraFieldErrors(
                  legacyCombinedExtraFields(draft.extraFields),
                  draft.extraFields,
                  errors.extraFieldsLines,
                )}
                onChange={(legRows) =>
                  setDraft((d) => ({
                    ...d,
                    extraFields: rebuildExtraFieldsFromSections(
                      serviceScopedExtraFields(d.extraFields),
                      legRows,
                    ),
                  }))
                }
              />
            </details>
          ) : null}
        </div>

        <div className="vt-modal-actions">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={trySubmit}
          >
            {isEdit ? "Guardar cambios" : "Emitir acuerdo"}
          </button>
        </div>
      </div>

      {configItem ? (
        <ServiceConfigWizard
          open={configOpen && !!configItem}
          initial={configItem}
          categoryListId="agr-cat-hints"
          sellerCatalog={sellerCatalog}
          contextOfferId={contextOfferId}
          excludeLinkedServiceIds={
            configItem
              ? draft.services
                  .filter((s) => s.id !== configItem.id)
                  .map((s) => s.linkedStoreServiceId)
                  .filter((id): id is string => !!(id && id.trim()))
              : []
          }
          onClose={() => {
            setConfigOpen(false);
            setConfigId(null);
          }}
          onSave={(item) => {
            setDraft((d) => ({
              ...d,
              services: d.services.map((s) => (s.id === item.id ? item : s)),
            }));
            setConfigOpen(false);
            setConfigId(null);
          }}
        />
      ) : null}
    </div>
  );
}
