import type { RouteSheetCreatePayload, RouteTramoFormInput } from './routeSheetTypes'
import { estimadoInstantMs, ROUTE_ESTIMADO_ISO_LOCAL_RE, todayIsoDateLocal } from './routeSheetDateTime'

const TITLE_MIN = 3
const TITLE_MAX = 200
const MERC_MIN = 5
const MERC_MAX = 8000
const PLACE_MIN = 2
const PLACE_MAX = 500
const FIELD_MAX = 8000
const NOTA_TRAMO_MAX = 4000
const NOTAS_G_MIN = 3
const BLOQUE_MIN = 3
const CARGA_MIN = 5
const TIPO_MERC_MIN = 2
const NOTA_TRAMO_MIN = 3
const MONEDA_MAX = 32

function norm(s: string | undefined): string {
  return (s ?? '').trim()
}

function parseLat(raw: string | undefined): number | null {
  const t = norm(raw).replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < -90 || n > 90) return null
  return n
}

function parseLng(raw: string | undefined): number | null {
  const t = norm(raw).replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < -180 || n > 180) return null
  return n
}

function optionalMax(s: string, max: number): string | undefined {
  if (s.length > max) return `Máximo ${max} caracteres`
  return undefined
}

function requiredText(raw: string | undefined, minLen: number, maxLen: number): string | undefined {
  const t = norm(raw)
  if (t === '') return 'Completa este campo'
  if (t.length < minLen) return `Mínimo ${minLen} caracteres`
  if (t.length > maxLen) return `Máximo ${maxLen} caracteres`
  return undefined
}

