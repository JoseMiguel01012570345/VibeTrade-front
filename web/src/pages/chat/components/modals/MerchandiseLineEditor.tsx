import {
  agrDetailSub,
  fieldLabel,
  fieldRootWithInvalid,
  lineGrid,
  merchLineHead,
  merchLineWrap,
} from '../../styles/formModalStyles'
import { ModalFormField as Field } from './ModalFormField'
import type { MerchandiseLine } from '../../domain/tradeAgreementTypes'

export function MerchandiseLineEditor({
  line,
  onChange,
  onRemove,
  canRemove,
  lineIndex,
  errors,
}: {
  line: MerchandiseLine
  onChange: (next: MerchandiseLine) => void
  onRemove: () => void
  canRemove: boolean
  lineIndex: number
  errors?: Partial<Record<keyof MerchandiseLine, string>>
}) {
  const p = (k: keyof MerchandiseLine) => `agr-m-${lineIndex}-${k}`
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
          label="Condiciones para devolver"
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
