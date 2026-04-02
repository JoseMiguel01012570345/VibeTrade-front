import { useEffect, useState, type HTMLAttributes } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { MapPin } from 'lucide-react'
import {
  routeStopsToFormInputs,
  type RouteSheet,
  type RouteSheetCreatePayload,
  type RouteTramoFormInput,
} from './routeSheetTypes'
import type { RouteSheetFormErrors } from './routeSheetValidation'
import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  normalizeRouteSheetParadas,
  routeSheetFormErrorCount,
  validateRouteCoordPair,
} from './routeSheetValidation'

export type RouteSheetFormPayload = RouteSheetCreatePayload

type Props = {
  open: boolean
  onClose: () => void
  initialRouteSheet?: RouteSheet | null
  onSubmit: (p: RouteSheetFormPayload) => boolean
}

function Field({
  label,
  value,
  onChange,
  multiline,
  error,
  inputId,
  placeholder,
  rows,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  error?: string
  inputId?: string
  placeholder?: string
  rows?: number
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const errId = inputId ? `${inputId}-err` : undefined
  return (
    <label className={clsx('vt-agr-field', error && 'vt-agr-field--invalid')}>
      <span className="vt-agr-field-label">{label}</span>
      {multiline ? (
        <textarea
          id={inputId}
          className="vt-input vt-agr-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 2}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
      ) : (
        <input
          id={inputId}
          className="vt-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
      )}
      {error ? (
        <span id={errId} className="vt-agr-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}

function emptyTramo(): RouteTramoFormInput {
  return {
    origen: '',
    destino: '',
    origenLat: '',
    origenLng: '',
    destinoLat: '',
    destinoLng: '',
    tiempoRecogidaEstimado: '',
    tiempoEntregaEstimado: '',
    precioTransportista: '',
    cargaEnTramo: '',
    tipoMercanciaCarga: '',
    tipoMercanciaDescarga: '',
    notas: '',
  }
}

type MapPick = { tramoIndex: number; punto: 'origen' | 'destino' }

export function RouteSheetFormModal({ open, onClose, initialRouteSheet, onSubmit }: Props) {
  const [titulo, setTitulo] = useState('')
  const [merc, setMerc] = useState('')
  const [notasG, setNotasG] = useState('')
  const [respEmb, setRespEmb] = useState('')
  const [reqEsp, setReqEsp] = useState('')
  const [tipoVeh, setTipoVeh] = useState('')
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
      setRespEmb(rs.responsabilidadEmbalaje ?? '')
      setReqEsp(rs.requisitosEspeciales ?? '')
      setTipoVeh(rs.tipoVehiculoRequerido ?? '')
      setTramos(
        rs.paradas.length > 0 ? routeStopsToFormInputs(rs.paradas) : [emptyTramo(), emptyTramo()],
      )
    } else {
      setTitulo('')
      setMerc('')
      setNotasG('')
      setRespEmb('')
      setReqEsp('')
      setTipoVeh('')
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
    }))
    const draft: RouteSheetCreatePayload = {
      titulo: t,
      mercanciasResumen: m,
      paradas: limpios,
      notasGenerales: notasG.trim(),
      responsabilidadEmbalaje: respEmb.trim(),
      requisitosEspeciales: reqEsp.trim(),
      tipoVehiculoRequerido: tipoVeh.trim(),
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

  const err = formErrors

  return (
    <>
      <div className="vt-modal-backdrop" role="dialog" aria-modal="true">
        <div className="vt-modal vt-modal-wide vt-agr-modal vt-ruta-form-modal">
          <div className="vt-modal-title">
            {initialRouteSheet ? 'Editar hoja de rutas' : 'Nueva hoja de rutas'}
          </div>
          <div className="vt-muted vt-agr-modal-sub">
            Todos los campos son obligatorios. Tiempos estimados y precio del tramo deben ser números (ej. horas o
            monto). Las coordenadas se cargan desde el botón del mapa.
          </div>
          <div className="vt-modal-body vt-agr-form-body">
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
            <Field
              label="Responsabilidad por daños por embalaje"
              value={respEmb}
              onChange={setRespEmb}
              multiline
              placeholder="Quién responde y en qué casos"
              error={err.responsabilidadEmbalaje}
              inputId="ruta-resp-emb"
            />
            <Field
              label="Requisitos especiales"
              value={reqEsp}
              onChange={setReqEsp}
              multiline
              placeholder="Frágil, refrigerado, ADR, etc."
              error={err.requisitosEspeciales}
              inputId="ruta-req"
            />
            <Field
              label="Tipo de vehículo requerido"
              value={tipoVeh}
              onChange={setTipoVeh}
              placeholder="Ej. camión baranda, refrigerado, sider"
              error={err.tipoVehiculoRequerido}
              inputId="ruta-veh"
            />

            <div className="vt-agr-details vt-ruta-tramos-block">
              <strong>Tramos del recorrido</strong>
              {err.paradasGlobal ? (
                <div className="vt-agr-field-error" role="alert" style={{ marginTop: 8 }}>
                  {err.paradasGlobal}
                </div>
              ) : null}
              {tramos.map((p, i) => {
                const te = err.tramos?.[i]
                return (
                  <div key={i} className="vt-ruta-tramo-card">
                    <span className="vt-agr-detail-sub">Tramo {i + 1}</span>
                    <div className="vt-ruta-tramo-grid">
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
                    <div className="vt-ruta-coords-actions">
                      <button
                        type="button"
                        className="vt-btn vt-btn-ghost vt-ruta-map-btn"
                        onClick={() => openMapPicker(i, 'origen')}
                      >
                        <MapPin size={14} /> Coordenadas origen (mapa)
                      </button>
                      <button
                        type="button"
                        className="vt-btn vt-btn-ghost vt-ruta-map-btn"
                        onClick={() => openMapPicker(i, 'destino')}
                      >
                        <MapPin size={14} /> Coordenadas destino (mapa)
                      </button>
                    </div>
                    {te?.coordOrigen ? (
                      <div className="vt-agr-field-error" role="alert">
                        {te.coordOrigen}
                      </div>
                    ) : null}
                    {(p.origenLat || p.origenLng) ? (
                      <div className="vt-muted vt-ruta-coords-hint">
                        Origen: {p.origenLat ?? '—'}, {p.origenLng ?? '—'}
                      </div>
                    ) : null}
                    {te?.coordDestino ? (
                      <div className="vt-agr-field-error" role="alert">
                        {te.coordDestino}
                      </div>
                    ) : null}
                    {(p.destinoLat || p.destinoLng) ? (
                      <div className="vt-muted vt-ruta-coords-hint">
                        Destino: {p.destinoLat ?? '—'}, {p.destinoLng ?? '—'}
                      </div>
                    ) : null}
                    <div className="vt-ruta-tramo-grid">
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
                    <div className="vt-ruta-tramo-grid">
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
              <button type="button" className="vt-btn" onClick={() => setTramos((x) => [...x, emptyTramo()])}>
                + Tramo
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
          className="vt-modal-backdrop vt-ruta-map-layer"
          role="dialog"
          aria-modal="true"
          aria-label="Coordenadas del mapa"
        >
          <div className="vt-modal vt-modal-narrow">
            <div className="vt-modal-title">
              {mapPick.punto === 'origen' ? 'Coordenadas de origen' : 'Coordenadas de destino'} (tramo{' '}
              {mapPick.tramoIndex + 1})
            </div>
            <div className="vt-muted vt-agr-modal-sub">
              En producción se abrirá un mapa interactivo. Ingresá latitud y longitud manualmente o desde Maps.
            </div>
            <div className="vt-modal-body vt-agr-form-body">
              <label className={clsx('vt-agr-field', mapCoordError && 'vt-agr-field--invalid')}>
                <span className="vt-agr-field-label">Latitud</span>
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
              <label className={clsx('vt-agr-field', mapCoordError && 'vt-agr-field--invalid')}>
                <span className="vt-agr-field-label">Longitud</span>
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
                <div className="vt-agr-field-error" role="alert">
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
