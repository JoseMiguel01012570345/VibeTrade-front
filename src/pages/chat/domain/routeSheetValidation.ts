import type { RouteSheetCreatePayload, RouteTramoFormInput } from './routeSheetTypes'

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
  if (t === '') return 'Completá este campo'
  if (t.length < minLen) return `Mínimo ${minLen} caracteres`
  if (t.length > maxLen) return `Máximo ${maxLen} caracteres`
  return undefined
}

/** Tiempos / precio: obligatorio y número finito ≥ 0. */
function requiredNonNegativeNumber(raw: string | undefined): string | undefined {
  const t = norm(raw)
  if (t === '') return 'Completá este campo'
  const n = Number(t.replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return 'Indicá un número válido'
  if (n < 0) return 'El valor no puede ser negativo'
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
  const needBoth = `Indicá latitud y longitud de ${lugar}`
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
  if (latS === '' || lngS === '') return 'Indicá latitud y longitud, o dejá ambas vacías'
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
      titulo.length === 0 ? 'Completá este campo' : `Mínimo ${TITLE_MIN} caracteres`
  } else if (titulo.length > TITLE_MAX) {
    e.titulo = `Máximo ${TITLE_MAX} caracteres`
  }

  const merc = norm(p.mercanciasResumen)
  if (merc.length < MERC_MIN) {
    e.mercanciasResumen =
      merc.length === 0 ? 'Completá este campo' : `Describí con al menos ${MERC_MIN} caracteres`
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
    e.paradasGlobal = 'Agregá al menos un tramo al recorrido'
  }

  paradas.forEach((raw, i) => {
    const o = norm(raw.origen)
    if (o === '') {
      mergeTramo(e, i, { origen: 'Completá este campo' })
    } else if (o.length < PLACE_MIN) {
      mergeTramo(e, i, { origen: `Mínimo ${PLACE_MIN} caracteres` })
    } else if (o.length > PLACE_MAX) {
      mergeTramo(e, i, { origen: `Máximo ${PLACE_MAX} caracteres` })
    }

    const d = norm(raw.destino)
    if (d === '') {
      mergeTramo(e, i, { destino: 'Completá este campo' })
    } else if (d.length < PLACE_MIN) {
      mergeTramo(e, i, { destino: `Mínimo ${PLACE_MIN} caracteres` })
    } else if (d.length > PLACE_MAX) {
      mergeTramo(e, i, { destino: `Máximo ${PLACE_MAX} caracteres` })
    }

    const oo = requiredCoordPair(raw.origenLat, raw.origenLng, 'origen')
    if (oo) mergeTramo(e, i, { coordOrigen: oo })
    const od = requiredCoordPair(raw.destinoLat, raw.destinoLng, 'destino')
    if (od) mergeTramo(e, i, { coordDestino: od })

    const t1 = requiredNonNegativeNumber(raw.tiempoRecogidaEstimado)
    if (t1) {
      mergeTramo(e, i, { tiempoRecogidaEstimado: t1 })
    } else if (norm(raw.tiempoRecogidaEstimado).length > 200) {
      mergeTramo(e, i, { tiempoRecogidaEstimado: 'Máximo 200 caracteres' })
    }

    const t2 = requiredNonNegativeNumber(raw.tiempoEntregaEstimado)
    if (t2) {
      mergeTramo(e, i, { tiempoEntregaEstimado: t2 })
    } else if (norm(raw.tiempoEntregaEstimado).length > 200) {
      mergeTramo(e, i, { tiempoEntregaEstimado: 'Máximo 200 caracteres' })
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
      mergeTramo(e, i, { notas: 'Completá este campo' })
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
  })

  return e
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
