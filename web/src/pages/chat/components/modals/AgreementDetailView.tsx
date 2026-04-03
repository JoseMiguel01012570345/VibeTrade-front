import { useEffect, useState } from 'react'
import { cn } from '../../../../lib/cn'
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  normalizeMerchandiseLine,
  type MerchandiseLine,
  type MerchandiseSectionMeta,
  type TradeAgreement,
} from '../../domain/tradeAgreementTypes'
import { hasMerchandise } from '../../domain/tradeAgreementValidation'
import type { RouteSheet } from '../../domain/routeSheetTypes'
import {
  agrDetailBlock,
  agrDetailCard,
  agrDetailH,
  agrDetailHint,
  agrDetailLabel,
  agrDetailLink,
  agrDetailRoot,
  agrDetailRow,
  agrDetailSub,
  agrDetailValue,
  fieldLabel,
  linkRutaRow,
  linkRutaSelect,
} from '../../styles/formModalStyles'

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className={agrDetailRow}>
      <div className={agrDetailLabel}>{label}</div>
      <div className={agrDetailValue}>{value}</div>
    </div>
  )
}

function legacyMerchandiseMetaHasContent(m?: MerchandiseSectionMeta): boolean {
  if (!m) return false
  return Object.values(m).some((v) => (v ?? '').trim() !== '')
}

function MerchandiseBlock({ lines }: { lines: MerchandiseLine[] }) {
  if (!lines.length) return null
  return (
    <div className={agrDetailBlock}>
      <div className={agrDetailH}>Mercancías</div>
      {lines.map((raw, i) => {
        const line = normalizeMerchandiseLine(raw)
        return (
          <div key={i} className={agrDetailCard}>
            <div className={agrDetailSub}>Ítem {i + 1}</div>
            <Row label="Tipo" value={line.tipo} />
            <Row label="Cantidad" value={line.cantidad} />
            <Row label="Valor unitario" value={line.valorUnitario} />
            <Row label="Estado" value={line.estado} />
            <Row label="Descuento" value={line.descuento} />
            <Row label="Impuestos" value={line.impuestos} />
            <Row label="Moneda" value={line.moneda} />
            <Row label="Tipo de embalaje" value={line.tipoEmbalaje} />
            <Row label="Condiciones de devolución" value={line.devolucionesDesc} />
            <Row label="Quién paga envío de devolución" value={line.devolucionQuienPaga} />
            <Row label="Plazos (devolución)" value={line.devolucionPlazos} />
            <Row label="Regulaciones, aduanas, restricciones, permisos" value={line.regulaciones} />
          </div>
        )
      })}
    </div>
  )
}

