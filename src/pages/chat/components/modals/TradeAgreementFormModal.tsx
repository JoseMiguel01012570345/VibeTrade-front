import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { fetchCatalogCategories } from "../../../../utils/market/fetchCatalogCategories";
import { cn } from "../../../../lib/cn";
import { onBackdropPointerClose } from "../../lib/modalClose";
import {
  checkRow,
  detailsBlock,
  fieldError,
  mapBackdropLayerAboveChatRail,
  modalFormBody,
  modalShellWide,
  modalSub,
  scopeRow,
} from "../../styles/formModalStyles";
import { MerchandiseLineEditor } from "./MerchandiseLineEditor";
import { ModalFormField as Field } from "./ModalFormField";
import type {
  MerchandiseLine,
  TradeAgreementDraft,
  TradeAgreementExtraFieldDraft,
} from "../../domain/tradeAgreementTypes";
import {
  defaultAgreementDraft,
  emptyMerchandiseLine,
  emptyServiceItem,
  emptyTradeAgreementExtraField,
  legacyCombinedExtraFields,
  merchandiseScopedExtraFields,
  rebuildExtraFieldsFromSections,
  serviceScopedExtraFields,
} from "../../domain/tradeAgreementTypes";
import type { TradeAgreementFormErrors } from "../../domain/tradeAgreementValidation";
import {
  hasValidationErrors,
  validateTradeAgreementDraft,
  validationErrorCount,
} from "../../domain/tradeAgreementValidation";
import type { StoreCatalog } from "../../domain/storeCatalogTypes";
import {
  mergeMerchandiseLineWithStoreProduct,
  mergeServiceItemWithStoreService,
} from "../../domain/storeCatalogTypes";
import { AgreementExtraFieldsEditor } from "./AgreementExtraFieldsEditor";
import { ServiceConfigWizard } from "./serviceConfig/ServiceConfigWizard";
import { ServiceItemPreview } from "./serviceConfig/ServiceItemPreview";
import { serviceItemSummaryLine } from "./serviceConfig/serviceItemFormat";

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
  /** Catálogo del vendedor (productos/servicios de ficha) para anclar líneas del acuerdo. */
  sellerCatalog?: StoreCatalog | null;
  /** Modo edición: borrador desde acuerdo `pending_buyer` o `rejected` (al guardar, vuelve a pendiente). */
  initialDraft?: TradeAgreementDraft | null;
  editingAgreementId?: string | null;
  /**
   * `Thread.offerId`: anuncio (producto/servicio de ficha) por el que el comprador abrió el chat; primero en el
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
  const [agrCategoryHints, setAgrCategoryHints] = useState<string[]>([]);
  const isEdit = !!editingAgreementId;
  const editBaselineJsonRef = useRef<string | null>(null);
  const contextDefaultAppliedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      contextDefaultAppliedRef.current = false;
    }
  }, [open]);

  /** Nuevo acuerdo: anclar a la ficha del anuncio con el que se abrió el hilo (mismo `id` que en catálogo). */
  useEffect(() => {
    if (!open || isEdit || initialDraft) return;
    if (contextDefaultAppliedRef.current) return;
    if (!contextOfferId || !sellerCatalog) return;
    const product = sellerCatalog.products.find((p) => p.id === contextOfferId);
    if (product) {
      contextDefaultAppliedRef.current = true;
      setDraft((d) => {
        if (d.merchandise[0]?.linkedStoreProductId) return d;
        const nextM = [...d.merchandise];
        nextM[0] = mergeMerchandiseLineWithStoreProduct(
          d.merchandise[0],
          product,
        );
        return { ...d, merchandise: nextM };
      });
      return;
    }
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
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const cats = await fetchCatalogCategories();
        if (!cancelled && cats.length > 0) setAgrCategoryHints(cats);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  const merchandiseCheckboxDisabled = sellerCatalog?.products.length === 0;
  const servicesCheckboxDisabled = sellerCatalog?.services.length === 0;

  function remapLegacyCombinedToActiveScope(
    rows: TradeAgreementExtraFieldDraft[] | undefined,
    scope: "merchandise" | "service",
  ): TradeAgreementExtraFieldDraft[] | undefined {
    if (!rows || rows.length === 0) return rows;
    let changed = false;
    const next = rows.map((r) => {
      if (r.scope !== "legacy_combined") return r;
      changed = true;
      return { ...r, scope };
    });
    return changed ? next : rows;
  }

  function setAgreementScope(scope: "merchandise" | "service") {
    setDraft((d) => {
      const includeMerchandise = scope === "merchandise";
      const includeService = scope === "service";
      const nextExtra = remapLegacyCombinedToActiveScope(d.extraFields, scope);
      return {
        ...d,
        includeMerchandise,
        includeService,
        services: includeService ? d.services : [],
        extraFields: includeMerchandise
          ? (nextExtra ?? []).filter((f) => f.scope !== "service")
          : (nextExtra ?? []).filter((f) => f.scope !== "merchandise"),
      };
    });
  }

  /** Borrador nuevo sin filas extras: una línea plantilla por cada bloque incluido (solo alta, no edición). */
  useEffect(() => {
    if (!open || editingAgreementId || initialDraft) return;
    setDraft((d) => {
      const prev = d.extraFields ?? [];
      if (prev.length > 0) return d;

      const leg: TradeAgreementExtraFieldDraft[] = [];
      const merch = d.includeMerchandise
        ? [emptyTradeAgreementExtraField("merchandise")]
        : [];
      const svc = d.includeService
        ? [emptyTradeAgreementExtraField("service")]
        : [];
      if (!merch.length && !svc.length) return d;

      return {
        ...d,
        extraFields: rebuildExtraFieldsFromSections(merch, svc, leg),
      };
    });
  }, [
    open,
    editingAgreementId,
    initialDraft,
    draft.includeMerchandise,
    draft.includeService,
  ]);

  useEffect(() => {
    if (!open || sellerCatalog == null) return;
    setDraft((d) => {
      let includeMerchandise = d.includeMerchandise;
      let includeService = d.includeService;
      let services = d.services;
      let extraFields = d.extraFields;
      if (sellerCatalog.products.length === 0 && includeMerchandise) {
        includeMerchandise = false;
        extraFields = (extraFields ?? []).filter(
          (f) => f.scope !== "merchandise",
        );
      }
      if (sellerCatalog.services.length === 0 && includeService) {
        includeService = false;
        if (services.length) services = [];
        extraFields = (extraFields ?? []).filter((f) => f.scope !== "service");
      }
      if (
        includeMerchandise === d.includeMerchandise &&
        includeService === d.includeService &&
        services === d.services &&
        extraFields === d.extraFields
      ) {
        return d;
      }
      return { ...d, includeMerchandise, includeService, services, extraFields };
    });
  }, [open, sellerCatalog]);

  if (!open) return null;

  const configItem = configId
    ? draft.services.find((s) => s.id === configId)
    : undefined;

  function setMerchLine(i: number, line: MerchandiseLine) {
    setDraft((d) => {
      const next = [...d.merchandise];
      next[i] = line;
      return { ...d, merchandise: next };
    });
  }

  function addLine() {
    setDraft((d) => ({
      ...d,
      merchandise: [...d.merchandise, emptyMerchandiseLine()],
    }));
  }

  function removeLine(i: number) {
    setDraft((d) => ({
      ...d,
      merchandise: d.merchandise.filter((_, j) => j !== i),
    }));
  }

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
          {isEdit ? "Editar acuerdo enviado" : "Emitir acuerdo de compra"}
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

          <div className={scopeRow} aria-label="Qué incluye este acuerdo">
            <label
              className={cn(
                checkRow,
                merchandiseCheckboxDisabled ? "cursor-not-allowed opacity-60" : "",
              )}
            >
              <input
                type="radio"
                name="agreement-scope"
                disabled={merchandiseCheckboxDisabled}
                title={
                  merchandiseCheckboxDisabled
                    ? "No hay productos en la ficha de la tienda; cargalos en la vitrina."
                    : undefined
                }
                checked={
                  merchandiseCheckboxDisabled ? false : draft.includeMerchandise
                }
                onChange={(e) => {
                  if (merchandiseCheckboxDisabled) return;
                  if (!e.target.checked) return;
                  setAgreementScope("merchandise");
                }}
              />
              <span>Incluir mercancías</span>
            </label>
            <label
              className={cn(
                checkRow,
                servicesCheckboxDisabled ? "cursor-not-allowed opacity-60" : "",
              )}
            >
              <input
                type="radio"
                name="agreement-scope"
                disabled={servicesCheckboxDisabled}
                title={
                  servicesCheckboxDisabled
                    ? "No hay servicios en la ficha de la tienda; cargalos en la vitrina."
                    : undefined
                }
                checked={
                  servicesCheckboxDisabled ? false : draft.includeService
                }
                onChange={(e) => {
                  if (servicesCheckboxDisabled) return;
                  if (!e.target.checked) return;
                  setAgreementScope("service");
                }}
              />
              <span>Incluir servicios</span>
            </label>
          </div>
          <p
            className="vt-muted"
            style={{ fontSize: 12, marginTop: 0, marginBottom: 12 }}
          >
            {merchandiseCheckboxDisabled && servicesCheckboxDisabled
              ? "No tienes productos ni servicios en la ficha: agregalos en tu tienda para poder incluirlos en el acuerdo."
              : "Elige si el acuerdo es de mercancías o de servicios. Solo se valida el bloque elegido."}
          </p>

          <details open={draft.includeMerchandise} className={detailsBlock}>
            <summary>Mercancías</summary>
            {draft.includeMerchandise ? (
              draft.merchandise.map((line, i) => (
                <MerchandiseLineEditor
                  key={`agr-line-${i}`}
                  lineIndex={i}
                  line={line}
                  errors={errors.merchandiseLines?.[i]}
                  onChange={(ln) => setMerchLine(i, ln)}
                  onRemove={() => removeLine(i)}
                  canRemove={draft.merchandise.length > 1}
                  sellerCatalog={sellerCatalog}
                  contextOfferId={contextOfferId}
                  linkedProductIdsUsedElsewhere={draft.merchandise
                    .map((l, j) => (j !== i ? l.linkedStoreProductId : undefined))
                    .filter((id): id is string => !!(id && id.trim()))}
                />
              ))
            ) : (
              <p className="vt-muted" style={{ fontSize: 13 }}>
                Marcá «Incluir mercancías» para completar líneas y logística.
              </p>
            )}
            {draft.includeMerchandise ? (
              <button type="button" className="vt-btn" onClick={addLine}>
                + Añadir tipo de mercancía
              </button>
            ) : null}
            {draft.includeMerchandise ? (
              <div className="mt-4 border-t border-[color-mix(in_oklab,var(--border)_80%,transparent)] pt-4">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  Otras características o cláusulas (mercancía)
                </div>
                <AgreementExtraFieldsEditor
                  newRowScope="merchandise"
                  fields={merchandiseScopedExtraFields(draft.extraFields)}
                  errors={localExtraFieldErrors(
                    merchandiseScopedExtraFields(draft.extraFields),
                    draft.extraFields,
                    errors.extraFieldsLines,
                  )}
                  onChange={(merchRows) =>
                    setDraft((d) => ({
                      ...d,
                      extraFields: rebuildExtraFieldsFromSections(
                        merchRows,
                        serviceScopedExtraFields(d.extraFields),
                        legacyCombinedExtraFields(d.extraFields),
                      ),
                    }))
                  }
                />
              </div>
            ) : null}
          </details>

          <details open={draft.includeService} className={detailsBlock}>
            <summary>Servicios</summary>
            {draft.includeService ? (
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
                          merchandiseScopedExtraFields(d.extraFields),
                          svcRows,
                          legacyCombinedExtraFields(d.extraFields),
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="vt-muted" style={{ fontSize: 13 }}>
                Marcá «Incluir servicios» para agregar y configurar servicios
                con el asistente.
              </p>
            )}
          </details>

          {legacyCombinedExtraFields(draft.extraFields).length > 0 ? (
            <details className={detailsBlock} open>
              <summary>Campos adicionales (versión previa conjunta)</summary>
              <p className="vt-muted mb-3 text-[13px]">
                Párrafos o adjuntos guardados antes de poder asignarlos solo al
                bloque de mercancía o solo al de servicio. Podés editarlos o eliminarlos.
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
                      merchandiseScopedExtraFields(d.extraFields),
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
