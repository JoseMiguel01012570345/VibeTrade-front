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
  /** Por tramo: responsabilidad por daños por embalaje */
  responsabilidadEmbalaje?: string
  /** Por tramo: frágil, refrigerado, ADR, etc. */
  requisitosEspeciales?: string
  /** Por tramo: tipo de vehículo requerido */
  tipoVehiculoRequerido?: string
  /** Teléfono del transportista asignado al tramo (p. ej. tras suscripción y aceptación). */
  telefonoTransportista?: string
  /** Servicio de vitrina con el que se invita al transportista en este tramo. */
  transportInvitedStoreServiceId?: string
  /** Resumen corto para UI (tipo · categoría, etc.). */
  transportInvitedServiceSummary?: string
  /** Moneda del precio / tarifa de este tramo (ej. USD, CUP). */
  monedaPago?: string
  /** Km por red vial (OSRM) en este tramo O→D; lo rellena el API al guardar la hoja. */
  osrmRoadKm?: number
  /** Polilínea [lat,lng] por carretera (OSRM); la rellena el API al guardar la hoja. */
  osrmRouteLatLngs?: [number, number][]
  completada?: boolean
  /**
   * Legado: datos antiguos con una sola «parada» / lugar.
   * Si origen/destino vacíos, la UI puede mostrar esto.
   */
  lugar?: string
  ventanaHoraria?: string
}

/** Acuse post-edición persistido en servidor (misma forma que en el hilo). */
export type RouteSheetEditAck = {
  revision: number
  byCarrier: Record<string, 'pending' | 'accepted' | 'rejected'>
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
  /** Moneda en la que se abonan los tramos (ej. ARS, USD). */
  monedaPago?: string
  /** Publicada a transportistas vía plataforma (demo). */
  publicadaPlataforma?: boolean
  /** true tras guardar desde el formulario de edición; bloquea eliminar si sigue sin publicar. */
  editadaEnFormulario?: boolean
  /** Fuente de verdad en API para acuses de transportistas tras editar la hoja. */
  routeSheetEditAck?: RouteSheetEditAck
}

export type RouteSheetDraft = Omit<RouteSheet, 'id' | 'threadId' | 'creadoEn' | 'actualizadoEn'>

/** Datos de un tramo al crear/editar hoja (sin id/orden/completada). */
export type RouteTramoFormInput = {
  /** Id de la parada en edición; sin migración al crear tramos nuevos. */
  paradaId?: string
  origen: string
  destino: string
  /** Contacto del transportista elegido para este tramo. */
  telefonoTransportista?: string
  transportInvitedStoreServiceId?: string
  transportInvitedServiceSummary?: string
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
  responsabilidadEmbalaje?: string
  requisitosEspeciales?: string
  tipoVehiculoRequerido?: string
  /** Moneda de pago del precio de este tramo. */
  monedaPago?: string
}

export type RouteSheetCreatePayload = {
  titulo: string
  mercanciasResumen: string
  paradas: RouteTramoFormInput[]
  notasGenerales?: string
}

/** Tramo; mismo contrato que `RouteStopPayload` en el backend. */
export type RouteStopPayload = RouteStop

/**
 * Cuerpo PUT/GET `/api/v1/chat/threads/.../route-sheets`;
 * mismo contrato que `RouteSheetPayload` en el backend.
 */
export type RouteSheetPayload = RouteSheet

/** Resumen emergente para recomendaciones; mismo contrato que `EmergentRouteSheetSnapshot` en el backend. */
export type EmergentRouteLegSnapshot = {
  origen: string
  destino: string
  origenLat?: string
  origenLng?: string
  destinoLat?: string
  destinoLng?: string
  monedaPago?: string
}

export type EmergentRouteSheetSnapshot = {
  titulo: string
  mercanciasResumen: string
  monedaPago?: string
  paradas: EmergentRouteLegSnapshot[]
}

/** Datos viejos guardados a nivel hoja (antes de por-tramo). */
export type RouteSheetLegacyHead = {
  responsabilidadEmbalaje?: string
  requisitosEspeciales?: string
  tipoVehiculoRequerido?: string
}
