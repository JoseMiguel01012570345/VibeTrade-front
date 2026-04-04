import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { cn } from '../../../../lib/cn'
import { ModalFormField as Field } from './ModalFormField'
import { cloneTramoFromPrevious, emptyTramo } from '../../lib/routeSheetTramoFormUtils'
import {
  agrDetailSub,
  detailsBlock,
  fieldError,
  fieldLabel,
  fieldRootWithInvalid,
  mapBackdropLayer,
  modalFormBody,
  modalShellNarrow,
  modalShellWide,
  modalSub,
  rutaCoordsHint,
  rutaCoordsRow,
  rutaMapBtn,
  rutaTramoCard,
  rutaTramoGrid,
  rutaTramoHead,
  rutaTramoRemoveBtn,
  rutaTramosBlock,
} from '../../styles/formModalStyles'
import { MapPin, Trash2 } from 'lucide-react'
import {
  routeSheetLegacyHead,
  routeStopsToFormInputs,
  type RouteSheet,
  type RouteSheetCreatePayload,
  type RouteTramoFormInput,
} from '../../domain/routeSheetTypes'
import type { RouteSheetFormErrors } from '../../domain/routeSheetValidation'
import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  normalizeRouteSheetParadas,
  routeSheetFormErrorCount,
  validateRouteCoordPair,
} from '../../domain/routeSheetValidation'

export type RouteSheetFormPayload = RouteSheetCreatePayload

type Props = {
  open: boolean
  onClose: () => void
  initialRouteSheet?: RouteSheet | null
  onSubmit: (p: RouteSheetFormPayload) => boolean
}

type MapPick = { tramoIndex: number; punto: 'origen' | 'destino' }

