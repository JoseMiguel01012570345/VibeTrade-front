import { useEffect, useState } from 'react'
import type { MerchandiseLine, MerchandiseSectionMeta, TradeAgreement } from './tradeAgreementTypes'
import { normalizeMerchandiseLine } from './tradeAgreementTypes'
import { agreementDeclaresMerchandise, agreementDeclaresService } from './tradeAgreementTypes'
import { hasMerchandise } from './tradeAgreementValidation'
import type { RouteSheet } from './routeSheetTypes'

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="vt-agr-detail-row">
      <div className="vt-agr-detail-label">{label}</div>
      <div className="vt-agr-detail-value">{value}</div>
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
    <div className="vt-agr-detail-block">
      <div className="vt-agr-detail-h">Mercancías</div>
      {lines.map((raw, i) => {
        const line = normalizeMerchandiseLine(raw)
        return (
          <div key={i} className="vt-agr-detail-card">
            <div className="vt-agr-detail-sub">Ítem {i + 1}</div>
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
}: {
  a: TradeAgreement
  onOpenRouteSheet?: (routeSheetId: string) => void
  routeSheets?: RouteSheet[]
  onLinkRouteSheet?: (agreementId: string, routeSheetId: string) => void
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
    <div className="vt-agr-detail">
      <Row label="Título" value={a.title} />

      {showMerch && hasGoods ? (
        <div className="vt-agr-detail-block">
          <div className="vt-agr-detail-h">Hoja de ruta</div>
          {onLinkRouteSheet ? (
            routeSheets.length === 0 ? (
              <p className="vt-muted vt-agr-detail-hint">
                No hay hojas de ruta en este chat. Creá una en la pestaña Rutas y volvé para vincularla.
              </p>
            ) : (
              <>
                <div className="vt-agr-link-ruta-row">
                  <label className="vt-agr-link-ruta-select">
                    <span className="vt-agr-field-label">Elegir hoja</span>
                    <select
                      className="vt-input"
                      value={pickId}
                      disabled={linkUiLocked}
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
                    className="vt-btn vt-btn-primary vt-agr-link-ruta-btn"
                    disabled={
                      linkUiLocked || !pickId || pickId === (a.routeSheetId ?? '')
                    }
                    onClick={() => {
                      if (!pickId || !onLinkRouteSheet || linkUiLocked) return
                      onLinkRouteSheet(a.id, pickId)
                    }}
                  >
                    Vincular
                  </button>
                </div>
                {linkUiLocked ? (
                  <p className="vt-muted vt-agr-detail-hint" style={{ marginTop: 6 }}>
                    La hoja vinculada no se puede cambiar desde aquí.
                  </p>
                ) : null}
              </>
            )
          ) : null}
          {a.routeSheetId && linkedTitle ? (
            <p className="vt-muted vt-agr-detail-hint">
              Vinculada a: <strong>{linkedTitle}</strong>
            </p>
          ) : null}
          {a.routeSheetId && onOpenRouteSheet ? (
            <button
              type="button"
              className="vt-btn vt-btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => onOpenRouteSheet(a.routeSheetId!)}
            >
              Ver hoja de ruta en el panel
            </button>
          ) : null}
          {a.routeSheetUrl ? (
            <div className="vt-agr-detail-row" style={{ marginTop: 10 }}>
              <div className="vt-agr-detail-label">Enlace externo</div>
              <a
                href={a.routeSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="vt-agr-detail-link"
              >
                {a.routeSheetUrl}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {showMerch ? <MerchandiseBlock lines={a.merchandise} /> : null}

      {showMerch && legacyMerchandiseMetaHasContent(m) ? (
        <div className="vt-agr-detail-block">
          <div className="vt-agr-detail-h">Mercancías · condiciones generales (acuerdo anterior)</div>
          <p className="vt-muted vt-agr-detail-hint" style={{ marginBottom: 8 }}>
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
        <div className="vt-agr-detail-block">
          <div className="vt-agr-detail-h">Servicios</div>
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
