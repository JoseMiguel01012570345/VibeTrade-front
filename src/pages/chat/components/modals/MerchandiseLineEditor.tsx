import { useMemo } from 'react'
import { cn } from '../../../../lib/cn'
import {
  VtSelect,
  type VtSelectOption,
} from '../../../../components/VtSelect'
import {
  agrDetailCard,
  agrDetailLabel,
  agrDetailLink,
  agrDetailRow,
  agrDetailSub,
  agrDetailValue,
  fieldError,
  fieldLabel,
  fieldRootWithInvalid,
  lineGrid,
  merchLineHead,
  merchLineWrap,
} from '../../styles/formModalStyles'
import type { StoreCatalog, StoreProduct } from '../../domain/storeCatalogTypes'
import {
  findStoreProduct,
  mergeMerchandiseLineWithStoreProduct,
  sortCatalogItemsByContextId,
} from '../../domain/storeCatalogTypes'
import { emptyMerchandiseLine, normalizeMerchandiseLine, type MerchandiseLine } from '../../domain/tradeAgreementTypes'
import { ModalFormField as Field } from './ModalFormField'

function MerchPreviewRow({
  label,
  value,
  multiline,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  if (!value.trim()) return null
  return (
    <div className={agrDetailRow}>
      <div className={agrDetailLabel}>{label}</div>
      <div className={cn(agrDetailValue, multiline && 'whitespace-pre-wrap')}>{value}</div>
    </div>
  )
}

/** Campos de texto de la ficha al anclar un producto (mismo orden que flow-ui / detalle de acuerdo). */
function productFichaHasTextFields(p: StoreProduct) {
  return [
    p.model,
    p.shortDescription,
    p.mainBenefit,
    p.technicalSpecs,
    p.contentIncluded,
    p.usageConditions,
  ].some((s) => (typeof s === 'string' ? s : '').trim() !== '')
}

function ProductFichaTextRows({ p }: { p: StoreProduct }) {
  return (
    <>
      <MerchPreviewRow label="Versión / modelo" value={p.model ?? ''} />
      <MerchPreviewRow label="Descripción breve" value={p.shortDescription} multiline />
      <MerchPreviewRow label="Beneficio principal" value={p.mainBenefit} multiline />
      <MerchPreviewRow label="Características técnicas" value={p.technicalSpecs} multiline />
      <MerchPreviewRow label="Contenido incluido" value={p.contentIncluded} multiline />
      <MerchPreviewRow label="Condiciones de uso" value={p.usageConditions} multiline />
    </>
  )
}

export function MerchandiseLineEditor({
  line,
  onChange,
  onRemove,
  canRemove,
  lineIndex,
  errors,
  sellerCatalog,
  contextOfferId = null,
  linkedProductIdsUsedElsewhere = [],
}: {
  line: MerchandiseLine
  onChange: (next: MerchandiseLine) => void
  onRemove: () => void
  canRemove: boolean
  lineIndex: number
  errors?: Partial<Record<keyof MerchandiseLine, string>>
  sellerCatalog?: StoreCatalog | null
  contextOfferId?: string | null
  /** Productos de ficha ya elegidos en otras líneas (no se pueden repetir en el mismo acuerdo). */
  linkedProductIdsUsedElsewhere?: string[]
}) {
  const p = (k: keyof MerchandiseLine) => `agr-m-${lineIndex}-${k}`
  const anchorProducts = useMemo(
    () => sortCatalogItemsByContextId(sellerCatalog?.products ?? [], contextOfferId),
    [sellerCatalog, contextOfferId],
  )
  const canPickProduct = !!sellerCatalog && anchorProducts.length > 0

  const productSelectOptions = useMemo((): VtSelectOption[] => {
    let placeholder = 'Elige un producto (obligatorio)'
    if (!sellerCatalog) placeholder = 'Catálogo no disponible'
    else if (anchorProducts.length === 0)
      placeholder = 'No hay productos en tu ficha de tienda'
    const blocked = new Set(linkedProductIdsUsedElsewhere.filter(Boolean))
    const rows: VtSelectOption[] = [{ value: '', label: placeholder }]
    for (const pr of anchorProducts) {
      const takenElsewhere =
        blocked.has(pr.id) && line.linkedStoreProductId !== pr.id
      rows.push({
        value: pr.id,
        label: `${pr.category} · ${pr.name}${pr.published ? '' : ' (borrador)'}${contextOfferId && pr.id === contextOfferId ? ' — anuncio de este chat' : ''}`,
        disabled: takenElsewhere,
      })
    }
    return rows
  }, [
    sellerCatalog,
    anchorProducts,
    linkedProductIdsUsedElsewhere,
    line.linkedStoreProductId,
    contextOfferId,
  ])
  const lineForPreview = normalizeMerchandiseLine(line)
  const linkedForPreview = findStoreProduct(sellerCatalog ?? undefined, line.linkedStoreProductId)
  return (
    <div className={merchLineWrap}>
      <div className={merchLineHead}>
        <span className={agrDetailSub}>Línea de mercancía {lineIndex + 1}</span>
        {canRemove ? (
          <button type="button" className="vt-btn vt-btn-ghost no-underline" onClick={onRemove}>
            Quitar
          </button>
        ) : null}
      </div>
      <label className={fieldRootWithInvalid(!!errors?.tipo)}>
        <span className={fieldLabel}>Producto (ficha de la tienda)</span>
        <VtSelect
          value={canPickProduct ? (line.linkedStoreProductId ?? '') : ''}
          onChange={(id) => {
            if (!id) {
              onChange({
                ...emptyMerchandiseLine(),
                cantidad: line.cantidad,
                tipoEmbalaje: line.tipoEmbalaje,
                devolucionQuienPaga: line.devolucionQuienPaga,
                devolucionPlazos: line.devolucionPlazos,
                regulaciones: line.regulaciones,
              })
              return
            }
            if (!sellerCatalog) return
            const prod = sellerCatalog.products.find((x) => x.id === id)
            if (prod) onChange(mergeMerchandiseLineWithStoreProduct(line, prod))
          }}
          options={productSelectOptions}
          placeholder={productSelectOptions[0]?.label ?? 'Elige un producto (obligatorio)'}
          disabled={!canPickProduct}
          listPortal
          listPortalZIndexClass="z-[220]"
          ariaLabel="Producto de la ficha de la tienda"
          className="w-full"
          buttonClassName="min-h-[42px] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] border-[color-mix(in_oklab,var(--border)_90%,transparent)] shadow-[inset_0_1px_0_rgba(2,6,23,0.55)]"
        />
        <span className="vt-muted mt-1 block text-[11px] leading-snug">
          Al elegir un producto, versión/modelo, descripción breve, beneficio principal, características
          técnicas, contenido incluido, condiciones de uso, precio, moneda, estado, impuestos, garantías de la
          ficha, fotos y documentos adjuntos entran al acuerdo. El comprador completa abajo el embalaje, plazos
          y regulaciones.
        </span>
      </label>
      {errors?.tipo ? <div className={fieldError}>{errors.tipo}</div> : null}
      {errors?.valorUnitario ? <div className={fieldError}>{errors.valorUnitario}</div> : null}
      {linkedForPreview && productFichaHasTextFields(linkedForPreview) ? (
        <div className="mb-3 rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] p-2.5">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Ficha (solo lectura)
          </div>
          <div className="text-[13px]">
            <ProductFichaTextRows p={linkedForPreview} />
          </div>
        </div>
      ) : null}
      <div className={lineGrid}>
        <Field
          label="Cantidad"
          value={line.cantidad}
          onChange={(v) => onChange({ ...line, cantidad: v })}
          error={errors?.cantidad}
          inputId={p('cantidad')}
        />
        <Field
          label="Tipo de embalaje"
          value={line.tipoEmbalaje}
          onChange={(v) => onChange({ ...line, tipoEmbalaje: v })}
          error={errors?.tipoEmbalaje}
          inputId={p('tipoEmbalaje')}
        />
        <Field
          label="Quién paga el envío de devolución"
          value={line.devolucionQuienPaga}
          onChange={(v) => onChange({ ...line, devolucionQuienPaga: v })}
          error={errors?.devolucionQuienPaga}
          inputId={p('devolucionQuienPaga')}
        />
        <Field
          label="Plazos (devolución)"
          value={line.devolucionPlazos}
          onChange={(v) => onChange({ ...line, devolucionPlazos: v })}
          error={errors?.devolucionPlazos}
          inputId={p('devolucionPlazos')}
        />
        <Field
          label="Regulaciones y cumplimiento (aduanas, restricciones, permisos)"
          value={line.regulaciones}
          multiline
          onChange={(v) => onChange({ ...line, regulaciones: v })}
          error={errors?.regulaciones}
          inputId={p('regulaciones')}
        />
      </div>
      <div className="mt-3">
        <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
          Vista previa
        </div>
        <div className={agrDetailCard}>
          <div className={agrDetailSub}>Ficha de producto + acuerdo</div>
          {linkedForPreview ? (
            <>
              <MerchPreviewRow
                label="Producto (catálogo)"
                value={`${linkedForPreview.name} · ${linkedForPreview.category}`}
              />
              <ProductFichaTextRows p={linkedForPreview} />
              {linkedForPreview.photoUrls?.filter(Boolean).length ? (
                <div className="mb-2">
                  <div className="mb-1 text-[10px] font-extrabold uppercase text-[var(--muted)]">Fotos</div>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedForPreview.photoUrls
                      .filter((u) => u?.trim())
                      .slice(0, 8)
                      .map((url, u) => (
                        <a
                          key={u}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-16 w-16 shrink-0 overflow-hidden rounded border border-[var(--border)] bg-[var(--bg)]"
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                  </div>
                </div>
              ) : null}
              {linkedForPreview.customFields?.length ? (
                <div className="mb-2 space-y-2">
                  {linkedForPreview.customFields.map((f, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[color-mix(in_oklab,var(--border)_80%,transparent)] p-2 text-sm"
                    >
                      <div className="font-bold text-[var(--text)]">{f.title || 'Campo'}</div>
                      {f.attachmentNote ? (
                        <div className="text-[11px] text-[var(--muted)]">{f.attachmentNote}</div>
                      ) : null}
                      <div className="whitespace-pre-wrap text-[var(--text)]">{f.body}</div>
                      {f.attachments?.length ? (
                        <ul className="mt-1 list-inside list-disc text-xs text-[var(--muted)]">
                          {f.attachments.map((a) => (
                            <li key={a.id}>
                              <a href={a.url} target="_blank" rel="noreferrer" className={agrDetailLink}>
                                {a.fileName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          <MerchPreviewRow label="Precio (ficha)" value={lineForPreview.valorUnitario} />
          <MerchPreviewRow label="Moneda" value={lineForPreview.moneda} />
          <MerchPreviewRow label="Estado" value={lineForPreview.estado} />
          <MerchPreviewRow label="Impuestos" value={lineForPreview.impuestos} />
          <MerchPreviewRow
            label="Condiciones de devolución y garantía (ficha)"
            value={lineForPreview.devolucionesDesc}
          />
          <div className="mt-2 border-t border-[var(--border)] pt-2" />
          <MerchPreviewRow label="Cantidad" value={lineForPreview.cantidad} />
          <MerchPreviewRow label="Tipo de embalaje" value={lineForPreview.tipoEmbalaje} />
          <MerchPreviewRow
            label="Quién paga el envío de devolución"
            value={lineForPreview.devolucionQuienPaga}
          />
          <MerchPreviewRow label="Plazos (devolución)" value={lineForPreview.devolucionPlazos} />
          <MerchPreviewRow
            label="Regulaciones y cumplimiento"
            value={lineForPreview.regulaciones}
          />
        </div>
      </div>
    </div>
  )
}