export function AgreementDetailView({
  a,
  onOpenRouteSheet,
  routeSheets = [],
  onLinkRouteSheet,
  linkActionsDisabled = false,
}: {
  a: TradeAgreement
  onOpenRouteSheet?: (routeSheetId: string) => void
  routeSheets?: RouteSheet[]
  onLinkRouteSheet?: (agreementId: string, routeSheetId: string) => void
  linkActionsDisabled?: boolean
}) {
  const m = a.merchandiseMeta ?? undefined
  const s = a.service
  const showMerch = agreementDeclaresMerchandise(a)
  const showService = agreementDeclaresService(a)
  const hasGoods = hasMerchandise({ merchandise: a.merchandise })

  const [pickId, setPickId] = useState(a.routeSheetId ?? '')
  useEffect(() => {
    setPickId(a.routeSheetId ?? '')
  }, [a.id, a.routeSheetId])

  const linkedTitle = a.routeSheetId
    ? routeSheets.find((r) => r.id === a.routeSheetId)?.titulo
    : undefined
  /** Una vez vinculada una hoja, no se permite cambiar la elección desde este panel. */
  const linkUiLocked = !!a.routeSheetId

  return (
    <div className={agrDetailRoot}>
      <Row label="Título" value={a.title} />

      {showMerch && hasGoods ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Hoja de ruta</div>
          {onLinkRouteSheet ? (
            routeSheets.length === 0 ? (
              <p className={cn('vt-muted', agrDetailHint)}>
                No hay hojas de ruta en este chat. Creá una en la pestaña Rutas y volvé para vincularla.
              </p>
            ) : (
              <>
                {linkActionsDisabled ? (
                  <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
                    La vinculación de hojas de ruta no está disponible hasta registrar el pago en el chat.
                  </p>
                ) : null}
                <div className={linkRutaRow}>
                  <label className={linkRutaSelect}>
                    <span className={fieldLabel}>Elegir hoja</span>
                    <select
                      className="vt-input"
                      value={pickId}
                      disabled={linkUiLocked || linkActionsDisabled}
                      onChange={(e) => setPickId(e.target.value)}
                    >
                      <option value="">Seleccionar…</option>
                      {routeSheets.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.titulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary shrink-0"
                    disabled={
                      linkActionsDisabled ||
                      linkUiLocked ||
                      !pickId ||
                      pickId === (a.routeSheetId ?? '')
                    }
                    onClick={() => {
                      if (
                        !pickId ||
                        !onLinkRouteSheet ||
                        linkUiLocked ||
                        linkActionsDisabled
                      )
                        return
                      onLinkRouteSheet(a.id, pickId)
                    }}
                  >
                    Vincular
                  </button>
                </div>
                {linkUiLocked ? (
                  <p className={cn('vt-muted', agrDetailHint, 'mt-1.5')}>
                    La hoja vinculada no se puede cambiar desde aquí.
                  </p>
                ) : null}
              </>
            )
          ) : null}
          {a.routeSheetId && linkedTitle ? (
            <p className={cn('vt-muted', agrDetailHint)}>
              Vinculada a: <strong>{linkedTitle}</strong>
            </p>
          ) : null}
          {a.routeSheetId && onOpenRouteSheet ? (
            <button
              type="button"
              className="vt-btn vt-btn-sm mt-2"
              onClick={() => onOpenRouteSheet(a.routeSheetId!)}
            >
              Ver hoja de ruta en el panel
            </button>
          ) : null}
          {a.routeSheetUrl ? (
            <div className={cn(agrDetailRow, 'mt-2.5')}>
              <div className={agrDetailLabel}>Enlace externo</div>
              <a
                href={a.routeSheetUrl}
                target="_blank"
                rel="noreferrer"
                className={agrDetailLink}
              >
                {a.routeSheetUrl}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {showMerch ? <MerchandiseBlock lines={a.merchandise} /> : null}

      {showMerch && legacyMerchandiseMetaHasContent(m) ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Mercancías · condiciones generales (acuerdo anterior)</div>
          <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
            Estos datos eran comunes a todo el bloque; en acuerdos nuevos van por cada ítem.
          </p>
          <Row label="Moneda" value={m!.moneda} />
          <Row label="Tipo de embalaje" value={m!.tipoEmbalaje} />
          <Row label="Condiciones de devolución" value={m!.devolucionesDesc} />
          <Row label="Quién paga envío de devolución" value={m!.devolucionQuienPaga} />
          <Row label="Plazos (devolución)" value={m!.devolucionPlazos} />
          <Row
            label="Regulaciones, aduanas, restricciones, permisos"
            value={m!.regulaciones}
          />
        </div>
      ) : null}

      {showService ? (
        <div className={agrDetailBlock}>
          <div className={agrDetailH}>Servicios</div>
          <Row label="Tipo de servicio" value={s.tipoServicio} />
          <Row label="Tiempo del servicio" value={s.tiempoInicioFin} />
          <Row label="Horarios y fechas" value={s.horariosFechas} />
          <Row label="Recurrencia de pagos" value={s.recurrenciaPagos} />
          <Row label="Descripción" value={s.descripcion} />
          <Row label="Riesgos" value={s.riesgos} />
          <Row label="Qué incluye" value={s.incluye} />
          <Row label="Qué no incluye" value={s.noIncluye} />
          <Row label="Dependencias" value={s.dependencias} />
          <Row label="Qué se entrega" value={s.entregables} />
          <Row label="Garantías" value={s.garantias} />
          <Row label="Penalizaciones por atraso" value={s.penalAtraso} />
          <Row label="Terminación anticipada" value={s.terminacionAnticipada} />
          <Row label="Periodo de aviso (días)" value={s.avisoDias} />
          <Row label="Método de pago" value={s.metodoPago} />
          <Row label="Moneda (servicio)" value={s.moneda} />
          <Row label="Medición del cumplimiento" value={s.medicionCumplimiento} />
          <Row label="Penalizaciones por incumplimiento" value={s.penalIncumplimiento} />
          <Row label="Nivel de responsabilidad" value={s.nivelResponsabilidad} />
          <Row label="Propiedad intelectual / licencias" value={s.propIntelectual} />
        </div>
      ) : null}
    </div>
  )
}
