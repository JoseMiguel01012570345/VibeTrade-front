/** Errores por índice de tramo (0-based). */
export type RouteTramoFieldErrors = Partial<{
  origen: string;
  destino: string;
  coordOrigen: string;
  coordDestino: string;
  tiempoRecogidaEstimado: string;
  tiempoEntregaEstimado: string;
  precioTransportista: string;
  cargaEnTramo: string;
  tipoMercanciaCarga: string;
  tipoMercanciaDescarga: string;
  notas: string;
  responsabilidadEmbalaje: string;
  requisitosEspeciales: string;
  tipoVehiculoRequerido: string;
  telefonoTransportista: string;
  monedaPago: string;
}>;

export type RouteSheetFormErrors = {
  titulo?: string;
  mercanciasResumen?: string;
  notasGenerales?: string;
  /** Sin tramos en el payload (caso borde). */
  paradasGlobal?: string;
  tramos?: Record<number, RouteTramoFieldErrors>;
};
