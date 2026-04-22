import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { cn } from '../../../../lib/cn'
import { nominatimReverse, nominatimSearch } from '../../../../utils/map/nominatimGeocode'
import { storeMapPinIcon } from '../../../../utils/map/storeMapPinIcon'
import 'leaflet/dist/leaflet.css'
import { ModalFormField as Field } from './ModalFormField'
import { emptyTramo, expandChainedTramoOrigins } from '../../lib/routeSheetTramoFormUtils'
import {
  agrDetailSub,
  detailsBlock,
  fieldError,
  fieldLabel,
  fieldRootWithInvalid,
  mapBackdropLayerAboveChatRail,
  modalFormBody,
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
import type { RouteOfferPublicState } from '../../../../app/store/marketStoreTypes'
import {
  phoneSelectOptions,
  type TransportistaPhoneOption,
} from '../../domain/routeSheetRegisteredPhones'

export type RouteSheetFormPayload = RouteSheetCreatePayload

type Props = {
  open: boolean
  onClose: () => void
  initialRouteSheet?: RouteSheet | null
  /** Oferta pública del hilo: completa teléfonos de tramo desde asignaciones aunque la parada aún no los tenga. */
  routeOfferForSheet?: RouteOfferPublicState | undefined
  /** Teléfonos de transportistas ya registrados en el hilo / oferta (selector por tramo). */
  transportistaPhoneOptions?: TransportistaPhoneOption[]
  onSubmit: (p: RouteSheetFormPayload) => boolean
}

type MapPick = { tramoIndex: number; punto: 'origen' | 'destino' }

const ROUTE_MAP_DEFAULT_CENTER: [number, number] = [22.526838, -81.128701]
const ROUTE_MAP_ZOOM = 9
const ROUTE_MAP_ZOOM_POINT = 13

function formatPickedCoord(n: number): string {
  return n.toFixed(6)
}

function tryParseLatLngStrings(latRaw: string, lngRaw: string): { lat: number; lng: number } | null {
  const lat = Number(latRaw.trim().replace(/\s/g, '').replace(',', '.'))
  const lng = Number(lngRaw.trim().replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function RouteMapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RouteMapViewSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center[0], center[1], zoom])
  return null
}

/** En el formulario, el origen del tramo i&gt;0 no se guarda en el estado: se deriva del destino del tramo i−1. */
function clearDerivedOriginsInForm(tramos: RouteTramoFormInput[]): RouteTramoFormInput[] {
  return tramos.map((t, i) =>
    i === 0 ? t : { ...t, origen: '', origenLat: '', origenLng: '' },
  )
}

function tramosToLimpios(tramos: RouteTramoFormInput[]): RouteTramoFormInput[] {
  return tramos.map((p) => ({
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
    telefonoTransportista: p.telefonoTransportista?.trim() || undefined,
  }))
}