/** Tiempos / precio: obligatorio y número finito ≥ 0. */
function requiredNonNegativeNumber(raw: string | undefined): string | undefined {
  const t = norm(raw)
  if (t === '') return 'Completa este campo'
  const n = Number(t.replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return 'Indica un número válido'
  if (n < 0) return 'El valor no puede ser negativo'
  return undefined
}

/** Recogida / entrega: fecha + hora locales (`YYYY-MM-DDTHH:mm`). */
function requiredEstimadoDateTime(
  raw: string | undefined,
  kind: 'recogida' | 'entrega',
): string | undefined {
  const t = norm(raw)
  const short =
    kind === 'recogida' ? 'fecha y hora de recogida' : 'fecha y hora de entrega'
  if (t === '') return `Indica ${short}`
  const m = t.match(ROUTE_ESTIMADO_ISO_LOCAL_RE)
  if (!m) return `Completa ${short}`
  const isoLocal = `${m[1]}T${m[2]}:00`
  const dt = new Date(isoLocal)
  if (Number.isNaN(dt.getTime())) return 'Fecha u hora inválida'
  if (kind === 'recogida' && m[1] < todayIsoDateLocal()) {
    return 'La fecha de recogida no puede ser anterior a hoy'
  }
  return undefined
}

/** Par lat/lng obligatorio y dentro de rango. */
function requiredCoordPair(
  latRaw: string | undefined,
  lngRaw: string | undefined,
  lugar: 'origen' | 'destino',
): string | undefined {
  const latS = norm(latRaw)
  const lngS = norm(lngRaw)
  const needBoth = `Indica latitud y longitud de ${lugar}`
  if (latS === '' && lngS === '') return needBoth
  if (latS === '' || lngS === '') return needBoth
  if (parseLat(latRaw) === null) return 'Latitud inválida (entre -90 y 90)'
  if (parseLng(lngRaw) === null) return 'Longitud inválida (entre -180 y 180)'
  return undefined
}

/** Validación de lat/lng para el modal de mapa (mismas reglas que el tramo). */
export function validateRouteCoordPair(
  latRaw: string | undefined,
  lngRaw: string | undefined,
): string | undefined {
  return validateCoordPairInner(latRaw, lngRaw)
}

function validateCoordPairInner(latRaw: string | undefined, lngRaw: string | undefined): string | undefined {
  const latS = norm(latRaw)
  const lngS = norm(lngRaw)
  if (latS === '' && lngS === '') return undefined
  if (latS === '' || lngS === '') return 'Indica latitud y longitud, o deja ambas vacías'
  if (parseLat(latRaw) === null) return 'Latitud inválida (entre -90 y 90)'
  if (parseLng(lngRaw) === null) return 'Longitud inválida (entre -180 y 180)'
  return undefined
}

/** Errores por índice de tramo (0-based). */
export type RouteTramoFieldErrors = Partial<{
  origen: string
  destino: string
  coordOrigen: string
  coordDestino: string
  tiempoRecogidaEstimado: string
  tiempoEntregaEstimado: string
  precioTransportista: string
  cargaEnTramo: string
  tipoMercanciaCarga: string
  tipoMercanciaDescarga: string
  notas: string
  responsabilidadEmbalaje: string
  requisitosEspeciales: string
  tipoVehiculoRequerido: string
  telefonoTransportista: string
  monedaPago: string
}>

export type RouteSheetFormErrors = {
  titulo?: string
  mercanciasResumen?: string
  notasGenerales?: string
  /** Sin tramos en el payload (caso borde). */
  paradasGlobal?: string
  tramos?: Record<number, RouteTramoFieldErrors>
}

function mergeTramo(
  e: RouteSheetFormErrors,
  index: number,
  patch: RouteTramoFieldErrors,
): void {
  if (!e.tramos) e.tramos = {}
  e.tramos[index] = { ...e.tramos[index], ...patch }
}

/**
 * Validación estructurada (misma regla que antes, para carteles bajo cada campo).
 */
export function getRouteSheetFormErrors(p: RouteSheetCreatePayload): RouteSheetFormErrors {
  const e: RouteSheetFormErrors = {}

  const titulo = norm(p.titulo)
  if (titulo.length < TITLE_MIN) {
    e.titulo =
      titulo.length === 0 ? 'Completa este campo' : `Mínimo ${TITLE_MIN} caracteres`
  } else if (titulo.length > TITLE_MAX) {
    e.titulo = `Máximo ${TITLE_MAX} caracteres`
  }

  const merc = norm(p.mercanciasResumen)
  if (merc.length < MERC_MIN) {
    e.mercanciasResumen =
      merc.length === 0 ? 'Completa este campo' : `Describe con al menos ${MERC_MIN} caracteres`
  } else {
    const mx = optionalMax(merc, MERC_MAX)
    if (mx) e.mercanciasResumen = mx
  }

  {
    const x = requiredText(p.notasGenerales, NOTAS_G_MIN, FIELD_MAX)
    if (x) e.notasGenerales = x
  }

  const paradas = p.paradas ?? []

  if (paradas.length === 0) {
    e.paradasGlobal = 'Añade al menos un tramo al recorrido'
  }

  paradas.forEach((raw, i) => {
    const o = norm(raw.origen)
    if (o === '') {
      mergeTramo(e, i, { origen: 'Completa este campo' })
    } else if (o.length < PLACE_MIN) {
      mergeTramo(e, i, { origen: `Mínimo ${PLACE_MIN} caracteres` })
    } else if (o.length > PLACE_MAX) {
      mergeTramo(e, i, { origen: `Máximo ${PLACE_MAX} caracteres` })
    }

    const d = norm(raw.destino)
    if (d === '') {
      mergeTramo(e, i, { destino: 'Completa este campo' })
    } else if (d.length < PLACE_MIN) {
      mergeTramo(e, i, { destino: `Mínimo ${PLACE_MIN} caracteres` })
    } else if (d.length > PLACE_MAX) {
      mergeTramo(e, i, { destino: `Máximo ${PLACE_MAX} caracteres` })
    }

    const oo = requiredCoordPair(raw.origenLat, raw.origenLng, 'origen')
    if (oo) mergeTramo(e, i, { coordOrigen: oo })
    const od = requiredCoordPair(raw.destinoLat, raw.destinoLng, 'destino')
    if (od) mergeTramo(e, i, { coordDestino: od })

    const t1 = requiredEstimadoDateTime(raw.tiempoRecogidaEstimado, 'recogida')
    if (t1) {
      mergeTramo(e, i, { tiempoRecogidaEstimado: t1 })
    } else if (norm(raw.tiempoRecogidaEstimado).length > 200) {
      mergeTramo(e, i, { tiempoRecogidaEstimado: 'Máximo 200 caracteres' })
    }

    const t2 = requiredEstimadoDateTime(raw.tiempoEntregaEstimado, 'entrega')
    if (t2) {
      mergeTramo(e, i, { tiempoEntregaEstimado: t2 })
    } else if (norm(raw.tiempoEntregaEstimado).length > 200) {
      mergeTramo(e, i, { tiempoEntregaEstimado: 'Máximo 200 caracteres' })
    }

    if (!t1 && !t2) {
      const msRec = estimadoInstantMs(raw.tiempoRecogidaEstimado)
      const msEnt = estimadoInstantMs(raw.tiempoEntregaEstimado)
      if (
        msRec !== null &&
        msEnt !== null &&
        msRec >= msEnt
      ) {
        mergeTramo(e, i, {
          tiempoRecogidaEstimado:
            'La recogida debe ser anterior a la entrega (no puede coincidir ni ser posterior)',
          tiempoEntregaEstimado:
            'La entrega debe ser posterior a la recogida (no puede coincidir ni ser anterior)',
        })
      }
    }

    const pr = requiredNonNegativeNumber(raw.precioTransportista)
    if (pr) {
      mergeTramo(e, i, { precioTransportista: pr })
    } else if (norm(raw.precioTransportista).length > 500) {
      mergeTramo(e, i, { precioTransportista: 'Máximo 500 caracteres' })
    }

    const cgErr = requiredText(raw.cargaEnTramo, CARGA_MIN, FIELD_MAX)
    if (cgErr) mergeTramo(e, i, { cargaEnTramo: cgErr })

    const tcErr = requiredText(raw.tipoMercanciaCarga, TIPO_MERC_MIN, 300)
    if (tcErr) mergeTramo(e, i, { tipoMercanciaCarga: tcErr })

    const tdErr = requiredText(raw.tipoMercanciaDescarga, TIPO_MERC_MIN, 300)
    if (tdErr) mergeTramo(e, i, { tipoMercanciaDescarga: tdErr })

    const nt = norm(raw.notas)
    if (nt === '') {
      mergeTramo(e, i, { notas: 'Completa este campo' })
    } else if (nt.length < NOTA_TRAMO_MIN) {
      mergeTramo(e, i, { notas: `Mínimo ${NOTA_TRAMO_MIN} caracteres` })
    } else if (nt.length > NOTA_TRAMO_MAX) {
      mergeTramo(e, i, { notas: `Máximo ${NOTA_TRAMO_MAX} caracteres` })
    }

    {
      const x = requiredText(raw.responsabilidadEmbalaje, BLOQUE_MIN, FIELD_MAX)
      if (x) mergeTramo(e, i, { responsabilidadEmbalaje: x })
    }
    {
      const x = requiredText(raw.requisitosEspeciales, BLOQUE_MIN, FIELD_MAX)
      if (x) mergeTramo(e, i, { requisitosEspeciales: x })
    }
    {
      const x = requiredText(raw.tipoVehiculoRequerido, PLACE_MIN, PLACE_MAX)
      if (x) mergeTramo(e, i, { tipoVehiculoRequerido: x })
    }

    const tel = norm(raw.telefonoTransportista)
    if (tel.length > 48) {
      mergeTramo(e, i, { telefonoTransportista: 'Máximo 48 caracteres' })
    }

    {
      const m = norm(raw.monedaPago)
      if (m !== '') {
        const mx = optionalMax(m, MONEDA_MAX)
        if (mx) mergeTramo(e, i, { monedaPago: mx })
      }
    }
  })

  /**
   * Construye sub-rutas (cadenas) y valida tiempos solo dentro de cada cadena.
   * Una cadena agrupa nodos `(tramoIndex, origen, destino)` consecutivos donde
   * `origen` del nodo siguiente coincide con `destino` del anterior (mismas coords lat/lng).
   * Si el origen es independiente (otra pierna logística), arranca una cadena nueva.
   */
  const tramoChains = buildTramoChainsByCoords(paradas)
  const MSG_ENTREGA_VS_SIGUIENTE =
    'La entrega estimada no puede ser posterior a la recogida estimada del tramo siguiente'
  const MSG_RECOGIDA_VS_ANTERIOR =
    'La recogida estimada no puede ser anterior a la entrega estimada del tramo anterior'
  for (const chain of tramoChains) {
    for (let k = 0; k < chain.length - 1; k++) {
      const a = chain[k]
      const b = chain[k + 1]
      if (a === undefined || b === undefined) continue
      const msEnt = estimadoInstantMs(paradas[a]?.tiempoEntregaEstimado)
      const msRecNext = estimadoInstantMs(paradas[b]?.tiempoRecogidaEstimado)
      if (msEnt === null || msRecNext === null) continue
      if (msEnt > msRecNext) {
        if (!e.tramos?.[a]?.tiempoEntregaEstimado) {
          mergeTramo(e, a, { tiempoEntregaEstimado: MSG_ENTREGA_VS_SIGUIENTE })
        }
        if (!e.tramos?.[b]?.tiempoRecogidaEstimado) {
          mergeTramo(e, b, { tiempoRecogidaEstimado: MSG_RECOGIDA_VS_ANTERIOR })
        }
      }
    }
  }

  return e
}

/**
 * Sub-rutas: lista de listas con índices de tramos (0-based). Dos tramos consecutivos quedan en la misma cadena
 * si el origen del segundo coincide con el destino del primero (lat/lng tras `trim`); si difieren, abre cadena nueva.
 */
function buildTramoChainsByCoords(paradas: RouteTramoFormInput[]): number[][] {
  const chains: number[][] = []
  if (paradas.length === 0) return chains
  let current: number[] = [0]
  for (let i = 1; i < paradas.length; i++) {
    const anterior = paradas[i - 1]
    const siguiente = paradas[i]
    if (anterior && siguiente && origenCoincideConDestinoAnterior(anterior, siguiente)) {
      current.push(i)
    } else {
      chains.push(current)
      current = [i]
    }
  }
  chains.push(current)
  return chains
}

function origenCoincideConDestinoAnterior(
  anterior: RouteTramoFormInput,
  siguiente: RouteTramoFormInput,
): boolean {
  const dLat = norm(anterior.destinoLat)
  const dLng = norm(anterior.destinoLng)
  const oLat = norm(siguiente.origenLat)
  const oLng = norm(siguiente.origenLng)
  if (!dLat || !dLng || !oLat || !oLng) return false
  return dLat === oLat && dLng === oLng
}

export function hasRouteSheetFormErrors(e: RouteSheetFormErrors): boolean {
  if (e.titulo || e.mercanciasResumen || e.notasGenerales || e.paradasGlobal) {
    return true
  }
  if (!e.tramos) return false
  return Object.values(e.tramos).some((t) => t && Object.values(t).some(Boolean))
}

export function routeSheetFormErrorCount(e: RouteSheetFormErrors): number {
  let n = 0
  const bump = (s?: string) => {
    if (s) n += 1
  }
  bump(e.titulo)
  bump(e.mercanciasResumen)
  bump(e.notasGenerales)
  bump(e.paradasGlobal)
  if (e.tramos) {
    for (const t of Object.values(e.tramos)) {
      if (!t) continue
      for (const v of Object.values(t)) {
        if (v) n += 1
      }
    }
  }
  return n
}

/** Tramos listos para persistir (solo filas con origen/destino que cumplen mínimo). */
export function normalizeRouteSheetParadas(paradas: RouteTramoFormInput[]): RouteTramoFormInput[] {
  return paradas
    .map((p) => ({
      paradaId: norm(p.paradaId) || undefined,
      origen: norm(p.origen),
      destino: norm(p.destino),
      origenLat: norm(p.origenLat) || undefined,
      origenLng: norm(p.origenLng) || undefined,
      destinoLat: norm(p.destinoLat) || undefined,
      destinoLng: norm(p.destinoLng) || undefined,
      tiempoRecogidaEstimado: norm(p.tiempoRecogidaEstimado) || undefined,
      tiempoEntregaEstimado: norm(p.tiempoEntregaEstimado) || undefined,
      precioTransportista: norm(p.precioTransportista) || undefined,
      cargaEnTramo: norm(p.cargaEnTramo) || undefined,
      tipoMercanciaCarga: norm(p.tipoMercanciaCarga) || undefined,
      tipoMercanciaDescarga: norm(p.tipoMercanciaDescarga) || undefined,
      notas: norm(p.notas) || undefined,
      responsabilidadEmbalaje: norm(p.responsabilidadEmbalaje) || undefined,
      requisitosEspeciales: norm(p.requisitosEspeciales) || undefined,
      tipoVehiculoRequerido: norm(p.tipoVehiculoRequerido) || undefined,
      telefonoTransportista: norm(p.telefonoTransportista) || undefined,
      transportInvitedStoreServiceId: norm(p.transportInvitedStoreServiceId) || undefined,
      transportInvitedServiceSummary: norm(p.transportInvitedServiceSummary) || undefined,
      monedaPago: norm(p.monedaPago) || undefined,
    }))
    .filter((p) => p.origen.length >= PLACE_MIN && p.destino.length >= PLACE_MIN)
}

/** Compatibilidad: el store puede comprobar con lista vacía = ok */
export function validateRouteSheetPayload(p: RouteSheetCreatePayload): string[] {
  const e = getRouteSheetFormErrors(p)
  if (!hasRouteSheetFormErrors(e)) return []
  const out: string[] = []
  if (e.titulo) out.push(`Título: ${e.titulo}`)
  if (e.mercanciasResumen) out.push(`Mercancías: ${e.mercanciasResumen}`)
  if (e.notasGenerales) out.push(`Notas generales: ${e.notasGenerales}`)
  if (e.paradasGlobal) out.push(e.paradasGlobal)
  if (e.tramos) {
    Object.entries(e.tramos).forEach(([idx, t]) => {
      if (!t) return
      const prefix = `Tramo ${Number(idx) + 1}`
      Object.entries(t).forEach(([k, msg]) => {
        if (msg) out.push(`${prefix} (${k}): ${msg}`)
      })
    })
  }
  return out
}

export function hasRouteSheetValidationErrors(errs: string[]): boolean {
  return errs.length > 0
}