export function RouteSheetFormModal({ open, onClose, initialRouteSheet, onSubmit }: Props) {
  const [titulo, setTitulo] = useState('')
  const [merc, setMerc] = useState('')
  const [notasG, setNotasG] = useState('')
  const [tramos, setTramos] = useState<RouteTramoFormInput[]>([emptyTramo(), emptyTramo()])
  const [mapPick, setMapPick] = useState<MapPick | null>(null)
  const [mapLat, setMapLat] = useState('')
  const [mapLng, setMapLng] = useState('')
  const [mapCoordError, setMapCoordError] = useState<string | undefined>(undefined)
  const [formErrors, setFormErrors] = useState<RouteSheetFormErrors>({})

  useEffect(() => {
    if (!open) return
    setFormErrors({})
    setMapPick(null)
    setMapCoordError(undefined)
    if (initialRouteSheet) {
      const rs = initialRouteSheet
      setTitulo(rs.titulo)
      setMerc(rs.mercanciasResumen)
      setNotasG(rs.notasGenerales ?? '')
      setTramos(
        rs.paradas.length > 0
          ? routeStopsToFormInputs(rs.paradas, routeSheetLegacyHead(rs))
          : [emptyTramo(), emptyTramo()],
      )
    } else {
      setTitulo('')
      setMerc('')
      setNotasG('')
      setTramos([emptyTramo(), emptyTramo()])
    }
  }, [open, initialRouteSheet?.id])

  if (!open) return null

  function openMapPicker(tramoIndex: number, punto: 'origen' | 'destino') {
    const t = tramos[tramoIndex]
    if (!t) return
    setMapCoordError(undefined)
    if (punto === 'origen') {
      setMapLat(t.origenLat ?? '')
      setMapLng(t.origenLng ?? '')
    } else {
      setMapLat(t.destinoLat ?? '')
      setMapLng(t.destinoLng ?? '')
    }
    setMapPick({ tramoIndex, punto })
  }

  function applyMapCoords() {
    if (!mapPick) return
    const coordErr = validateRouteCoordPair(mapLat, mapLng)
    if (coordErr) {
      setMapCoordError(coordErr)
      return
    }
    setMapCoordError(undefined)
    const lat = mapLat.trim()
    const lng = mapLng.trim()
    setTramos((prev) => {
      const next = [...prev]
      const row = { ...next[mapPick.tramoIndex] }
      if (mapPick.punto === 'origen') {
        row.origenLat = lat || undefined
        row.origenLng = lng || undefined
      } else {
        row.destinoLat = lat || undefined
        row.destinoLng = lng || undefined
      }
      next[mapPick.tramoIndex] = row
      return next
    })
    toast.success('Coordenadas guardadas (en la app final se elegirán en un mapa)')
    setMapPick(null)
  }

  function trySubmit() {
    const t = titulo.trim()
    const m = merc.trim()
    const limpios: RouteTramoFormInput[] = tramos.map((p) => ({
      origen: p.origen.trim(),
      destino: p.destino.trim(),
      origenLat: p.origenLat?.trim() ?? '',
      origenLng: p.origenLng?.trim() ?? '',
      destinoLat: p.destinoLat?.trim() ?? '',
      destinoLng: p.destinoLng?.trim() ?? '',
      tiempoRecogidaEstimado: p.tiempoRecogidaEstimado?.trim() ?? '',
      tiempoEntregaEstimado: p.tiempoEntregaEstimado?.trim() ?? '',
      precioTransportista: p.precioTransportista?.trim() ?? '',
      cargaEnTramo: p.cargaEnTramo?.trim() ?? '',
      tipoMercanciaCarga: p.tipoMercanciaCarga?.trim() ?? '',
      tipoMercanciaDescarga: p.tipoMercanciaDescarga?.trim() ?? '',
      notas: p.notas?.trim() ?? '',
      responsabilidadEmbalaje: p.responsabilidadEmbalaje?.trim() ?? '',
      requisitosEspeciales: p.requisitosEspeciales?.trim() ?? '',
      tipoVehiculoRequerido: p.tipoVehiculoRequerido?.trim() ?? '',
    }))
    const draft: RouteSheetCreatePayload = {
      titulo: t,
      mercanciasResumen: m,
      paradas: limpios,
      notasGenerales: notasG.trim(),
    }
    const e = getRouteSheetFormErrors(draft)
    setFormErrors(e)
    if (hasRouteSheetFormErrors(e)) {
      const n = routeSheetFormErrorCount(e)
      toast.error(`Revisá el formulario (${n} error${n === 1 ? '' : 'es'})`)
      return
    }
    const paradasFinal = normalizeRouteSheetParadas(limpios)
    const persisted = onSubmit({
      ...draft,
      paradas: paradasFinal,
    })
    if (!persisted) return
    setFormErrors({})
    onClose()
    toast.success(initialRouteSheet ? 'Hoja de ruta actualizada' : 'Hoja de ruta creada')
  }

  function updateTramo(i: number, patch: Partial<RouteTramoFormInput>) {
    setTramos((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], ...patch }
      return next
    })
  }

  function addTramoClonedFromLast() {
    setTramos((prev) => {
      const last = prev[prev.length - 1]
      return [...prev, cloneTramoFromPrevious(last ?? emptyTramo())]
    })
    setFormErrors({})
  }

  function removeTramoAt(index: number) {
    setTramos((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, j) => j !== index)
    })
    setMapPick((mp) => {
      if (!mp) return null
      if (mp.tramoIndex === index) return null
      if (mp.tramoIndex > index) return { ...mp, tramoIndex: mp.tramoIndex - 1 }
      return mp
    })
    setFormErrors({})
  }

  const err = formErrors

  return (
    <>
      <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
        <div className={modalShellWide}>
          <div className="vt-modal-title">
            {initialRouteSheet ? 'Editar hoja de rutas' : 'Nueva hoja de rutas'}
          </div>
          <div className={modalSub}>
            Todos los campos son obligatorios. Tiempos estimados y precio del tramo deben ser números (ej. horas o
            monto). Las coordenadas se cargan desde el botón del mapa.
          </div>
          <div className={modalFormBody}>
            <Field
              label="Título"
              value={titulo}
              onChange={setTitulo}
              error={err.titulo}
              inputId="ruta-titulo"
            />
            <Field
              label="Mercancías / bultos (resumen general)"
              value={merc}
              onChange={setMerc}
              multiline
              rows={3}
              error={err.mercanciasResumen}
              inputId="ruta-merc"
            />

            <div className={cn(detailsBlock, rutaTramosBlock)}>
              <strong>Tramos del recorrido</strong>
              {err.paradasGlobal ? (
                <div className={cn(fieldError, 'mt-2')} role="alert">
                  {err.paradasGlobal}
                </div>
              ) : null}
              {tramos.map((p, i) => {
                const te = err.tramos?.[i]
                return (
                  <div key={i} className={rutaTramoCard}>
                    <div className={rutaTramoHead}>
                      <span className={agrDetailSub}>Tramo {i + 1}</span>
                      <button
                        type="button"
                        className={rutaTramoRemoveBtn}
                        disabled={tramos.length <= 1}
                        title={
                          tramos.length <= 1
                            ? 'Debe quedar al menos un tramo'
                            : 'Eliminar este tramo'
                        }
                        onClick={() => removeTramoAt(i)}
                      >
                        <Trash2 size={14} aria-hidden />
                        <span>Eliminar tramo</span>
                      </button>
                    </div>
                    <div className={rutaTramoGrid}>
                      <Field
                        label="Origen"
                        value={p.origen}
                        onChange={(v) => updateTramo(i, { origen: v })}
                        error={te?.origen}
                        placeholder="Ubicación de origen"
                        inputId={`ruta-tramo-${i}-origen`}
                      />
                      <Field
                        label="Destino"
                        value={p.destino}
                        onChange={(v) => updateTramo(i, { destino: v })}
                        error={te?.destino}
                        placeholder="Ubicación de destino"
                        inputId={`ruta-tramo-${i}-destino`}
                      />
                    </div>
                    <div className={rutaCoordsRow}>
                      <button
                        type="button"
                        className={rutaMapBtn}
                        onClick={() => openMapPicker(i, 'origen')}
                      >
                        <MapPin size={14} /> Coordenadas origen (mapa)
                      </button>
                      <button
                        type="button"
                        className={rutaMapBtn}
                        onClick={() => openMapPicker(i, 'destino')}
                      >
                        <MapPin size={14} /> Coordenadas destino (mapa)
                      </button>
                    </div>
                    {te?.coordOrigen ? (
                      <div className={fieldError} role="alert">
                        {te.coordOrigen}
                      </div>
                    ) : null}
                    {(p.origenLat || p.origenLng) ? (
                      <div className={rutaCoordsHint}>
                        Origen: {p.origenLat ?? '—'}, {p.origenLng ?? '—'}
                      </div>
                    ) : null}
                    {te?.coordDestino ? (
                      <div className={fieldError} role="alert">
                        {te.coordDestino}
                      </div>
                    ) : null}
                    {(p.destinoLat || p.destinoLng) ? (
                      <div className={rutaCoordsHint}>
                        Destino: {p.destinoLat ?? '—'}, {p.destinoLng ?? '—'}
                      </div>
                    ) : null}
                    <Field
                      label="Responsabilidad por daños por embalaje (este tramo)"
                      value={p.responsabilidadEmbalaje ?? ''}
                      onChange={(v) => updateTramo(i, { responsabilidadEmbalaje: v })}
                      multiline
                      placeholder="Quién responde y en qué casos"
                      error={te?.responsabilidadEmbalaje}
                      inputId={`ruta-tramo-${i}-resp-emb`}
                    />
                    <Field
                      label="Requisitos especiales (este tramo)"
                      value={p.requisitosEspeciales ?? ''}
                      onChange={(v) => updateTramo(i, { requisitosEspeciales: v })}
                      multiline
                      placeholder="Frágil, refrigerado, ADR, etc."
                      error={te?.requisitosEspeciales}
                      inputId={`ruta-tramo-${i}-req`}
                    />
                    <Field
                      label="Tipo de vehículo requerido (este tramo)"
                      value={p.tipoVehiculoRequerido ?? ''}
                      onChange={(v) => updateTramo(i, { tipoVehiculoRequerido: v })}
                      placeholder="Ej. camión baranda, refrigerado, sider"
                      error={te?.tipoVehiculoRequerido}
                      inputId={`ruta-tramo-${i}-veh`}
                    />
                    <Field
                      label="Teléfono del transportista asignado (este tramo)"
                      value={p.telefonoTransportista ?? ''}
                      onChange={(v) => updateTramo(i, { telefonoTransportista: v })}
                      placeholder="Ej. +54 9 11 1234-5678"
                      error={te?.telefonoTransportista}
                      inputId={`ruta-tramo-${i}-tel`}
                    />
                    <div className={rutaTramoGrid}>
                      <Field
                        label="Tiempo estimado recogida (horas, número)"
                        value={p.tiempoRecogidaEstimado ?? ''}
                        onChange={(v) => updateTramo(i, { tiempoRecogidaEstimado: v })}
                        error={te?.tiempoRecogidaEstimado}
                        inputId={`ruta-tramo-${i}-trec`}
                        inputMode="decimal"
                        placeholder="Ej. 2 o 3.5"
                      />
                      <Field
                        label="Tiempo estimado entrega (horas, número)"
                        value={p.tiempoEntregaEstimado ?? ''}
                        onChange={(v) => updateTramo(i, { tiempoEntregaEstimado: v })}
                        error={te?.tiempoEntregaEstimado}
                        inputId={`ruta-tramo-${i}-tent`}
                        inputMode="decimal"
                        placeholder="Ej. 4"
                      />
                    </div>
                    <Field
                      label="Precio desglosado (transportista, este tramo)"
                      value={p.precioTransportista ?? ''}
                      onChange={(v) => updateTramo(i, { precioTransportista: v })}
                      placeholder="Monto numérico (ej. 150000 o 1500.50)"
                      error={te?.precioTransportista}
                      inputId={`ruta-tramo-${i}-precio`}
                      inputMode="decimal"
                    />
                    <Field
                      label="Carga en este tramo"
                      value={p.cargaEnTramo ?? ''}
                      onChange={(v) => updateTramo(i, { cargaEnTramo: v })}
                      multiline
                      placeholder="Qué lleva el transportista en el tramo"
                      error={te?.cargaEnTramo}
                      inputId={`ruta-tramo-${i}-carga`}
                    />
                    <div className={rutaTramoGrid}>
                      <Field
                        label="Tipo de mercancía (carga)"
                        value={p.tipoMercanciaCarga ?? ''}
                        onChange={(v) => updateTramo(i, { tipoMercanciaCarga: v })}
                        error={te?.tipoMercanciaCarga}
                        inputId={`ruta-tramo-${i}-tmc`}
                      />
                      <Field
                        label="Tipo de mercancía (descarga)"
                        value={p.tipoMercanciaDescarga ?? ''}
                        onChange={(v) => updateTramo(i, { tipoMercanciaDescarga: v })}
                        error={te?.tipoMercanciaDescarga}
                        inputId={`ruta-tramo-${i}-tmd`}
                      />
                    </div>
                    <Field
                      label="Notas del tramo"
                      value={p.notas ?? ''}
                      onChange={(v) => updateTramo(i, { notas: v })}
                      multiline
                      error={te?.notas}
                      inputId={`ruta-tramo-${i}-notas`}
                    />
                  </div>
                )
              })}
              <button type="button" className="vt-btn" onClick={addTramoClonedFromLast}>
                + Tramo (copia del último)
              </button>
            </div>

            <Field
              label="Notas generales"
              value={notasG}
              onChange={setNotasG}
              multiline
              error={err.notasGenerales}
              inputId="ruta-notas-g"
            />
          </div>
          <div className="vt-modal-actions">
            <button type="button" className="vt-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="vt-btn vt-btn-primary" onClick={trySubmit}>
              {initialRouteSheet ? 'Guardar cambios' : 'Guardar hoja de ruta'}
            </button>
          </div>
        </div>
      </div>

      {mapPick ? (
        <div
          className={mapBackdropLayer}
          role="dialog"
          aria-modal="true"
          aria-label="Coordenadas del mapa"
        >
          <div className={modalShellNarrow}>
            <div className="vt-modal-title">
              {mapPick.punto === 'origen' ? 'Coordenadas de origen' : 'Coordenadas de destino'} (tramo{' '}
              {mapPick.tramoIndex + 1})
            </div>
            <div className={modalSub}>
              En producción se abrirá un mapa interactivo. Ingresá latitud y longitud manualmente o desde Maps.
            </div>
            <div className={modalFormBody}>
              <label className={fieldRootWithInvalid(!!mapCoordError)}>
                <span className={fieldLabel}>Latitud</span>
                <input
                  className="vt-input"
                  value={mapLat}
                  inputMode="decimal"
                  onChange={(e) => {
                    setMapLat(e.target.value)
                    setMapCoordError(undefined)
                  }}
                  aria-invalid={!!mapCoordError}
                />
              </label>
              <label className={fieldRootWithInvalid(!!mapCoordError)}>
                <span className={fieldLabel}>Longitud</span>
                <input
                  className="vt-input"
                  value={mapLng}
                  inputMode="decimal"
                  onChange={(e) => {
                    setMapLng(e.target.value)
                    setMapCoordError(undefined)
                  }}
                  aria-invalid={!!mapCoordError}
                />
              </label>
              {mapCoordError ? (
                <div className={fieldError} role="alert">
                  {mapCoordError}
                </div>
              ) : null}
            </div>
            <div className="vt-modal-actions">
              <button
                type="button"
                className="vt-btn"
                onClick={() => {
                  setMapPick(null)
                  setMapCoordError(undefined)
                }}
              >
                Cancelar
              </button>
              <button type="button" className="vt-btn vt-btn-primary" onClick={applyMapCoords}>
                Guardar coordenadas
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
