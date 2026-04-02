/** Hoja de rutas: seguimiento logístico de mercancías vinculable a contratos del chat. */

export type RouteSheetStatus =
  | 'borrador'
  | 'programada'
  | 'en_transito'
  | 'entregada'
  | 'cancelada'

/** Un tramo del recorrido (origen → destino) con datos logísticos. */
export type RouteStop = {
  id: string
  orden: number
  /** Origen del tramo (dirección o referencia) */
  origen: string
  /** Destino del tramo */
  destino: string
  /** Coordenadas origen (selección mapa en app completa; aquí texto) */
  origenLat?: string
  origenLng?: string
  /** Coordenadas destino */
  destinoLat?: string
  destinoLng?: string
  tiempoRecogidaEstimado?: string
  tiempoEntregaEstimado?: string
  /** Precio desglosado del transportista en este tramo */
  precioTransportista?: string
  /** Carga que transporta en el tramo */
  cargaEnTramo?: string
  tipoMercanciaCarga?: string
  tipoMercanciaDescarga?: string
  notas?: string
  completada?: boolean
  /**
   * Legado: datos antiguos con una sola «parada» / lugar.
   * Si origen/destino vacíos, la UI puede mostrar esto.
   */
  lugar?: string
  ventanaHoraria?: string
}

export type RouteSheet = {
  id: string
  threadId: string
  titulo: string
  creadoEn: number
  actualizadoEn: number
  estado: RouteSheetStatus
  /** Resumen de mercancías / bultos en esta ruta */
  mercanciasResumen: string
  paradas: RouteStop[]
  notasGenerales?: string
  /** Responsabilidad por daños por embalaje */
  responsabilidadEmbalaje?: string
  /** Requisitos especiales (frágil, refrigerado, etc.) */
  requisitosEspeciales?: string
  /** Tipo de vehículo requerido */
  tipoVehiculoRequerido?: string
  /** Publicada a transportistas vía plataforma (demo). */
  publicadaPlataforma?: boolean
  /** true tras guardar desde el formulario de edición; bloquea eliminar si sigue sin publicar. */
  editadaEnFormulario?: boolean
}

export type RouteSheetDraft = Omit<RouteSheet, 'id' | 'threadId' | 'creadoEn' | 'actualizadoEn'>

export function emptyRouteStop(orden: number): RouteStop {
  return {
    id: `stop_${orden}_${Math.random().toString(16).slice(2)}`,
    orden,
    origen: '',
    destino: '',
  }
}

export function defaultRouteSheetDraft(): Omit<
  RouteSheetDraft,
  'paradas'
> & { paradas: RouteStop[] } {
  return {
    titulo: '',
    estado: 'borrador',
    mercanciasResumen: '',
    notasGenerales: '',
    responsabilidadEmbalaje: '',
    requisitosEspeciales: '',
    tipoVehiculoRequerido: '',
    paradas: [emptyRouteStop(1), emptyRouteStop(2)],
  }
}

/** Datos de un tramo al crear/editar hoja (sin id/orden/completada). */
export type RouteTramoFormInput = {
  origen: string
  destino: string
  origenLat?: string
  origenLng?: string
  destinoLat?: string
  destinoLng?: string
  tiempoRecogidaEstimado?: string
  tiempoEntregaEstimado?: string
  precioTransportista?: string
  cargaEnTramo?: string
  tipoMercanciaCarga?: string
  tipoMercanciaDescarga?: string
  notas?: string
}

export type RouteSheetCreatePayload = {
  titulo: string
  mercanciasResumen: string
  paradas: RouteTramoFormInput[]
  notasGenerales?: string
  responsabilidadEmbalaje?: string
  requisitosEspeciales?: string
  tipoVehiculoRequerido?: string
}

/** Convierte paradas persistidas al formato del formulario de alta/edición. */
export function routeStopsToFormInputs(paradas: RouteStop[]): RouteTramoFormInput[] {
  return paradas.map((p) => ({
    origen: p.origen?.trim() || p.lugar?.trim() || '',
    destino: p.destino?.trim() || '',
    origenLat: p.origenLat ?? '',
    origenLng: p.origenLng ?? '',
    destinoLat: p.destinoLat ?? '',
    destinoLng: p.destinoLng ?? '',
    tiempoRecogidaEstimado: p.tiempoRecogidaEstimado ?? '',
    tiempoEntregaEstimado: p.tiempoEntregaEstimado ?? '',
    precioTransportista: p.precioTransportista ?? '',
    cargaEnTramo: p.cargaEnTramo ?? '',
    tipoMercanciaCarga: p.tipoMercanciaCarga ?? '',
    tipoMercanciaDescarga: p.tipoMercanciaDescarga ?? '',
    notas: p.notas ?? '',
  }))
}

export function routeStatusLabel(s: RouteSheetStatus): string {
  switch (s) {
    case 'borrador':
      return 'Borrador'
    case 'programada':
      return 'Programada'
    case 'en_transito':
      return 'En tránsito'
    case 'entregada':
      return 'Entregada'
    case 'cancelada':
      return 'Cancelada'
    default:
      return s
  }
}

/** Texto legible de un tramo (compat. datos viejos con solo `lugar`). */
export function tramoResumenLinea(p: RouteStop): string {
  const o = p.origen?.trim()
  const d = p.destino?.trim()
  if (o || d) return `${o || '…'} → ${d || '…'}`
  if (p.lugar?.trim()) return p.lugar.trim()
  return 'Tramo sin datos'
}
