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
  }
}

/** Copia los valores del tramo anterior para prellenar uno nuevo (mismo recorrido / datos repetidos). */
export function cloneTramoFromPrevious(prev: RouteTramoFormInput): RouteTramoFormInput {
  return {
    origen: prev.origen ?? '',
    destino: prev.destino ?? '',
    origenLat: prev.origenLat ?? '',
    origenLng: prev.origenLng ?? '',
    destinoLat: prev.destinoLat ?? '',
    destinoLng: prev.destinoLng ?? '',
    tiempoRecogidaEstimado: prev.tiempoRecogidaEstimado ?? '',
    tiempoEntregaEstimado: prev.tiempoEntregaEstimado ?? '',
    precioTransportista: prev.precioTransportista ?? '',
    cargaEnTramo: prev.cargaEnTramo ?? '',
    tipoMercanciaCarga: prev.tipoMercanciaCarga ?? '',
    tipoMercanciaDescarga: prev.tipoMercanciaDescarga ?? '',
    notas: prev.notas ?? '',
    responsabilidadEmbalaje: prev.responsabilidadEmbalaje ?? '',
    requisitosEspeciales: prev.requisitosEspeciales ?? '',
    tipoVehiculoRequerido: prev.tipoVehiculoRequerido ?? '',
  }
}