export function RouteSheetFormModal({
  open,
  onClose,
  initialRouteSheet,
  routeOfferForSheet,
  transportistaPhoneOptions = [],
  onSubmit,
}: Props) {
  const [titulo, setTitulo] = useState('')
  const [merc, setMerc] = useState('')
  const [notasG, setNotasG] = useState('')
  const [tramos, setTramos] = useState<RouteTramoFormInput[]>([emptyTramo(), emptyTramo()])
  const [mapPick, setMapPick] = useState<MapPick | null>(null)
  const [mapLat, setMapLat] = useState('')
  const [mapLng, setMapLng] = useState('')
  const [mapPlaceLabel, setMapPlaceLabel] = useState('')
  const [mapCoordError, setMapCoordError] = useState<string | undefined>(undefined)
  const [formErrors, setFormErrors] = useState<RouteSheetFormErrors>({})
  const routeOfferRef = useRef(routeOfferForSheet)
  routeOfferRef.current = routeOfferForSheet
  const editBaselineJsonRef = useRef<string | null>(null)
  /** Invalida búsquedas Nominatim al cerrar el mapa o abrir otro punto. */
  const mapForwardTokenRef = useRef(0)

  useEffect(() => {
    if (!open) return
    setFormErrors({})
    setMapPick(null)
    setMapPlaceLabel('')
    setMapCoordError(undefined)
    mapForwardTokenRef.current += 1
    if (initialRouteSheet) {
      const rs = initialRouteSheet
      const ro = routeOfferRef.current
      const offerMap =
        ro?.routeSheetId === rs.id ? new Map(ro.tramos.map((t) => [t.stopId, t])) : undefined
      const tramosInitRaw =
        rs.paradas.length > 0
          ? routeStopsToFormInputs(rs.paradas, routeSheetLegacyHead(rs), offerMap)
          : [emptyTramo(), emptyTramo()]
      const tramosInit = clearDerivedOriginsInForm(tramosInitRaw)
      setTitulo(rs.titulo)
      setMerc(rs.mercanciasResumen)
      setNotasG(rs.notasGenerales ?? '')
      setTramos(tramosInit)
      const limpios0 = expandChainedTramoOrigins(tramosToLimpios(tramosInit))
      const draft0: RouteSheetCreatePayload = {
        titulo: rs.titulo.trim(),
        mercanciasResumen: rs.mercanciasResumen.trim(),
        paradas: limpios0,
        notasGenerales: (rs.notasGenerales ?? '').trim(),
      }
      const err0 = getRouteSheetFormErrors(draft0)
      if (hasRouteSheetFormErrors(err0)) {
        editBaselineJsonRef.current = null
      } else {
        const persisted0: RouteSheetCreatePayload = {
          ...draft0,
          paradas: normalizeRouteSheetParadas(limpios0),
        }
        editBaselineJsonRef.current = JSON.stringify(persisted0)
      }
    } else {
      editBaselineJsonRef.current = null
      setTitulo('')
      setMerc('')
      setNotasG('')
      setTramos([emptyTramo(), emptyTramo()])
    }
  }, [open, initialRouteSheet?.id])

  const routeMapCenter = useMemo((): [number, number] => {
    if (!mapPick) return ROUTE_MAP_DEFAULT_CENTER
    const p = tryParseLatLngStrings(mapLat, mapLng)
    if (p) return [p.lat, p.lng]
    return ROUTE_MAP_DEFAULT_CENTER
  }, [mapPick, mapLat, mapLng])

  const routeMapZoom = useMemo(() => {
    const p = tryParseLatLngStrings(mapLat, mapLng)
    return p ? ROUTE_MAP_ZOOM_POINT : ROUTE_MAP_ZOOM
  }, [mapLat, mapLng])

  useEffect(() => {
    if (!mapPick || !open) return
    const parsed = tryParseLatLngStrings(mapLat, mapLng)
    if (!parsed) return
    const ac = new AbortController()
    const tid = globalThis.setTimeout(() => {
      void (async () => {
        try {
          const label = await nominatimReverse(parsed.lat, parsed.lng, ac.signal)
          if (!ac.signal.aborted && label) setMapPlaceLabel(label)
        } catch {
          /* cancelado o red */
        }
      })()
    }, 450)
    return () => {
      globalThis.clearTimeout(tid)
      ac.abort()
    }
  }, [mapPick, mapLat, mapLng, open])

  if (!open) return null

  function openMapPicker(tramoIndex: number, punto: 'origen' | 'destino') {
    if (punto === 'origen' && tramoIndex > 0) return
    const t = tramos[tramoIndex]
    if (!t) return
    setMapCoordError(undefined)
    const token = ++mapForwardTokenRef.current

    let latStr = ''
    let lngStr = ''
    let labelStr = ''
    if (punto === 'origen') {
      latStr = t.origenLat ?? ''
      lngStr = t.origenLng ?? ''
      labelStr = t.origen ?? ''
    } else {
      latStr = t.destinoLat ?? ''
      lngStr = t.destinoLng ?? ''
      labelStr = t.destino ?? ''
    }
    setMapLat(latStr)
    setMapLng(lngStr)
    setMapPlaceLabel(labelStr.trim())
    setMapPick({ tramoIndex, punto })

    if (tryParseLatLngStrings(latStr, lngStr)) return
    const q = labelStr.trim()
    if (q.length < 3) return

    void (async () => {
      try {
        const r = await nominatimSearch(q)
        if (mapForwardTokenRef.current !== token || !r) return
        setMapLat(formatPickedCoord(r.lat))
        setMapLng(formatPickedCoord(r.lng))
        setMapPlaceLabel(r.label)
        setMapCoordError(undefined)
      } catch {
        /* ignore */
      }
    })()
  }

  async function geocodePlaceToMap() {
    const q = mapPlaceLabel.trim()
    if (q.length < 3) {
      toast.error('Escribí al menos 3 caracteres de dirección')
      return
    }
    const token = ++mapForwardTokenRef.current
    try {
      const r = await nominatimSearch(q)
      if (mapForwardTokenRef.current !== token) return
      if (!r) {
        toast.error('No se encontró esa dirección')
        return
      }
      setMapLat(formatPickedCoord(r.lat))
      setMapLng(formatPickedCoord(r.lng))
      setMapPlaceLabel(r.label)
      setMapCoordError(undefined)
    } catch {
      if (mapForwardTokenRef.current === token)
        toast.error('No se pudo buscar la dirección. Probá de nuevo.')
    }
  }

  function applyMapCoords() {
    if (!mapPick) return
    const coordErr = validateRouteCoordPair(mapLat, mapLng)
    if (coordErr) {
      setMapCoordError(coordErr)
      return
    }
    setMapCoordError(undefined)
    mapForwardTokenRef.current += 1
    const lat = mapLat.trim()
    const lng = mapLng.trim()
    const place = mapPlaceLabel.trim()
    setTramos((prev) => {
      const next = [...prev]
      const row = { ...next[mapPick.tramoIndex] }
      if (mapPick.punto === 'origen') {
        row.origenLat = lat || undefined
        row.origenLng = lng || undefined
        if (place) row.origen = place
      } else {
        row.destinoLat = lat || undefined
        row.destinoLng = lng || undefined
        if (place) row.destino = place
      }
      next[mapPick.tramoIndex] = row
      return next
    })
    toast.success('Ubicación guardada')
    setMapPick(null)
  }

  function trySubmit() {
    const t = titulo.trim()
    const m = merc.trim()
    const limpios = expandChainedTramoOrigins(tramosToLimpios(tramos))
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
    const payload: RouteSheetCreatePayload = {
      ...draft,
      paradas: paradasFinal,
    }
    if (initialRouteSheet && editBaselineJsonRef.current !== null) {
      if (JSON.stringify(payload) === editBaselineJsonRef.current) {
        toast.error('No hay cambios para guardar.')
        return
      }
    }
    const persisted = onSubmit(payload)
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

  function addTramoAfterLast() {
    setTramos((prev) => [...prev, emptyTramo()])
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
  const routeMapMarkerPos = mapPick ? tryParseLatLngStrings(mapLat, mapLng) : null

  return (
    <>
      <div className={mapBackdropLayerAboveChatRail} role="dialog" aria-modal="true">
        <div className={modalShellWide}>
          <div className="vt-modal-title">
            {initialRouteSheet ? 'Editar hoja de rutas' : 'Nueva hoja de rutas'}
          </div>
          <div className={modalSub}>
            Todos los campos son obligatorios. Tiempos estimados y precio del tramo deben ser números (ej. horas o
            monto). Origen, destino y el mapa se sincronizan (dirección ↔ pin). A partir del segundo tramo, el origen
            coincide con el destino del tramo anterior (solo editable ahí).
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
                const prevStop = i > 0 ? tramos[i - 1] : null
                const origenLocked = i > 0
                const origenNombre = origenLocked ? (prevStop?.destino ?? '') : p.origen
                const origenLatShown = origenLocked ? (prevStop?.destinoLat ?? '') : (p.origenLat ?? '')
                const origenLngShown = origenLocked ? (prevStop?.destinoLng ?? '') : (p.origenLng ?? '')
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
                        value={origenNombre}
                        onChange={(v) => {
                          if (origenLocked) return
                          updateTramo(i, { origen: v })
                        }}
                        readOnly={origenLocked}
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
                    {origenLocked ? (
                      <p className="vt-muted mb-2 text-[11px] leading-snug">
                        Mismo lugar y coordenadas que el <b>destino del tramo {i}</b>. Para cambiarlos, editá ese
                        destino o sus coordenadas en el mapa.
                      </p>
                    ) : null}
                    <div className={rutaCoordsRow}>
                      <button
                        type="button"
                        className={rutaMapBtn}
                        disabled={origenLocked}
                        title={
                          origenLocked
                            ? 'El origen toma las coordenadas del destino del tramo anterior'
                            : undefined
                        }
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
                        {origenLocked ? (
                          <span className="block pt-1 text-[11px] font-normal opacity-90">
                            Si falta el mapa del origen, cargá las coordenadas de <b>destino</b> del tramo {i}.
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {(origenLatShown || origenLngShown) ? (
                      <div className={rutaCoordsHint}>
                        Origen: {origenLatShown || '—'}, {origenLngShown || '—'}
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
                    <label className={fieldRootWithInvalid(!!te?.telefonoTransportista)}>
                      <span className={fieldLabel}>Teléfono del transportista (este tramo)</span>
                      <select
                        id={`ruta-tramo-${i}-tel`}
                        className="vt-input"
                        value={p.telefonoTransportista ?? ''}
                        onChange={(e) =>
                          updateTramo(i, {
                            telefonoTransportista: e.target.value.trim() || undefined,
                          })
                        }
                        aria-invalid={!!te?.telefonoTransportista}
                      >
                        <option value="">— Ninguno —</option>
                        {phoneSelectOptions(transportistaPhoneOptions, p.telefonoTransportista ?? '').map((opt) => (
                          <option key={`${i}-${opt.value}`} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="vt-muted mt-1 text-[11px] leading-snug">
                        Sólo podés elegir teléfonos de transportistas que ya estén en el chat (integrantes del hilo). Si
                        falta alguien, validá su suscripción para que entre al hilo antes de cargar el número acá.
                      </p>
                      {te?.telefonoTransportista ? (
                        <span className={fieldError} role="alert">
                          {te.telefonoTransportista}
                        </span>
                      ) : null}
                    </label>
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
              <button type="button" className="vt-btn" onClick={addTramoAfterLast}>
                + Agregar tramo
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
          className={mapBackdropLayerAboveChatRail}
          role="dialog"
          aria-modal="true"
          aria-label="Coordenadas del mapa"
        >
          <div className={cn(modalShellWide, 'max-w-[560px]')}>
            <div className="vt-modal-title">
              {mapPick.punto === 'origen' ? 'Origen del recorrido' : 'Destino del recorrido'} (tramo{' '}
              {mapPick.tramoIndex + 1})
            </div>
            <div className={modalSub}>
              Tocá el mapa o escribí la dirección y usá «Buscar en el mapa». El texto y las coordenadas se actualizan
              entre sí; podés editar la dirección antes de guardar.
            </div>
            <div
              className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] [&_.leaflet-container]:z-0"
              style={{ minHeight: 'min(52vh, 360px)' }}
            >
              <MapContainer
                key={`${mapPick.tramoIndex}-${mapPick.punto}`}
                center={routeMapCenter}
                zoom={routeMapZoom}
                className="h-[min(52vh,360px)] w-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RouteMapViewSync center={routeMapCenter} zoom={routeMapZoom} />
                <RouteMapClickHandler
                  onPick={(lat, lng) => {
                    setMapLat(formatPickedCoord(lat))
                    setMapLng(formatPickedCoord(lng))
                    setMapCoordError(undefined)
                  }}
                />
                {routeMapMarkerPos ? (
                  <Marker
                    position={[routeMapMarkerPos.lat, routeMapMarkerPos.lng]}
                    draggable
                    icon={storeMapPinIcon()}
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = e.target.getLatLng()
                        setMapLat(formatPickedCoord(ll.lat))
                        setMapLng(formatPickedCoord(ll.lng))
                        setMapCoordError(undefined)
                      },
                    }}
                  />
                ) : null}
              </MapContainer>
            </div>
            <div className={modalFormBody}>
              <label className={fieldRootWithInvalid(false)}>
                <span className={fieldLabel}>
                  {mapPick.punto === 'origen' ? 'Origen (dirección)' : 'Destino (dirección)'}
                </span>
                <textarea
                  className="vt-input min-h-[72px] resize-y"
                  value={mapPlaceLabel}
                  onChange={(e) => setMapPlaceLabel(e.target.value)}
                  rows={3}
                  placeholder="Ej. Calle 23, La Habana"
                  autoComplete="street-address"
                />
              </label>
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" className="vt-btn vt-btn-ghost text-[13px]" onClick={() => void geocodePlaceToMap()}>
                  Buscar en el mapa
                </button>
              </div>
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
                  mapForwardTokenRef.current += 1
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
