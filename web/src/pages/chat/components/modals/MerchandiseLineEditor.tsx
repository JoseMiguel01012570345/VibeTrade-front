import {
  agrDetailSub,
  fieldLabel,
  fieldRootWithInvalid,
  lineGrid,
  merchLineHead,
  merchLineWrap,
} from '../../styles/formModalStyles'
import type { StoreCatalog } from '../../domain/storeCatalogTypes'
import { mergeMerchandiseLineWithStoreProduct } from '../../domain/storeCatalogTypes'
import type { MerchandiseLine } from '../../domain/tradeAgreementTypes'
import { ModalFormField as Field } from './ModalFormField'

export function MerchandiseLineEditor({
  line,
  onChange,
  onRemove,
  canRemove,
  lineIndex,
  errors,
  sellerCatalog,
}: {
  line: MerchandiseLine
  onChange: (next: MerchandiseLine) => void
  onRemove: () => void
  canRemove: boolean
  lineIndex: number
  errors?: Partial<Record<keyof MerchandiseLine, string>>
  sellerCatalog?: StoreCatalog | null
}) {
  const p = (k: keyof MerchandiseLine) => `agr-m-${lineIndex}-${k}`
  const anchorProducts =
    sellerCatalog?.products.filter(
      (x) => x.published || x.id === line.linkedStoreProductId,
    ) ?? []
  const hasCatalog = anchorProducts.length > 0
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
      {hasCatalog ? (
        <label className={fieldRootWithInvalid(false)}>
          <span className={fieldLabel}>Anclar a producto del catálogo de la tienda</span>
          <select
            id={`agr-m-${lineIndex}-anchor-prod`}
            className="vt-input"
            value={line.linkedStoreProductId ?? ''}
            onChange={(e) => {
              const id = e.target.value
              if (!id) {
                onChange({ ...line, linkedStoreProductId: undefined })
                return
              }
              if (!sellerCatalog) return
              const prod = anchorProducts.find((x) => x.id === id)
              if (prod) onChange(mergeMerchandiseLineWithStoreProduct(line, prod))
            }}
          >
            <option value="">Sin anclar…</option>
            {anchorProducts.map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.category} · {pr.name}
                {!pr.published ? ' (borrador)' : ''}
              </option>
            ))}
          </select>
          <span className="vt-muted mt-1 block text-[11px] leading-snug">
            Los datos del acuerdo prevalecen; lo vacío se completa desde la ficha. Si ambas partes tienen texto
            distinto en el mismo apartado, se conserva lo del acuerdo y el detalle del catálogo se suma al final.
          </span>
        </label>
      ) : null}
      <div className={lineGrid}>
        <Field
          label="Tipo"
          value={line.tipo}
          onChange={(v) => onChange({ ...line, tipo: v })}
          error={errors?.tipo}
          inputId={p('tipo')}
        />
        <Field
          label="Cantidad"
          value={line.cantidad}
          onChange={(v) => onChange({ ...line, cantidad: v })}
          error={errors?.cantidad}
          inputId={p('cantidad')}
        />
        <Field
          label="Valor unitario"
          value={line.valorUnitario}
          onChange={(v) => onChange({ ...line, valorUnitario: v })}
          error={errors?.valorUnitario}
          inputId={p('valorUnitario')}
        />
        <label className={fieldRootWithInvalid(false)}>
          <span className={fieldLabel}>Estado</span>
          <select
            id={p('estado')}
            className="vt-input"
            value={line.estado}
            onChange={(e) =>
              onChange({
                ...line,
                estado: e.target.value as MerchandiseLine['estado'],
              })
            }
          >
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
            <option value="reacondicionado">Reacondicionado</option>
          </select>
        </label>
        <Field
          label="Descuentos (número; 0 si no aplica)"
          value={line.descuento}
          onChange={(v) => onChange({ ...line, descuento: v })}
          error={errors?.descuento}
          inputId={p('descuento')}
        />
        <Field
          label="Impuestos (IVA, aranceles…)"
          value={line.impuestos}
          onChange={(v) => onChange({ ...line, impuestos: v })}
          error={errors?.impuestos}
          inputId={p('impuestos')}
          multiline
        />
        <Field
          label="Moneda"
          value={line.moneda}
          onChange={(v) => onChange({ ...line, moneda: v })}
          error={errors?.moneda}
          inputId={p('moneda')}
        />
        <Field
          label="Tipo de embalaje"
          value={line.tipoEmbalaje}
          onChange={(v) => onChange({ ...line, tipoEmbalaje: v })}
          error={errors?.tipoEmbalaje}
          inputId={p('tipoEmbalaje')}
        />
        <Field
          label="Condiciones para devolver y garantias"
          value={line.devolucionesDesc}
          multiline
          onChange={(v) => onChange({ ...line, devolucionesDesc: v })}
          error={errors?.devolucionesDesc}
          inputId={p('devolucionesDesc')}
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
    </div>
  )
}
