import type { RouteTramoFormInput } from '../domain/routeSheetTypes'

export function emptyTramo(): RouteTramoFormInput {
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
    responsabilidadEmbalaje: '',
    requisitosEspeciales: '',
    tipoVehiculoRequerido: '',
    telefonoTransportista: '',
  }
}

/**
 * Tras limpiar cada fila con `tramosToLimpios`, asigna origen del tramo i al destino ya normalizado del tramo i−1.
 */
export function expandChainedTramoOrigins(tramos: RouteTramoFormInput[]): RouteTramoFormInput[] {
  return tramos.map((t, i) => {
    if (i === 0) return t
    const prev = tramos[i - 1]
    return {
      ...t,
      origen: prev.destino.trim(),
      origenLat: (prev.destinoLat ?? '').trim(),
      origenLng: (prev.destinoLng ?? '').trim(),
    }
  })
}
